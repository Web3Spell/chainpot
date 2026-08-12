// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {MemberRegistryV4} from "./MemberRegistryV4.sol";
import {VaultV4} from "./VaultV4.sol";
import {LotteryEngineV4, IRandomnessReceiver} from "./LotteryEngineV4.sol";

/// @title RoscaEngineBaseV4
/// @notice Shared invite-only ROSCA lifecycle for both ChainPot V4 engines. Holds the structural
///         invariants; concrete engines (Circle / Auction) implement winner selection.
/// @dev Remediations implemented here: C-01 (Merkle gate, frozen roster, payment-gated eligibility,
///      default flag + slash/blacklist), C-02 (VRF economic gate), H-01/H-02 (hasWonInPot + eligible
///      filtering), H-03 (winner credit capped at collected), H-04 (pull finalize via Vault), M-05
///      (fixed roster), M-06 (payment deadline), L-01/L-02 (caps, cooldown, leave penalty),
///      §4.2 (graceful early-completion).
///
///      V4.1 security-review remediations (see SECURITY_FIXES_V4_1.md):
///      - F-01: STORE-THEN-FINALIZE VRF. The VRF callback only stores the random word (cheap,
///        can never OOG); settlement (harvest + distribution) runs in a separate, permissionless
///        `finalizeDraw` transaction with a full block gas budget.
///      - F-02: stuck-shuffle recovery via `cancelStuckShuffle` (retry, then reopen the pot so
///        members can leave). Invite gate is unaffected: the root stays frozen once the pot has
///        started once, so only the originally invited roster can ever (re)join.
///      - F-04: pause-aware deadlines. Time spent paused extends payment/bidding deadlines, so an
///        emergency pause can never cause members to default.
///      - F-05: MIN_PAYMENT_WINDOW floor (with the registry's repeat-default blacklist policy).
///      - F-06: no value can strand in the Vault — empty-recipient residuals fall back to the
///        winner, else to the treasury.
///      - F-07: `releaseSlot` frees `joinedPotsCount` capacity once a pot completes (the cap is
///        concurrent, not lifetime).
///      - F-08: `cycleDuration` is enforced as a real cadence in `startCycle`.
///      - F-09: after VRF retries are exhausted, an eligible winner is still selected via a
///        deterministic fallback instead of killing a healthy pot.
///      - F-12: `rootVersion` lets joiners/frontends detect roster re-issues.
///      - UX: `payForCycleWithPermit` (EIP-2612) folds approve+pay into one transaction.
abstract contract RoscaEngineBaseV4 is IRandomnessReceiver, Ownable, ReentrancyGuard, Pausable {
    // ---- Shared constants ----
    uint256 public constant MIN_AMOUNT_PER_CYCLE = 1e6; // 1 USDC (C-02)
    uint256 public constant MAX_MEMBERS = 100; // == LotteryEngineV4.MAX_PARTICIPANTS ([I])
    uint256 public constant MAX_JOINED_POTS = 50; // (L-01) concurrent cap; freed via releaseSlot (F-07)
    uint256 public constant JOIN_LEAVE_COOLDOWN = 1 days; // (L-02)
    uint256 public constant VRF_TIMEOUT = 1 days; // stuck-VRF recovery window (NEW-3: reduced from 3 days)
    uint256 public constant MAX_VRF_RETRIES = 2; // (NEW-3: retry before fallback)
    uint256 public constant MIN_PAYMENT_WINDOW = 1 days; // (F-05) hostile 1-second windows are invalid

    // ---- Vault credit-kind codes (must mirror VaultV4.CreditKind) ----
    uint8 internal constant CREDIT_WIN = 0;
    uint8 internal constant CREDIT_DIVIDEND = 1;
    uint8 internal constant CREDIT_REFUND = 2;
    uint8 internal constant CREDIT_RESIDUAL = 3;

    // ---- External wiring ----
    MemberRegistryV4 public immutable registry;
    VaultV4 public immutable vault;
    LotteryEngineV4 public immutable lottery;

    enum PotStatus {
        Open,
        Active,
        Completed
    }

    enum CycleStatus {
        None,
        Active,
        AwaitingVRF,
        Completed
    }

    struct Pot {
        address creator;
        bytes32 merkleRoot;
        bool rootFrozen;
        uint256 expectedMembers; // == cycleCount (M-05)
        uint256 amountPerCycle;
        uint256 cycleDuration;
        uint256 paymentWindow; // payment deadline offset from cycle start (M-06)
        uint256 biddingWindow; // bidding deadline offset (auction only; 0 for circle)
        PotStatus status;
        uint256 currentCycle; // 1-based index of the latest started cycle
        uint256 completedCycles;
        uint256 winnersCount;
        address[] members;
    }

    struct Cycle {
        uint256 startTime;
        uint256 paymentDeadline;
        uint256 biddingDeadline;
        uint256 totalCollected;
        uint256 paidCount;
        CycleStatus status;
        address winner;
        bool settled;
        uint256 vrfRequestId;
        uint256 vrfRequestedAt;
        uint256 vrfRetryCount; // (NEW-3) number of VRF timeout retries used
        uint256 pauseDebtSnapshot; // (F-04) cumulative pause duration at cycle start
    }

    struct PendingDraw {
        uint256 potId;
        uint256 cycleId;
        bool isShuffle;
        bool exists;
        bool ready; // (F-01) random word delivered, awaiting finalizeDraw
        uint256 word; // (F-01) the delivered random word
    }

    uint256 public potCounter;
    mapping(uint256 => Pot) internal _pots;
    mapping(uint256 => mapping(uint256 => Cycle)) internal _cycles; // potId => cycleIndex => Cycle

    mapping(uint256 => mapping(address => bool)) public isMember;
    mapping(uint256 => mapping(address => bool)) public hasWonInPot; // (H-01/H-02)
    mapping(uint256 => mapping(address => bool)) public defaulted; // (C-01 §4.2)
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public paidForCycle; // pot=>cycle=>member
    mapping(address => uint256) public joinedPotsCount; // (L-01)
    mapping(uint256 => mapping(address => uint256)) public lastJoinLeave; // (L-02)
    mapping(uint256 => mapping(address => bool)) public slotReleased; // (F-07)
    mapping(uint256 => PendingDraw) internal _pendingDraws; // vrf requestId => draw
    mapping(uint256 => uint64) public rootVersion; // (F-12) increments on every root update

    // ---- Shuffle bookkeeping (F-02; used by shuffle-mode engines) ----
    mapping(uint256 => uint256) public shuffleRequestId; // potId => pending VRF request (0 = none)
    mapping(uint256 => uint256) public shuffleRequestedAt;
    mapping(uint256 => uint256) public shuffleRetryCount;

    // ---- Pause-aware time (F-04) ----
    uint256 public cumulativePauseDuration;
    uint256 private _pausedAtTs;

    // ---- Errors ----
    error InvalidParams();
    error NotCreator();
    error NotRegisteredOrAllowed();
    error AlreadyMember();
    error NotMember();
    error InvalidProof();
    error RosterFull();
    error TooManyJoinedPots();
    error CooldownActive();
    error PotNotOpen();
    error PotNotActive();
    error PotNotCompleted();
    error RosterIncomplete();
    error CycleNotActive();
    error CycleTooEarly();
    error AlreadyPaid();
    error PaymentWindowClosed();
    error PaymentWindowOpen();
    error NotSettled();
    error BiddingOpen();
    error PreviousCycleOpen();
    error CycleCapReached();
    error AlreadyWonThisPot();
    error OnlyLottery();
    error UnknownRequest();
    error NotAwaitingVRF();
    error TimeoutNotReached();
    error CannotStartCycle();
    error RandomnessNotReady();
    error RandomnessPendingConsumption();
    error AlreadyReleased();

    // ---- Events ----
    event PotCreated(uint256 indexed potId, address indexed creator, uint256 expectedMembers, uint256 amountPerCycle);
    event MerkleRootUpdated(uint256 indexed potId, bytes32 newRoot, uint64 version);
    event Joined(uint256 indexed potId, address indexed member);
    event Left(uint256 indexed potId, address indexed member);
    event PotStarted(uint256 indexed potId);
    event PotReopened(uint256 indexed potId); // (F-02) shuffle unrecoverable -> members may leave
    event CycleStarted(uint256 indexed potId, uint256 indexed cycleId, uint256 startTime);
    event Paid(uint256 indexed potId, uint256 indexed cycleId, address indexed member, uint256 amount);
    event CycleSettled(uint256 indexed potId, uint256 indexed cycleId, uint256 totalCollected, uint256 paidCount);
    event MemberDefaultedInPot(uint256 indexed potId, uint256 indexed cycleId, address indexed member);
    event VRFRequested(uint256 indexed potId, uint256 indexed cycleId, uint256 requestId);
    event RandomnessReady(uint256 indexed potId, uint256 indexed cycleId, uint256 requestId); // (F-01)
    event WinnerSelected(uint256 indexed potId, uint256 indexed cycleId, address indexed winner, uint256 amount);
    event CycleCompleted(uint256 indexed potId, uint256 indexed cycleId, address winner, uint256 assets);
    event PotCompleted(uint256 indexed potId);
    event SlotReleased(uint256 indexed potId, address indexed member); // (F-07)
    event FallbackWinnerSelected(uint256 indexed potId, uint256 indexed cycleId, address indexed winner); // (F-09)

    constructor(address _registry, address _vault, address _lottery) Ownable(msg.sender) {
        if (_registry == address(0) || _vault == address(0) || _lottery == address(0)) revert InvalidParams();
        registry = MemberRegistryV4(_registry);
        vault = VaultV4(_vault);
        lottery = LotteryEngineV4(_lottery);
    }

    // ---- Pause (F-04: pause-aware deadlines) ----

    /// @notice Pause the engine. Time spent paused is added back to every active cycle's deadlines,
    ///         so an emergency pause can never cause honest members to default (F-04).
    /// @dev Ops note: pause ENGINES for emergencies. Pausing the Vault blocks deposits without
    ///      extending engine deadlines — reserve it for catastrophic custody scenarios only.
    function pause() external onlyOwner {
        _pausedAtTs = block.timestamp;
        _pause();
    }

    function unpause() external onlyOwner {
        cumulativePauseDuration += block.timestamp - _pausedAtTs;
        _pausedAtTs = 0;
        _unpause();
    }

    /// @dev Cumulative pause duration including a currently-running pause.
    function _pauseDebtNow() internal view returns (uint256) {
        return cumulativePauseDuration + (paused() ? block.timestamp - _pausedAtTs : 0);
    }

    /// @dev Effective deadline = raw deadline + pause time elapsed since the cycle started.
    function _effDeadline(uint256 raw, uint256 snapshot) internal view returns (uint256) {
        if (raw == 0) return 0;
        return raw + (_pauseDebtNow() - snapshot);
    }

    function _effPaymentDeadline(uint256 potId, uint256 idx) internal view returns (uint256) {
        Cycle storage c = _cycles[potId][idx];
        return _effDeadline(c.paymentDeadline, c.pauseDebtSnapshot);
    }

    function _effBiddingDeadline(uint256 potId, uint256 idx) internal view returns (uint256) {
        Cycle storage c = _cycles[potId][idx];
        return _effDeadline(c.biddingDeadline, c.pauseDebtSnapshot);
    }

    // ---- Pot creation / roster (shared) ----

    function _initPot(
        bytes32 merkleRoot,
        uint256 memberCount,
        uint256 amountPerCycle,
        uint256 cycleDuration,
        uint256 paymentWindow,
        uint256 biddingWindow
    ) internal returns (uint256 potId) {
        if (!registry.canCreate(msg.sender)) revert NotRegisteredOrAllowed(); // M-04
        if (merkleRoot == bytes32(0)) revert InvalidParams();
        if (memberCount < 2 || memberCount > MAX_MEMBERS) revert InvalidParams(); // M-05
        if (amountPerCycle < MIN_AMOUNT_PER_CYCLE) revert InvalidParams(); // C-02
        // MIN_PAYMENT_WINDOW <= paymentWindow < biddingWindow (if set) < cycleDuration (M-06/F-05)
        if (paymentWindow < MIN_PAYMENT_WINDOW || paymentWindow >= cycleDuration) revert InvalidParams();
        if (biddingWindow != 0 && (biddingWindow <= paymentWindow || biddingWindow >= cycleDuration)) {
            revert InvalidParams();
        }

        potId = ++potCounter;
        Pot storage p = _pots[potId];
        p.creator = msg.sender;
        p.merkleRoot = merkleRoot;
        p.expectedMembers = memberCount;
        p.amountPerCycle = amountPerCycle;
        p.cycleDuration = cycleDuration;
        p.paymentWindow = paymentWindow;
        p.biddingWindow = biddingWindow;
        p.status = PotStatus.Open;

        emit PotCreated(potId, msg.sender, memberCount, amountPerCycle);
    }

    /// @notice Roster is mutable ONLY before start, so a creator can drop a pre-start griefer (L-02/§4.1).
    ///         (F-12) Every update bumps `rootVersion` so joiners/frontends can detect re-issues.
    function updateMerkleRoot(uint256 potId, bytes32 newRoot) external {
        Pot storage p = _pots[potId];
        if (msg.sender != p.creator) revert NotCreator();
        if (p.status != PotStatus.Open || p.rootFrozen) revert PotNotOpen();
        if (newRoot == bytes32(0)) revert InvalidParams();
        p.merkleRoot = newRoot;
        rootVersion[potId] += 1;
        emit MerkleRootUpdated(potId, newRoot, rootVersion[potId]);
    }

    /// @notice Join a pot with a Merkle proof bound to msg.sender (C-01). Blacklist-gated (M-04).
    function joinPot(uint256 potId, bytes32[] calldata proof) external whenNotPaused {
        Pot storage p = _pots[potId];
        if (p.status != PotStatus.Open) revert PotNotOpen();
        if (isMember[potId][msg.sender]) revert AlreadyMember();
        if (!registry.canJoin(msg.sender)) revert NotRegisteredOrAllowed();
        if (p.members.length >= p.expectedMembers) revert RosterFull();
        if (joinedPotsCount[msg.sender] >= MAX_JOINED_POTS) revert TooManyJoinedPots(); // L-01

        uint256 last = lastJoinLeave[potId][msg.sender];
        if (last != 0 && block.timestamp < last + JOIN_LEAVE_COOLDOWN) revert CooldownActive(); // L-02

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender))));
        if (!MerkleProof.verify(proof, p.merkleRoot, leaf)) revert InvalidProof();

        isMember[potId][msg.sender] = true;
        p.members.push(msg.sender);
        joinedPotsCount[msg.sender] += 1;
        lastJoinLeave[potId][msg.sender] = block.timestamp;

        emit Joined(potId, msg.sender);
    }

    /// @notice Leave before the pot starts. Repeated leaving is reputation-penalized (L-02).
    ///         (NEW-2) Now pausable — admin has full control during emergencies.
    function leavePot(uint256 potId) external whenNotPaused {
        Pot storage p = _pots[potId];
        if (p.status != PotStatus.Open) revert PotNotOpen();
        if (!isMember[potId][msg.sender]) revert NotMember();

        isMember[potId][msg.sender] = false;
        uint256 n = p.members.length;
        for (uint256 i = 0; i < n; i++) {
            if (p.members[i] == msg.sender) {
                p.members[i] = p.members[n - 1];
                p.members.pop();
                break;
            }
        }
        joinedPotsCount[msg.sender] -= 1;
        lastJoinLeave[potId][msg.sender] = block.timestamp;

        registry.penalizeLeave(msg.sender, potId);
        emit Left(potId, msg.sender);
    }

    /// @notice (F-07) Free a member's joined-pot slot once the pot has completed. Permissionless —
    ///         releasing a slot only ever benefits the member; the cap is concurrent, not lifetime.
    function releaseSlot(uint256 potId, address member) external {
        if (_pots[potId].status != PotStatus.Completed) revert PotNotCompleted();
        if (!isMember[potId][member]) revert NotMember();
        if (slotReleased[potId][member]) revert AlreadyReleased();
        slotReleased[potId][member] = true;
        joinedPotsCount[member] -= 1;
        emit SlotReleased(potId, member);
    }

    /// @notice Start the pot. Freezes the roster/root for the pot's life (M-05/§4.1).
    function startPot(uint256 potId) external whenNotPaused {
        Pot storage p = _pots[potId];
        if (msg.sender != p.creator) revert NotCreator();
        if (p.status != PotStatus.Open) revert PotNotOpen();
        if (p.members.length != p.expectedMembers) revert RosterIncomplete(); // M-05 / invariant #1

        p.status = PotStatus.Active;
        p.rootFrozen = true;
        emit PotStarted(potId);

        _onStartPot(potId);
    }

    /// @notice Start the next cycle. Permissionless for liveness (§9 keeper model).
    ///         (F-08) `cycleDuration` is enforced as a real cadence: the next cycle cannot start
    ///         earlier than `previous.startTime + cycleDuration`, so windows arrive on the schedule
    ///         members agreed to and can never be compressed by a keeper.
    function startCycle(uint256 potId) external whenNotPaused {
        Pot storage p = _pots[potId];
        if (p.status != PotStatus.Active) revert PotNotActive();
        if (p.currentCycle >= p.expectedMembers) revert CycleCapReached();
        if (p.currentCycle > 0) {
            Cycle storage prev = _cycles[potId][p.currentCycle];
            if (prev.status != CycleStatus.Completed) revert PreviousCycleOpen();
            if (block.timestamp < prev.startTime + p.cycleDuration) revert CycleTooEarly(); // F-08
        }
        if (!_canStartCycle(potId)) revert CannotStartCycle();

        uint256 idx = ++p.currentCycle;
        Cycle storage c = _cycles[potId][idx];
        c.startTime = block.timestamp;
        c.paymentDeadline = block.timestamp + p.paymentWindow;
        c.biddingDeadline = p.biddingWindow == 0 ? 0 : block.timestamp + p.biddingWindow;
        c.pauseDebtSnapshot = _pauseDebtNow(); // F-04
        c.status = CycleStatus.Active;

        emit CycleStarted(potId, idx, block.timestamp);
    }

    // ---- Payments (shared) ----

    /// @notice Pay the current cycle's contribution before the deadline (M-06). Winners must keep paying.
    function payForCycle(uint256 potId) external whenNotPaused nonReentrant {
        _payForCycle(potId);
    }

    /// @notice (UX) Pay with an EIP-2612 permit — folds approve + pay into a single transaction.
    ///         The permit is best-effort (`try/catch`) so a front-run permit cannot block payment
    ///         when sufficient allowance already exists.
    function payForCycleWithPermit(uint256 potId, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
        external
        whenNotPaused
        nonReentrant
    {
        try IERC20Permit(address(vault.USDC())).permit(
            msg.sender, address(vault), _pots[potId].amountPerCycle, deadline, v, r, s
        ) {} catch {}
        _payForCycle(potId);
    }

    function _payForCycle(uint256 potId) internal {
        Pot storage p = _pots[potId];
        if (p.status != PotStatus.Active) revert PotNotActive();
        uint256 idx = p.currentCycle;
        Cycle storage c = _cycles[potId][idx];
        if (c.status != CycleStatus.Active) revert CycleNotActive();
        if (!isMember[potId][msg.sender]) revert NotMember();
        if (defaulted[potId][msg.sender]) revert NotMember();
        if (block.timestamp >= _effPaymentDeadline(potId, idx)) revert PaymentWindowClosed(); // M-06/F-04
        if (paidForCycle[potId][idx][msg.sender]) revert AlreadyPaid();

        // Effects.
        paidForCycle[potId][idx][msg.sender] = true;
        c.paidCount += 1;
        c.totalCollected += p.amountPerCycle;

        // Interactions.
        vault.depositForCycle(potId, idx, msg.sender, p.amountPerCycle);
        registry.recordParticipation(msg.sender, potId, idx, p.amountPerCycle);

        emit Paid(potId, idx, msg.sender, p.amountPerCycle);
    }

    /// @notice Flag non-payers as defaulters after the payment deadline. Permissionless (§4.2).
    function settleCycle(uint256 potId) external whenNotPaused {
        Pot storage p = _pots[potId];
        if (p.status != PotStatus.Active) revert PotNotActive();
        uint256 idx = p.currentCycle;
        Cycle storage c = _cycles[potId][idx];
        if (c.status != CycleStatus.Active) revert CycleNotActive();
        if (block.timestamp < _effPaymentDeadline(potId, idx)) revert PaymentWindowOpen();
        _settle(potId, idx);
    }

    function _settle(uint256 potId, uint256 idx) internal {
        Cycle storage c = _cycles[potId][idx];
        if (c.settled) return;
        c.settled = true;

        Pot storage p = _pots[potId];
        uint256 n = p.members.length;
        for (uint256 i = 0; i < n; i++) {
            address m = p.members[i];
            if (!paidForCycle[potId][idx][m] && !defaulted[potId][m]) {
                defaulted[potId][m] = true;
                registry.markAsDefaulter(m, potId, idx); // slash; blacklist on repeat (M-04/F-05)
                emit MemberDefaultedInPot(potId, idx, m);
            }
        }
        emit CycleSettled(potId, idx, c.totalCollected, c.paidCount);
    }

    function _ensureSettled(uint256 potId, uint256 idx) internal {
        Cycle storage c = _cycles[potId][idx];
        if (!c.settled && block.timestamp >= _effPaymentDeadline(potId, idx)) {
            _settle(potId, idx);
        }
    }

    // ---- Eligibility (shared) ----

    /// @dev Callers iterate `p.members`, whose entries are members by construction, so the
    ///      `isMember` SLOAD is intentionally omitted (gas).
    function _isEligible(uint256 potId, uint256 idx, address m) internal view returns (bool) {
        return paidForCycle[potId][idx][m] && !hasWonInPot[potId][m] && !defaulted[potId][m];
    }

    /// @dev Single pass with an over-allocated array trimmed in place (gas; was two passes).
    function _eligibleMembers(uint256 potId, uint256 idx) internal view returns (address[] memory out) {
        Pot storage p = _pots[potId];
        uint256 n = p.members.length;
        out = new address[](n);
        uint256 j;
        for (uint256 i = 0; i < n; i++) {
            address m = p.members[i];
            if (_isEligible(potId, idx, m)) {
                out[j++] = m;
            }
        }
        assembly {
            mstore(out, j)
        }
    }

    /// @notice Members who paid this cycle and are not defaulted (refund set for early-completion).
    function _paidNonDefaulted(uint256 potId, uint256 idx) internal view returns (address[] memory out) {
        Pot storage p = _pots[potId];
        uint256 n = p.members.length;
        out = new address[](n);
        uint256 j;
        for (uint256 i = 0; i < n; i++) {
            address m = p.members[i];
            if (paidForCycle[potId][idx][m] && !defaulted[potId][m]) out[j++] = m;
        }
        assembly {
            mstore(out, j)
        }
    }

    // ---- VRF gate + dispatch (shared; C-02/§4.4, F-01 store-then-finalize) ----

    function _requestCycleVRF(uint256 potId, uint256 idx) internal {
        Cycle storage c = _cycles[potId][idx];
        uint256 reqId = lottery.requestRandomness();
        _pendingDraws[reqId] =
            PendingDraw({potId: potId, cycleId: idx, isShuffle: false, exists: true, ready: false, word: 0});
        c.status = CycleStatus.AwaitingVRF;
        c.vrfRequestId = reqId;
        c.vrfRequestedAt = block.timestamp;
        emit VRFRequested(potId, idx, reqId);
    }

    function _requestShuffle(uint256 potId) internal {
        uint256 reqId = lottery.requestRandomness();
        _pendingDraws[reqId] =
            PendingDraw({potId: potId, cycleId: 0, isShuffle: true, exists: true, ready: false, word: 0});
        shuffleRequestId[potId] = reqId; // F-02
        shuffleRequestedAt[potId] = block.timestamp;
        emit VRFRequested(potId, 0, reqId);
    }

    /// @notice Pick a winner with the §4.4 economic gate: 0 eligible -> early complete; 1 -> direct
    ///         (no VRF); >=2 -> VRF.
    function _drawGated(uint256 potId, uint256 idx) internal {
        address[] memory eligible = _eligibleMembers(potId, idx);
        if (eligible.length == 0) {
            _finalizeNoWinner(potId, idx);
        } else if (eligible.length == 1) {
            _finalizeWinner(potId, idx, eligible[0], _cycles[potId][idx].totalCollected);
        } else {
            _requestCycleVRF(potId, idx);
        }
    }

    /// @notice (F-01) VRF delivery ONLY stores the random word. It performs no settlement, no
    ///         external token movement, and no unbounded loops, so it can never exceed the VRF
    ///         `callbackGasLimit`. Anyone then calls `finalizeDraw` to settle with full gas.
    function fulfillRandomness(uint256 requestId, uint256 randomWord) external override {
        if (msg.sender != address(lottery)) revert OnlyLottery();
        PendingDraw storage pd = _pendingDraws[requestId];
        if (!pd.exists || pd.ready) revert UnknownRequest();
        pd.ready = true;
        pd.word = randomWord;
        emit RandomnessReady(pd.potId, pd.cycleId, requestId);
    }

    /// @notice (F-01) Permissionless settlement of a delivered random word — shuffle seed or cycle
    ///         draw — in an ordinary transaction with a full block gas budget.
    function finalizeDraw(uint256 potId) external whenNotPaused {
        // Shuffle first: it only ever exists before cycles run.
        uint256 sReq = shuffleRequestId[potId];
        if (sReq != 0 && _pendingDraws[sReq].exists) {
            PendingDraw storage sd = _pendingDraws[sReq];
            if (!sd.ready) revert RandomnessNotReady();
            uint256 seed = sd.word;
            delete _pendingDraws[sReq];
            shuffleRequestId[potId] = 0;
            _onShuffleSeed(potId, seed);
            return;
        }

        uint256 idx = _pots[potId].currentCycle;
        Cycle storage c = _cycles[potId][idx];
        if (c.status != CycleStatus.AwaitingVRF) revert NotAwaitingVRF();
        PendingDraw storage pd = _pendingDraws[c.vrfRequestId];
        if (!pd.exists) revert UnknownRequest();
        if (!pd.ready) revert RandomnessNotReady();
        uint256 word = pd.word;
        delete _pendingDraws[c.vrfRequestId];
        _onCycleRandom(potId, idx, word);
    }

    function _onCycleRandom(uint256 potId, uint256 idx, uint256 word) internal {
        address[] memory eligible = _eligibleMembers(potId, idx);
        if (eligible.length == 0) {
            _finalizeNoWinner(potId, idx);
        } else {
            address winner = eligible[word % eligible.length];
            _finalizeWinner(potId, idx, winner, _cycles[potId][idx].totalCollected);
        }
    }

    /// @notice Recover a cycle stuck awaiting a VRF callback (NEW-3: retry-before-fallback).
    ///         If the word actually arrived, it is consumed (same as finalizeDraw). Otherwise the
    ///         first timeout(s) retry the draw; after MAX_VRF_RETRIES an eligible winner is still
    ///         selected via a deterministic fallback (F-09) — a Chainlink outage degrades the
    ///         randomness source, it no longer kills a healthy pot.
    function cancelStuckVRFCycle(uint256 potId) external whenNotPaused {
        Pot storage p = _pots[potId];
        uint256 idx = p.currentCycle;
        Cycle storage c = _cycles[potId][idx];
        if (c.status != CycleStatus.AwaitingVRF) revert NotAwaitingVRF();

        PendingDraw storage pd = _pendingDraws[c.vrfRequestId];
        if (pd.exists && pd.ready) {
            // Randomness was delivered but never finalized — consume it, don't cancel it.
            uint256 word = pd.word;
            delete _pendingDraws[c.vrfRequestId];
            _onCycleRandom(potId, idx, word);
            return;
        }

        if (block.timestamp < c.vrfRequestedAt + VRF_TIMEOUT) revert TimeoutNotReached();

        // Invalidate the old pending draw
        delete _pendingDraws[c.vrfRequestId];

        if (c.vrfRetryCount < MAX_VRF_RETRIES) {
            // Retry: reset to Active so the draw can be re-attempted
            c.vrfRetryCount += 1;
            c.status = CycleStatus.Active;
            // Re-run the gated draw (will re-request VRF if eligible >= 2)
            _drawGated(potId, idx);
        } else {
            // Retries exhausted — (F-09) deterministic fallback instead of killing the pot.
            c.status = CycleStatus.Active;
            address[] memory eligible = _eligibleMembers(potId, idx);
            if (eligible.length == 0) {
                _finalizeNoWinner(potId, idx);
            } else {
                // Acceptable after >= 3 days of provable VRF outage: seed is not miner-cheap to
                // grind (prevrandao + prior blockhash + pot/cycle domain separation), and the
                // alternative is destroying the pot for every honest member.
                uint256 word =
                    uint256(keccak256(abi.encodePacked(block.prevrandao, blockhash(block.number - 1), potId, idx)));
                address winner = eligible[word % eligible.length];
                emit FallbackWinnerSelected(potId, idx, winner);
                _finalizeWinner(potId, idx, winner, c.totalCollected);
            }
        }
    }

    /// @notice (F-02) Recover a pot whose SHUFFLE request never fulfilled. Retries first; once
    ///         retries are exhausted the pot reopens so members can leave (no funds are at risk —
    ///         payments only begin after the first cycle starts). The Merkle root stays frozen, so
    ///         the pot remains invite-only to the original roster.
    function cancelStuckShuffle(uint256 potId) external whenNotPaused {
        Pot storage p = _pots[potId];
        uint256 reqId = shuffleRequestId[potId];
        if (p.status != PotStatus.Active || reqId == 0) revert NotAwaitingVRF();
        PendingDraw storage pd = _pendingDraws[reqId];
        if (!pd.exists) revert UnknownRequest();
        if (pd.ready) revert RandomnessPendingConsumption(); // call finalizeDraw instead
        if (block.timestamp < shuffleRequestedAt[potId] + VRF_TIMEOUT) revert TimeoutNotReached();

        delete _pendingDraws[reqId];

        if (shuffleRetryCount[potId] < MAX_VRF_RETRIES) {
            shuffleRetryCount[potId] += 1;
            _requestShuffle(potId);
        } else {
            shuffleRequestId[potId] = 0;
            shuffleRetryCount[potId] = 0;
            p.status = PotStatus.Open;
            emit PotReopened(potId);
        }
    }

    // ---- Finalization (shared; H-03/H-04/§4.2) ----

    function _finalizeWinner(uint256 potId, uint256 idx, address winner, uint256 winnerCredit) internal {
        address[] memory recipients = _interestRecipients(potId, idx, winner);
        _finalize(potId, idx, winner, winnerCredit, recipients, CREDIT_DIVIDEND);
    }

    function _finalizeNoWinner(uint256 potId, uint256 idx) internal {
        address[] memory recipients = _paidNonDefaulted(potId, idx);
        _finalize(potId, idx, address(0), 0, recipients, CREDIT_REFUND);
        // No eligible winner can ever appear again -> complete the pot (§4.2).
        Pot storage p = _pots[potId];
        if (p.status != PotStatus.Completed) {
            p.status = PotStatus.Completed;
            emit PotCompleted(potId);
        }
    }

    function _finalize(
        uint256 potId,
        uint256 idx,
        address winner,
        uint256 winnerCredit,
        address[] memory recipients,
        uint8 leftoverKind
    ) internal nonReentrant {
        Cycle storage c = _cycles[potId][idx];
        if (c.status == CycleStatus.Completed) revert CycleNotActive();

        uint256 assets = vault.harvestCycle(potId, idx);
        uint256 leftover = assets;

        if (winner != address(0)) {
            if (hasWonInPot[potId][winner]) revert AlreadyWonThisPot(); // H-01/H-02 belt
            uint256 wc = winnerCredit > assets ? assets : winnerCredit; // H-03 cap
            if (wc > 0) {
                vault.creditWithdrawable(winner, wc, potId, idx, CREDIT_WIN);
                leftover = assets - wc;
            }
            _recordWinner(potId, idx, winner);
            emit WinnerSelected(potId, idx, winner, wc);
        }

        // (F-06) Every harvested wei must end up claimable by someone: recipients first, else the
        // winner, else the protocol treasury. Nothing can strand in `backing`.
        if (leftover > 0) {
            if (recipients.length > 0) {
                _distribute(potId, idx, leftover, recipients, leftoverKind);
            } else if (winner != address(0)) {
                vault.creditWithdrawable(winner, leftover, potId, idx, CREDIT_RESIDUAL);
            } else {
                vault.creditToTreasury(leftover, potId, idx);
            }
        }

        c.status = CycleStatus.Completed;
        c.winner = winner;
        _pots[potId].completedCycles += 1;
        emit CycleCompleted(potId, idx, winner, assets);

        Pot storage p = _pots[potId];
        if (p.completedCycles >= p.expectedMembers && p.status != PotStatus.Completed) {
            p.status = PotStatus.Completed;
            emit PotCompleted(potId);
        }
    }

    function _distribute(uint256 potId, uint256 idx, uint256 amount, address[] memory recipients, uint8 kind)
        internal
    {
        uint256 n = recipients.length;
        if (amount == 0 || n == 0) return;
        uint256 share = amount / n;
        uint256 rem = amount - (share * n);
        for (uint256 i = 0; i < n; i++) {
            uint256 amt = share + (i == 0 ? rem : 0);
            if (amt > 0) vault.creditWithdrawable(recipients[i], amt, potId, idx, kind);
        }
    }

    function _recordWinner(uint256 potId, uint256 idx, address winner) internal {
        hasWonInPot[potId][winner] = true; // H-01/H-02
        _pots[potId].winnersCount += 1;
        registry.recordWin(winner, potId, idx);
    }

    // ---- Hooks (engine-specific) ----

    function _onStartPot(uint256 potId) internal virtual {}

    function _canStartCycle(uint256 potId) internal view virtual returns (bool) {
        return true;
    }

    function _onShuffleSeed(uint256 potId, uint256 seed) internal virtual {
        revert UnknownRequest();
    }

    /// @notice The set that shares the cycle's leftover (interest, and for the auction, the discount).
    function _interestRecipients(uint256 potId, uint256 idx, address winner)
        internal
        view
        virtual
        returns (address[] memory);

    // ---- Reads ----

    function getPot(uint256 potId)
        external
        view
        returns (
            address creator,
            bytes32 merkleRoot,
            bool rootFrozen,
            uint256 expectedMembers,
            uint256 amountPerCycle,
            PotStatus status,
            uint256 currentCycle,
            uint256 completedCycles,
            uint256 memberCount
        )
    {
        Pot storage p = _pots[potId];
        return (
            p.creator,
            p.merkleRoot,
            p.rootFrozen,
            p.expectedMembers,
            p.amountPerCycle,
            p.status,
            p.currentCycle,
            p.completedCycles,
            p.members.length
        );
    }

    /// @notice (UX) Pot schedule config so a prospective member can see, BEFORE joining, how long
    ///         they will have to pay each cycle and on what cadence.
    function getPotConfig(uint256 potId)
        external
        view
        returns (
            uint256 cycleDuration,
            uint256 paymentWindow,
            uint256 biddingWindow,
            uint256 winnersCount,
            uint64 merkleRootVersion
        )
    {
        Pot storage p = _pots[potId];
        return (p.cycleDuration, p.paymentWindow, p.biddingWindow, p.winnersCount, rootVersion[potId]);
    }

    /// @dev Deadlines returned are EFFECTIVE (pause-extended) deadlines (F-04).
    function getCycle(uint256 potId, uint256 idx)
        external
        view
        returns (
            uint256 startTime,
            uint256 paymentDeadline,
            uint256 biddingDeadline,
            uint256 totalCollected,
            uint256 paidCount,
            CycleStatus status,
            address winner,
            bool settled
        )
    {
        Cycle storage c = _cycles[potId][idx];
        return (
            c.startTime,
            _effDeadline(c.paymentDeadline, c.pauseDebtSnapshot),
            _effDeadline(c.biddingDeadline, c.pauseDebtSnapshot),
            c.totalCollected,
            c.paidCount,
            c.status,
            c.winner,
            c.settled
        );
    }

    function getMembers(uint256 potId) external view returns (address[] memory) {
        return _pots[potId].members;
    }

    function eligibleCount(uint256 potId, uint256 idx) external view returns (uint256) {
        return _eligibleMembers(potId, idx).length;
    }

    /// @notice (F-01) True when a delivered random word is waiting for `finalizeDraw`.
    function drawReady(uint256 potId) external view returns (bool) {
        uint256 sReq = shuffleRequestId[potId];
        if (sReq != 0 && _pendingDraws[sReq].exists) return _pendingDraws[sReq].ready;
        uint256 idx = _pots[potId].currentCycle;
        Cycle storage c = _cycles[potId][idx];
        if (c.status != CycleStatus.AwaitingVRF) return false;
        return _pendingDraws[c.vrfRequestId].ready;
    }
}
