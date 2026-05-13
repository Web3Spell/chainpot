// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {MemberAccountManagerV3} from "./MemberAccountManagerV3.sol";
import {LotteryEngineV3} from "./LotteryEngineV3.sol";
import {EscrowV3} from "./EscrowV3.sol";

/// @title AuctionEngineV3
/// @notice ChainPot core. Pot lifecycle, cycle execution, bidding, winner selection, payouts.
/// @dev Implements all High-severity audit fixes: sequential cycles (H-01), creator-or-after-deadline
///      access (H-03), CEI on VRF request (H-04), winner-is-member check (H-05), discount distribution
///      to non-winners (C-01), nonReentrant on declareWinner.
contract AuctionEngineV3 is Ownable, ReentrancyGuard, Pausable {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    IERC20 public immutable USDC;
    MemberAccountManagerV3 public immutable memberManager;
    LotteryEngineV3 public immutable lotteryEngine;
    EscrowV3 public immutable escrow;

    enum CycleFrequency {Monthly, BiWeekly, Weekly}
    enum PotStatus {Active, Paused, Completed}
    enum CycleStatus {Pending, Active, BiddingClosed, AwaitingVRF, Completed}

    struct Pot {
        string name;
        address creator;
        uint256 amountPerCycle;
        uint256 cycleDuration;
        uint256 cycleCount;
        uint256 completedCycles;
        CycleFrequency frequency;
        uint256 bidDepositDeadline;
        PotStatus status;
        address[] members;
        uint256[] cycleIds;
        uint256 createdAt;
        uint256 minMembers;
        uint256 maxMembers;
    }

    struct AuctionCycle {
        uint256 potId;
        uint256 cycleId;
        uint256 startTime;
        uint256 endTime;
        address winner;
        uint256 winningBid;
        CycleStatus status;
        mapping(address => uint256) bids;
        EnumerableSet.AddressSet bidders;
        uint256 totalCollected;
        uint256 vrfRequestId;
    }

    uint256 public potCounter = 1;
    uint256 public cycleCounter = 1;

    mapping(uint256 => Pot) public chainPots;
    mapping(uint256 => AuctionCycle) private auctionCycles;
    mapping(uint256 => mapping(address => bool)) public hasJoinedPot;
    /// @notice (cycleId => member => paid). H-01 fix: cycle-keyed, not pot-keyed.
    mapping(uint256 => mapping(address => bool)) public hasPaidForCycle;
    mapping(address => uint256[]) public userPots;
    mapping(uint256 => uint256) public requestIdToCycle;

    uint256 public constant MIN_CYCLE_DURATION = 1 days;
    uint256 public constant MAX_CYCLE_DURATION = 30 days;
    uint256 public constant MIN_BID_DEADLINE = 1 hours;
    uint256 public constant MAX_MEMBERS = 100;
    uint256 public constant MAX_NAME_LENGTH = 100;
    uint256 public constant CREATOR_GRACE_PERIOD = 1 hours;
    uint256 public constant VRF_TIMEOUT = 7 days;

    error NotRegistered();
    error NotPotCreator();
    error InvalidPot();
    error InvalidCycle();
    error PotNotActive();
    error AlreadyJoined();
    error PotFull();
    error PotAlreadyStarted();
    error NotAMember();
    error CreatorCannotLeave();
    error InvalidCycleDuration();
    error InvalidBidDeadline();
    error InvalidCycleCount();
    error InvalidMemberLimits();
    error TooManyMembers();
    error EmptyName();
    error NameTooLong();
    error InvalidAmount();
    error NotEnoughMembers();
    error AllCyclesCompleted();
    error CycleNotActive();
    error BidDeadlinePassed();
    error InvalidBidAmount();
    error TooEarlyToClose();
    error BiddingNotClosed();
    error WinnerNotDeclared();
    error AlreadyCompleted();
    error CycleNotEnded();
    error PotDoesNotExist();
    error CannotLeaveAfterStarted();
    error AlreadyPaidForCycle();
    error NotPaidForCycle();
    error NotLotteryEngine();
    error InvalidCycleStatus();
    error WinnerAlreadySet();
    error VRFRequestNotFound();
    error InvalidAddress();
    error PreviousCycleNotComplete();
    error NotMemberOrCreator();
    error NotAuthorizedOrTooEarly();
    error WinnerNotPotMember();
    error VRFTimeoutNotReached();

    event PotCreated(uint256 indexed potId, string name, address indexed creator, uint256 amountPerCycle);
    event JoinedPot(uint256 indexed potId, address indexed user);
    event LeftPot(uint256 indexed potId, address indexed user);
    event CycleStarted(uint256 indexed cycleId, uint256 indexed potId, uint256 startTime, uint256 endTime);
    event MemberPaidForCycle(uint256 indexed potId, uint256 indexed cycleId, address indexed member, uint256 amount);
    event BidPlaced(uint256 indexed cycleId, address indexed bidder, uint256 amount);
    event BiddingClosed(uint256 indexed cycleId, uint256 timestamp);
    event WinnerDeclared(uint256 indexed cycleId, address indexed winner, uint256 amount);
    event DiscountAndInterestDistributed(uint256 indexed cycleId, uint256 totalDistributed, uint256 perMember, uint256 remainder);
    event CycleCompleted(uint256 indexed cycleId, uint256 indexed potId);
    event CycleCancelled(uint256 indexed cycleId, uint256 indexed potId);
    event PotStatusChanged(uint256 indexed potId, PotStatus status);
    event VRFRequested(uint256 indexed cycleId, uint256 indexed requestId);

    constructor(address _usdc, address _memberManager, address _lotteryEngine, address _escrow) Ownable(msg.sender) {
        if (_usdc == address(0) || _memberManager == address(0) || _lotteryEngine == address(0) || _escrow == address(0)) {
            revert InvalidAddress();
        }
        if (_memberManager.code.length == 0 || _lotteryEngine.code.length == 0 || _escrow.code.length == 0) {
            revert InvalidAddress();
        }
        USDC = IERC20(_usdc);
        memberManager = MemberAccountManagerV3(_memberManager);
        lotteryEngine = LotteryEngineV3(_lotteryEngine);
        escrow = EscrowV3(_escrow);
    }

    modifier onlyRegistered() {
        if (!memberManager.isRegistered(msg.sender)) revert NotRegistered();
        _;
    }

    modifier validPot(uint256 potId) {
        if (potId == 0 || potId >= potCounter) revert InvalidPot();
        if (chainPots[potId].creator == address(0)) revert PotDoesNotExist();
        _;
    }

    modifier validCycle(uint256 cycleId) {
        if (cycleId == 0 || cycleId >= cycleCounter) revert InvalidCycle();
        _;
    }

    modifier onlyLotteryEngine() {
        if (msg.sender != address(lotteryEngine)) revert NotLotteryEngine();
        _;
    }

    // ---- Pot lifecycle ----

    function createPot(
        string calldata name,
        uint256 amountPerCycle,
        uint256 cycleDuration,
        uint256 cycleCount,
        CycleFrequency frequency,
        uint256 bidDepositDeadline,
        uint256 minMembers,
        uint256 maxMembers
    ) external onlyRegistered whenNotPaused returns (uint256) {
        if (bytes(name).length == 0) revert EmptyName();
        if (bytes(name).length > MAX_NAME_LENGTH) revert NameTooLong();
        if (amountPerCycle == 0) revert InvalidAmount();
        if (cycleDuration < MIN_CYCLE_DURATION || cycleDuration > MAX_CYCLE_DURATION) revert InvalidCycleDuration();
        if (bidDepositDeadline < MIN_BID_DEADLINE || bidDepositDeadline >= cycleDuration) revert InvalidBidDeadline();
        if (cycleCount == 0 || cycleCount > 100) revert InvalidCycleCount();
        if (minMembers < 2 || minMembers > maxMembers) revert InvalidMemberLimits();
        if (maxMembers > MAX_MEMBERS) revert TooManyMembers();

        uint256 potId = potCounter++;

        Pot storage pot = chainPots[potId];
        pot.name = name;
        pot.creator = msg.sender;
        pot.amountPerCycle = amountPerCycle;
        pot.cycleDuration = cycleDuration;
        pot.cycleCount = cycleCount;
        pot.frequency = frequency;
        pot.bidDepositDeadline = bidDepositDeadline;
        pot.status = PotStatus.Active;
        pot.createdAt = block.timestamp;
        pot.minMembers = minMembers;
        pot.maxMembers = maxMembers;

        pot.members.push(msg.sender);
        hasJoinedPot[potId][msg.sender] = true;
        userPots[msg.sender].push(potId);

        memberManager.updateParticipation(msg.sender, potId, 0, 0, true);

        emit PotCreated(potId, name, msg.sender, amountPerCycle);
        emit JoinedPot(potId, msg.sender);
        return potId;
    }

    function joinPot(uint256 potId) external onlyRegistered validPot(potId) whenNotPaused nonReentrant {
        Pot storage pot = chainPots[potId];
        if (pot.status != PotStatus.Active) revert PotNotActive();
        if (hasJoinedPot[potId][msg.sender]) revert AlreadyJoined();
        if (pot.members.length >= pot.maxMembers) revert PotFull();
        if (pot.completedCycles > 0 || pot.cycleIds.length > 0) revert PotAlreadyStarted();

        pot.members.push(msg.sender);
        hasJoinedPot[potId][msg.sender] = true;
        userPots[msg.sender].push(potId);

        memberManager.updateParticipation(msg.sender, potId, 0, 0, false);
        emit JoinedPot(potId, msg.sender);
    }

    function leavePot(uint256 potId) external validPot(potId) whenNotPaused nonReentrant {
        Pot storage pot = chainPots[potId];
        if (!hasJoinedPot[potId][msg.sender]) revert NotAMember();
        if (pot.cycleIds.length > 0) revert CannotLeaveAfterStarted();
        if (msg.sender == pot.creator) revert CreatorCannotLeave();

        // Remove from members array (swap-and-pop).
        for (uint256 i = 0; i < pot.members.length; i++) {
            if (pot.members[i] == msg.sender) {
                pot.members[i] = pot.members[pot.members.length - 1];
                pot.members.pop();
                break;
            }
        }
        hasJoinedPot[potId][msg.sender] = false;

        uint256[] storage userPotList = userPots[msg.sender];
        for (uint256 i = 0; i < userPotList.length; i++) {
            if (userPotList[i] == potId) {
                userPotList[i] = userPotList[userPotList.length - 1];
                userPotList.pop();
                break;
            }
        }

        memberManager.removeFromPot(msg.sender, potId);
        emit LeftPot(potId, msg.sender);
    }

    // ---- Cycle lifecycle ----

    /// @notice Start a new cycle. Only callable by creator. H-01: previous cycle must be Completed.
    function startCycle(uint256 potId) external validPot(potId) whenNotPaused nonReentrant returns (uint256) {
        Pot storage pot = chainPots[potId];
        if (msg.sender != pot.creator) revert NotPotCreator();
        if (pot.status != PotStatus.Active) revert PotNotActive();
        if (pot.members.length < pot.minMembers) revert NotEnoughMembers();
        if (pot.completedCycles >= pot.cycleCount) revert AllCyclesCompleted();

        // H-01: enforce sequential cycles.
        if (pot.cycleIds.length > 0) {
            uint256 lastCycleId = pot.cycleIds[pot.cycleIds.length - 1];
            if (auctionCycles[lastCycleId].status != CycleStatus.Completed) revert PreviousCycleNotComplete();
        }

        uint256 cycleId = cycleCounter++;
        AuctionCycle storage cycle = auctionCycles[cycleId];
        cycle.potId = potId;
        cycle.cycleId = cycleId;
        cycle.startTime = block.timestamp;
        cycle.endTime = block.timestamp + pot.cycleDuration;
        cycle.status = CycleStatus.Active;

        pot.cycleIds.push(cycleId);

        emit CycleStarted(cycleId, potId, cycle.startTime, cycle.endTime);
        return cycleId;
    }

    /// @notice Member pays their cycle contribution. AuctionEngine pulls USDC directly into Escrow (H-07).
    function payForCycle(uint256 cycleId) external validCycle(cycleId) whenNotPaused nonReentrant {
        AuctionCycle storage cycle = auctionCycles[cycleId];
        Pot storage pot = chainPots[cycle.potId];

        if (cycle.status != CycleStatus.Active) revert CycleNotActive();
        if (!hasJoinedPot[cycle.potId][msg.sender]) revert NotAMember();
        if (hasPaidForCycle[cycleId][msg.sender]) revert AlreadyPaidForCycle();

        uint256 amount = pot.amountPerCycle;

        // H-01 fix: cycle-keyed flag set BEFORE external call (effects-before-interaction).
        hasPaidForCycle[cycleId][msg.sender] = true;
        cycle.totalCollected += amount;

        // Escrow pulls USDC directly from member; AuctionEngine never holds funds.
        escrow.depositFromMember(cycle.potId, cycleId, msg.sender, amount);

        memberManager.updateParticipation(msg.sender, cycle.potId, cycleId, amount, msg.sender == pot.creator);

        emit MemberPaidForCycle(cycle.potId, cycleId, msg.sender, amount);
    }

    /// @notice Place a bid for this cycle. Lower bid = bigger discount the bidder accepts.
    function placeBid(uint256 cycleId, uint256 bidAmount)
        external
        onlyRegistered
        validCycle(cycleId)
        whenNotPaused
        nonReentrant
    {
        AuctionCycle storage cycle = auctionCycles[cycleId];
        Pot storage pot = chainPots[cycle.potId];

        if (cycle.status != CycleStatus.Active) revert CycleNotActive();
        if (!hasJoinedPot[cycle.potId][msg.sender]) revert NotAMember();
        if (!hasPaidForCycle[cycleId][msg.sender]) revert NotPaidForCycle();
        if (block.timestamp >= cycle.endTime - pot.bidDepositDeadline) revert BidDeadlinePassed();
        if (bidAmount == 0 || bidAmount >= pot.amountPerCycle * pot.members.length) revert InvalidBidAmount();

        cycle.bids[msg.sender] = bidAmount;
        cycle.bidders.add(msg.sender);

        memberManager.updateBidInfo(msg.sender, cycle.potId, cycleId, bidAmount, true);
        emit BidPlaced(cycleId, msg.sender, bidAmount);
    }

    /// @notice Close bidding. H-03: creator can call any time after the bidding deadline; any pot member
    ///         can call after `CREATOR_GRACE_PERIOD` past the bidding deadline.
    function closeBidding(uint256 cycleId) external validCycle(cycleId) whenNotPaused {
        AuctionCycle storage cycle = auctionCycles[cycleId];
        Pot storage pot = chainPots[cycle.potId];

        if (cycle.status != CycleStatus.Active) revert CycleNotActive();
        uint256 biddingClosesAt = cycle.endTime - pot.bidDepositDeadline;
        if (block.timestamp < biddingClosesAt) revert TooEarlyToClose();

        bool isCreator = msg.sender == pot.creator;
        bool isMemberAfterGrace =
            hasJoinedPot[cycle.potId][msg.sender] && block.timestamp >= biddingClosesAt + CREATOR_GRACE_PERIOD;
        if (!isCreator && !isMemberAfterGrace) revert NotAuthorizedOrTooEarly();

        cycle.status = CycleStatus.BiddingClosed;
        emit BiddingClosed(cycleId, block.timestamp);
    }

    /// @notice Declare the winner. Lowest bidder OR VRF lottery if no bids. H-03/H-04 applied.
    function declareWinner(uint256 cycleId)
        external
        validCycle(cycleId)
        whenNotPaused
        nonReentrant
        returns (address winner)
    {
        AuctionCycle storage cycle = auctionCycles[cycleId];
        Pot storage pot = chainPots[cycle.potId];

        if (cycle.status != CycleStatus.BiddingClosed) revert BiddingNotClosed();

        bool isCreator = msg.sender == pot.creator;
        bool isMemberAfterGrace =
            hasJoinedPot[cycle.potId][msg.sender] && block.timestamp >= cycle.endTime + CREATOR_GRACE_PERIOD;
        if (!isCreator && !isMemberAfterGrace) revert NotAuthorizedOrTooEarly();

        if (cycle.bidders.length() == 0) {
            // H-04: state change BEFORE external call (CEI).
            cycle.status = CycleStatus.AwaitingVRF;

            // External: request VRF.
            uint256 requestId = lotteryEngine.requestRandomWinner(pot.members);
            cycle.vrfRequestId = requestId;
            requestIdToCycle[requestId] = cycleId;

            emit VRFRequested(cycleId, requestId);
            return address(0);
        } else {
            address lowestBidder;
            uint256 lowestBid = type(uint256).max;
            uint256 n = cycle.bidders.length();
            for (uint256 i = 0; i < n; i++) {
                address bidder = cycle.bidders.at(i);
                uint256 bid = cycle.bids[bidder];
                if (bid < lowestBid) {
                    lowestBid = bid;
                    lowestBidder = bidder;
                }
            }
            cycle.winner = lowestBidder;
            cycle.winningBid = lowestBid;
            memberManager.markAsWinner(cycle.winner, cycle.potId, cycleId);
            emit WinnerDeclared(cycleId, cycle.winner, cycle.winningBid);
            return cycle.winner;
        }
    }

    /// @notice VRF callback. H-05: validates winner ∈ pot.members.
    function fulfillRandomWinner(uint256 requestId, address winner) external onlyLotteryEngine whenNotPaused {
        uint256 cycleId = requestIdToCycle[requestId];
        if (cycleId == 0) revert VRFRequestNotFound();

        AuctionCycle storage cycle = auctionCycles[cycleId];
        if (cycle.status != CycleStatus.AwaitingVRF) revert InvalidCycleStatus();
        if (cycle.winner != address(0)) revert WinnerAlreadySet();
        if (!hasJoinedPot[cycle.potId][winner]) revert WinnerNotPotMember();

        Pot storage pot = chainPots[cycle.potId];
        cycle.winner = winner;
        cycle.winningBid = pot.amountPerCycle * pot.members.length; // full pot, no discount on lottery
        cycle.status = CycleStatus.BiddingClosed;

        memberManager.markAsWinner(winner, cycle.potId, cycleId);
        emit WinnerDeclared(cycleId, winner, cycle.winningBid);
    }

    /// @notice Manual fallback if VRF callback failed. Anyone can call once fulfilled.
    function checkAndSetVRFWinner(uint256 cycleId) external validCycle(cycleId) whenNotPaused {
        AuctionCycle storage cycle = auctionCycles[cycleId];
        if (cycle.status != CycleStatus.AwaitingVRF) revert InvalidCycleStatus();
        if (cycle.vrfRequestId == 0) revert InvalidCycle();
        if (!lotteryEngine.isRequestFulfilled(cycle.vrfRequestId)) revert VRFRequestNotFound();

        address winner = lotteryEngine.getWinner(cycle.vrfRequestId);
        if (winner == address(0)) revert InvalidAddress();
        if (!hasJoinedPot[cycle.potId][winner]) revert WinnerNotPotMember();

        Pot storage pot = chainPots[cycle.potId];
        cycle.winner = winner;
        cycle.winningBid = pot.amountPerCycle * pot.members.length;
        cycle.status = CycleStatus.BiddingClosed;

        memberManager.markAsWinner(winner, cycle.potId, cycleId);
        emit WinnerDeclared(cycleId, winner, cycle.winningBid);
    }

    /// @notice Cancel a cycle stuck in AwaitingVRF after `VRF_TIMEOUT`. Refunds via remainder distribution.
    /// @dev Anyone can call after the timeout. Cycle is finalized and members get their contributions back.
    function cancelStuckVRFCycle(uint256 cycleId) external validCycle(cycleId) whenNotPaused nonReentrant {
        AuctionCycle storage cycle = auctionCycles[cycleId];
        if (cycle.status != CycleStatus.AwaitingVRF) revert InvalidCycleStatus();
        if (block.timestamp < cycle.endTime + VRF_TIMEOUT) revert VRFTimeoutNotReached();

        Pot storage pot = chainPots[cycle.potId];

        // Harvest the entire cycle balance back from Compound and refund pro-rata.
        uint256 remainder = escrow.harvestRemainder(cycle.potId, cycleId);
        if (remainder > 0) {
            uint256 perMember = remainder / pot.members.length;
            uint256 leftover = remainder - perMember * pot.members.length;
            for (uint256 i = 0; i < pot.members.length; i++) {
                uint256 amt = perMember + (i == 0 ? leftover : 0);
                if (amt > 0) escrow.distributeRemainderTo(cycle.potId, cycleId, pot.members[i], amt);
            }
        }

        cycle.status = CycleStatus.Completed;
        pot.completedCycles++;
        if (pot.completedCycles >= pot.cycleCount) {
            pot.status = PotStatus.Completed;
            emit PotStatusChanged(cycle.potId, PotStatus.Completed);
        }
        escrow.markCycleCompleted(cycle.potId, cycleId);
        emit CycleCancelled(cycleId, cycle.potId);
    }

    /// @notice Complete the cycle: pay winner, harvest discount + interest, distribute to non-winners.
    function completeCycle(uint256 cycleId) external validCycle(cycleId) whenNotPaused nonReentrant {
        AuctionCycle storage cycle = auctionCycles[cycleId];
        if (cycle.winner == address(0)) revert WinnerNotDeclared();
        if (cycle.status == CycleStatus.Completed) revert AlreadyCompleted();
        if (block.timestamp < cycle.endTime) revert CycleNotEnded();

        Pot storage pot = chainPots[cycle.potId];
        bool isCreator = msg.sender == pot.creator;
        bool isMemberAfterGrace =
            hasJoinedPot[cycle.potId][msg.sender] && block.timestamp >= cycle.endTime + CREATOR_GRACE_PERIOD;
        if (!isCreator && !isMemberAfterGrace) revert NotAuthorizedOrTooEarly();

        // Step 1: pay winner their winning bid.
        escrow.releaseFundsToWinner(cycle.potId, cycleId, cycle.winner, cycle.winningBid);

        // Step 2: harvest the cycle's remainder (residual principal + accrued interest).
        uint256 remainder = escrow.harvestRemainder(cycle.potId, cycleId);

        // Step 3 (C-01): distribute remainder pro-rata to NON-WINNERS.
        uint256 nonWinnerCount = pot.members.length - 1;
        uint256 perMember;
        uint256 leftover;
        if (remainder > 0 && nonWinnerCount > 0) {
            perMember = remainder / nonWinnerCount;
            leftover = remainder - perMember * nonWinnerCount;

            bool firstAssigned = false;
            for (uint256 i = 0; i < pot.members.length; i++) {
                address member = pot.members[i];
                if (member == cycle.winner) continue;
                uint256 amt = perMember;
                if (!firstAssigned) {
                    amt += leftover;
                    firstAssigned = true;
                }
                if (amt > 0) escrow.distributeRemainderTo(cycle.potId, cycleId, member, amt);
            }
            emit DiscountAndInterestDistributed(cycleId, remainder, perMember, leftover);
        }

        cycle.status = CycleStatus.Completed;
        pot.completedCycles++;

        // Cycle-keyed `hasPaidForCycle` doesn't need a reset — next cycle will get a new cycleId.

        if (pot.completedCycles >= pot.cycleCount) {
            pot.status = PotStatus.Completed;
            emit PotStatusChanged(cycle.potId, PotStatus.Completed);
        }
        escrow.markCycleCompleted(cycle.potId, cycleId);
        emit CycleCompleted(cycleId, cycle.potId);
    }

    // ---- Admin ----

    function pausePot(uint256 potId) external validPot(potId) {
        if (msg.sender != chainPots[potId].creator) revert NotPotCreator();
        chainPots[potId].status = PotStatus.Paused;
        emit PotStatusChanged(potId, PotStatus.Paused);
    }

    function resumePot(uint256 potId) external validPot(potId) {
        if (msg.sender != chainPots[potId].creator) revert NotPotCreator();
        chainPots[potId].status = PotStatus.Active;
        emit PotStatusChanged(potId, PotStatus.Active);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ---- Reads ----

    function getCycleInfo(uint256 cycleId)
        external
        view
        validCycle(cycleId)
        returns (
            uint256 potId,
            uint256 startTime,
            uint256 endTime,
            address winner,
            uint256 winningBid,
            CycleStatus status,
            uint256 bidderCount,
            uint256 totalCollected
        )
    {
        AuctionCycle storage c = auctionCycles[cycleId];
        return (c.potId, c.startTime, c.endTime, c.winner, c.winningBid, c.status, c.bidders.length(), c.totalCollected);
    }

    function getPotInfo(uint256 potId)
        external
        view
        validPot(potId)
        returns (
            string memory name,
            address creator,
            uint256 amountPerCycle,
            uint256 cycleDuration,
            uint256 cycleCount,
            uint256 completedCycles,
            CycleFrequency frequency,
            uint256 bidDepositDeadline,
            PotStatus status,
            address[] memory members,
            uint256[] memory cycleIds
        )
    {
        Pot storage p = chainPots[potId];
        return (
            p.name,
            p.creator,
            p.amountPerCycle,
            p.cycleDuration,
            p.cycleCount,
            p.completedCycles,
            p.frequency,
            p.bidDepositDeadline,
            p.status,
            p.members,
            p.cycleIds
        );
    }

    function getUserBid(uint256 cycleId, address user) external view validCycle(cycleId) returns (uint256) {
        return auctionCycles[cycleId].bids[user];
    }

    function getUserPots(address user) external view returns (uint256[] memory) {
        return userPots[user];
    }

    function getPotMemberCount(uint256 potId) external view validPot(potId) returns (uint256) {
        return chainPots[potId].members.length;
    }

    function isPotMember(uint256 potId, address user) external view returns (bool) {
        return hasJoinedPot[potId][user];
    }

    function getCurrentPotCount() external view returns (uint256) {
        return potCounter - 1;
    }

    function getCurrentCycleCount() external view returns (uint256) {
        return cycleCounter - 1;
    }
}
