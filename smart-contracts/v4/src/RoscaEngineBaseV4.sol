// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
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
abstract contract RoscaEngineBaseV4 is IRandomnessReceiver, Ownable, ReentrancyGuard, Pausable {
    // ---- Shared constants ----
    uint256 public constant MIN_AMOUNT_PER_CYCLE = 1e6; // 1 USDC (C-02)
    uint256 public constant MAX_MEMBERS = 100; // == LotteryEngineV4.MAX_PARTICIPANTS ([I])
    uint256 public constant MAX_JOINED_POTS = 50; // (L-01)
    uint256 public constant JOIN_LEAVE_COOLDOWN = 1 days; // (L-02)
    uint256 public constant VRF_TIMEOUT = 1 days; // stuck-VRF recovery window (NEW-3: reduced from 3 days)
    uint256 public constant MAX_VRF_RETRIES = 2; // (NEW-3: retry before early-completion)

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
    }

    struct PendingDraw {
        uint256 potId;
        uint256 cycleId;
        bool isShuffle;
        bool exists;
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
    mapping(uint256 => PendingDraw) internal _pendingDraws; // vrf requestId => draw

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
    error RosterIncomplete();
    error CycleNotActive();
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

    // ---- Events ----
    event PotCreated(uint256 indexed potId, address indexed creator, uint256 expectedMembers, uint256 amountPerCycle);
    event MerkleRootUpdated(uint256 indexed potId, bytes32 newRoot);
    event Joined(uint256 indexed potId, address indexed member);
    event Left(uint256 indexed potId, address indexed member);
    event PotStarted(uint256 indexed potId);
    event CycleStarted(uint256 indexed potId, uint256 indexed cycleId, uint256 startTime);
    event Paid(uint256 indexed potId, uint256 indexed cycleId, address indexed member, uint256 amount);
    event CycleSettled(uint256 indexed potId, uint256 indexed cycleId, uint256 totalCollected, uint256 paidCount);
    event MemberDefaultedInPot(uint256 indexed potId, uint256 indexed cycleId, address indexed member);
    event VRFRequested(uint256 indexed potId, uint256 indexed cycleId, uint256 requestId);
    event WinnerSelected(uint256 indexed potId, uint256 indexed cycleId, address indexed winner, uint256 amount);
    event CycleCompleted(uint256 indexed potId, uint256 indexed cycleId, address winner, uint256 assets);
    event PotCompleted(uint256 indexed potId);

    constructor(address _registry, address _vault, address _lottery) Ownable(msg.sender) {
        if (_registry == address(0) || _vault == address(0) || _lottery == address(0)) revert InvalidParams();
        registry = MemberRegistryV4(_registry);
        vault = VaultV4(_vault);
        lottery = LotteryEngineV4(_lottery);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
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
        // paymentWindow < biddingWindow (if set) < cycleDuration (M-06)
        if (paymentWindow == 0 || paymentWindow >= cycleDuration) revert InvalidParams();
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
    function updateMerkleRoot(uint256 potId, bytes32 newRoot) external {
        Pot storage p = _pots[potId];
        if (msg.sender != p.creator) revert NotCreator();
        if (p.status != PotStatus.Open || p.rootFrozen) revert PotNotOpen();
        if (newRoot == bytes32(0)) revert InvalidParams();
        p.merkleRoot = newRoot;
        emit MerkleRootUpdated(potId, newRoot);
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
    function startCycle(uint256 potId) external whenNotPaused {
        Pot storage p = _pots[potId];
        if (p.status != PotStatus.Active) revert PotNotActive();
        if (p.currentCycle >= p.expectedMembers) revert CycleCapReached();
        if (p.currentCycle > 0 && _cycles[potId][p.currentCycle].status != CycleStatus.Completed) {
            revert PreviousCycleOpen();
        }
        if (!_canStartCycle(potId)) revert CannotStartCycle();

        uint256 idx = ++p.currentCycle;
        Cycle storage c = _cycles[potId][idx];
        c.startTime = block.timestamp;
        c.paymentDeadline = block.timestamp + p.paymentWindow;
        c.biddingDeadline = p.biddingWindow == 0 ? 0 : block.timestamp + p.biddingWindow;
        c.status = CycleStatus.Active;

        emit CycleStarted(potId, idx, block.timestamp);
    }

    // ---- Payments (shared) ----

    /// @notice Pay the current cycle's contribution before the deadline (M-06). Winners must keep paying.
    function payForCycle(uint256 potId) external whenNotPaused nonReentrant {
        Pot storage p = _pots[potId];
        if (p.status != PotStatus.Active) revert PotNotActive();
        uint256 idx = p.currentCycle;
        Cycle storage c = _cycles[potId][idx];
        if (c.status != CycleStatus.Active) revert CycleNotActive();
        if (!isMember[potId][msg.sender]) revert NotMember();
        if (defaulted[potId][msg.sender]) revert NotMember();
        if (block.timestamp >= c.paymentDeadline) revert PaymentWindowClosed(); // M-06
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
        if (block.timestamp < c.paymentDeadline) revert PaymentWindowOpen();
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
                registry.markAsDefaulter(m, potId, idx); // slash + global blacklist (M-04)
                emit MemberDefaultedInPot(potId, idx, m);
            }
        }
        emit CycleSettled(potId, idx, c.totalCollected, c.paidCount);
    }

    function _ensureSettled(uint256 potId, uint256 idx) internal {
        Cycle storage c = _cycles[potId][idx];
        if (!c.settled && block.timestamp >= c.paymentDeadline) {
            _settle(potId, idx);
        }
    }

    // ---- Eligibility (shared) ----

    function _isEligible(uint256 potId, uint256 idx, address m) internal view returns (bool) {
        return isMember[potId][m] && paidForCycle[potId][idx][m] && !hasWonInPot[potId][m]
            && !defaulted[potId][m];
    }

    function _eligibleMembers(uint256 potId, uint256 idx) internal view returns (address[] memory out) {
        Pot storage p = _pots[potId];
        uint256 n = p.members.length;
        uint256 count;
        for (uint256 i = 0; i < n; i++) {
            if (_isEligible(potId, idx, p.members[i])) count++;
        }
        out = new address[](count);
        uint256 j;
        for (uint256 i = 0; i < n; i++) {
            address m = p.members[i];
            if (_isEligible(potId, idx, m)) {
                out[j++] = m;
            }
        }
    }

    /// @notice Members who paid this cycle and are not defaulted (refund set for early-completion).
    function _paidNonDefaulted(uint256 potId, uint256 idx) internal view returns (address[] memory out) {
        Pot storage p = _pots[potId];
        uint256 n = p.members.length;
        uint256 count;
        for (uint256 i = 0; i < n; i++) {
            address m = p.members[i];
            if (paidForCycle[potId][idx][m] && !defaulted[potId][m]) count++;
        }
        out = new address[](count);
        uint256 j;
        for (uint256 i = 0; i < n; i++) {
            address m = p.members[i];
            if (paidForCycle[potId][idx][m] && !defaulted[potId][m]) out[j++] = m;
        }
    }

    // ---- VRF gate + dispatch (shared; C-02/§4.4) ----

    function _requestCycleVRF(uint256 potId, uint256 idx) internal {
        Cycle storage c = _cycles[potId][idx];
        uint256 reqId = lottery.requestRandomness();
        _pendingDraws[reqId] = PendingDraw({potId: potId, cycleId: idx, isShuffle: false, exists: true});
        c.status = CycleStatus.AwaitingVRF;
        c.vrfRequestId = reqId;
        c.vrfRequestedAt = block.timestamp;
        emit VRFRequested(potId, idx, reqId);
    }

    function _requestShuffle(uint256 potId) internal {
        uint256 reqId = lottery.requestRandomness();
        _pendingDraws[reqId] = PendingDraw({potId: potId, cycleId: 0, isShuffle: true, exists: true});
        emit VRFRequested(potId, 0, reqId);
    }

    /// @notice Pick a winner with the §4.4 economic gate: 0 eligible -> early complete; 1 -> direct
    ///         (no VRF); >=2 -> VRF (funded).
    function _drawGated(uint256 potId, uint256 idx) internal {
        address[] memory eligible = _eligibleMembers(potId, idx);
        if (eligible.length == 0) {
            _finalizeNoWinner(potId, idx);
        } else if (eligible.length == 1) {
            _finalizeWinner(potId, idx, eligible[0], _cycles[potId][idx].totalCollected);
        } else {
            if (_cycles[potId][idx].totalCollected < MIN_AMOUNT_PER_CYCLE) revert InvalidParams();
            _requestCycleVRF(potId, idx);
        }
    }

    function fulfillRandomness(uint256 requestId, uint256 randomWord) external override {
        if (msg.sender != address(lottery)) revert OnlyLottery();
        PendingDraw memory pd = _pendingDraws[requestId];
        if (!pd.exists) revert UnknownRequest();
        delete _pendingDraws[requestId];

        if (pd.isShuffle) {
            _onShuffleSeed(pd.potId, randomWord);
        } else {
            _onCycleRandom(pd.potId, pd.cycleId, randomWord);
        }
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

    /// @notice Recover a cycle stuck awaiting a VRF callback (NEW-3: retry-before-kill).
    ///         First timeout(s) retry the draw. Only after MAX_VRF_RETRIES does the pot early-complete.
    function cancelStuckVRFCycle(uint256 potId) external whenNotPaused {
        Pot storage p = _pots[potId];
        uint256 idx = p.currentCycle;
        Cycle storage c = _cycles[potId][idx];
        if (c.status != CycleStatus.AwaitingVRF) revert NotAwaitingVRF();
        if (block.timestamp < c.vrfRequestedAt + VRF_TIMEOUT) revert TimeoutNotReached();

        // Invalidate the old pending draw
        _pendingDraws[c.vrfRequestId].exists = false;

        if (c.vrfRetryCount < MAX_VRF_RETRIES) {
            // Retry: reset to Active so the draw can be re-attempted
            c.vrfRetryCount += 1;
            c.status = CycleStatus.Active;
            // Re-run the gated draw (will re-request VRF if eligible >= 2)
            _drawGated(potId, idx);
        } else {
            // Retries exhausted — gracefully early-complete
            c.status = CycleStatus.Active;
            _finalizeNoWinner(potId, idx);
        }
    }

    // ---- Finalization (shared; H-03/H-04/§4.2) ----

    function _finalizeWinner(uint256 potId, uint256 idx, address winner, uint256 winnerCredit) internal {
        address[] memory recipients = _interestRecipients(potId, idx, winner);
        _finalize(potId, idx, winner, winnerCredit, recipients);
    }

    function _finalizeNoWinner(uint256 potId, uint256 idx) internal {
        address[] memory recipients = _paidNonDefaulted(potId, idx);
        _finalize(potId, idx, address(0), 0, recipients);
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
        address[] memory recipients
    ) internal nonReentrant {
        Cycle storage c = _cycles[potId][idx];
        if (c.status == CycleStatus.Completed) revert CycleNotActive();

        uint256 assets = vault.harvestCycle(potId, idx);
        uint256 leftover = assets;

        if (winner != address(0)) {
            if (hasWonInPot[potId][winner]) revert AlreadyWonThisPot(); // H-01/H-02 belt
            uint256 wc = winnerCredit > assets ? assets : winnerCredit; // H-03 cap
            if (wc > 0) {
                vault.creditWithdrawable(winner, wc);
                leftover = assets - wc;
            }
            _recordWinner(potId, idx, winner);
            emit WinnerSelected(potId, idx, winner, wc);
        }

        _distribute(leftover, recipients);

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

    function _distribute(uint256 amount, address[] memory recipients) internal {
        uint256 n = recipients.length;
        if (amount == 0 || n == 0) return; // dust (if any) remains as tracked backing, never lost
        uint256 share = amount / n;
        uint256 rem = amount - (share * n);
        for (uint256 i = 0; i < n; i++) {
            uint256 amt = share + (i == 0 ? rem : 0);
            if (amt > 0) vault.creditWithdrawable(recipients[i], amt);
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
            c.paymentDeadline,
            c.biddingDeadline,
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
}
