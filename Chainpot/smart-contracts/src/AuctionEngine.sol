// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MemberAccountManager} from "./MemberAccountManager.sol";
import {LotteryEngine} from "./LotteryEngine.sol";
import {Escrow} from "./Escrow.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract AuctionEngine is Ownable, ReentrancyGuard, Pausable {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    IERC20 public immutable USDC;
    MemberAccountManager public memberManager;
    LotteryEngine public lotteryEngine;
    Escrow public escrow;

    enum CycleFrequency {
        Monthly,
        BiWeekly,
        Weekly
    }
    enum PotStatus {
        Active,
        Paused,
        Completed
    }
    enum CycleStatus {
        Pending,
        Active,
        BiddingClosed,
        AwaitingVRF,
        Completed
    }

    struct Pot {
        string name;
        address creator;
        uint256 amountPerCycle; // USDC amount (6 decimals)
        uint256 cycleDuration;
        uint256 cycleCount;
        uint256 completedCycles;
        CycleFrequency frequency;
        uint256 bidDepositDeadline; // seconds before cycle end when bidding closes
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
        mapping(address => uint256) bids; // User's bid amount (USDC)
        EnumerableSet.AddressSet bidders;
        uint256 totalCollected; // Total USDC collected from all members
        bool fundsReleased;
        uint64 vrfRequestId; // Chainlink VRF request ID for lottery
    }

    uint256 public potCounter = 1;
    uint256 public cycleCounter = 1;

    mapping(uint256 => Pot) public chainPots;
    mapping(uint256 => AuctionCycle) private auctionCycles;
    mapping(uint256 => mapping(address => bool)) public hasJoinedPot;
    mapping(uint256 => mapping(address => bool)) public hasPaidForCycle; // potId => member => paid
    mapping(address => uint256[]) public userPots;
    mapping(uint256 => uint256) public requestIdToCycle; // VRF requestId => cycleId

    // Constants
    uint256 public constant MIN_CYCLE_DURATION = 1 days;
    uint256 public constant MAX_CYCLE_DURATION = 30 days;
    uint256 public constant MIN_BID_DEADLINE = 1 hours;
    uint256 public constant MAX_MEMBERS = 100;
    uint256 public constant USDC_DECIMALS = 6;

    // Custom Errors
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
    error InvalidAmount();
    error NotEnoughMembers();
    error AllCyclesCompleted();
    error InsufficientBalance();
    error CycleNotActive();
    error BidDeadlinePassed();
    error InvalidBidAmount();
    error IncorrectPayment();
    error TooEarlyToClose();
    error BiddingNotClosed();
    error WinnerNotDeclared();
    error AlreadyCompleted();
    error CycleNotEnded();
    error FundsAlreadyReleased();
    error PotDoesNotExist();
    error CannotLeaveAfterStarted();
    error AlreadyPaidForCycle();
    error NotPaidForCycle();
    error BiddingAlreadyClosed();
    error InvalidUSDCAddress();
    error VRFNotFulfilled();
    error NotLotteryEngine();
    error InvalidCycleStatus();
    error WinnerAlreadySet();
    error VRFRequestNotFound();
    error InvalidAddress();

    // Events
    event PotCreated(uint256 indexed potId, string name, address indexed creator, uint256 amountPerCycle);
    event JoinedPot(uint256 indexed potId, address indexed user);
    event LeftPot(uint256 indexed potId, address indexed user);
    event CycleStarted(uint256 indexed cycleId, uint256 indexed potId, uint256 startTime, uint256 endTime);
    event MemberPaidForCycle(uint256 indexed potId, uint256 indexed cycleId, address indexed member, uint256 amount);
    event BidPlaced(uint256 indexed cycleId, address indexed bidder, uint256 amount);
    event BiddingClosed(uint256 indexed cycleId, uint256 timestamp);
    event WinnerDeclared(uint256 indexed cycleId, address indexed winner, uint256 amount);
    event CycleCompleted(uint256 indexed cycleId, uint256 indexed potId);
    event BidRefunded(uint256 indexed cycleId, address indexed bidder, uint256 amount);
    event InterestDistributed(uint256 indexed cycleId, uint256 totalInterest);
    event PotStatusChanged(uint256 indexed potId, PotStatus status);
    event VRFRequested(uint256 indexed cycleId, uint256 indexed requestId);

    constructor(address _usdc, address _memberManager, address _lotteryEngine, address _escrow) Ownable(msg.sender) {
        if (_usdc == address(0)) revert InvalidUSDCAddress();
        if (_memberManager == address(0)) revert InvalidAmount();
        if (_lotteryEngine == address(0)) revert InvalidAmount();
        if (_escrow == address(0)) revert InvalidAmount();

        // Verify contracts have code (except USDC which could be a token)
        if (_memberManager.code.length == 0) revert InvalidAmount();
        if (_lotteryEngine.code.length == 0) revert InvalidAmount();
        if (_escrow.code.length == 0) revert InvalidAmount();

        USDC = IERC20(_usdc);
        memberManager = MemberAccountManager(_memberManager);
        lotteryEngine = LotteryEngine(_lotteryEngine);
        escrow = Escrow(_escrow);
    }

    modifier onlyRegistered() {
        if (!memberManager.isRegistered(msg.sender)) revert NotRegistered();
        _;
    }

    modifier onlyPotCreator(uint256 potId) {
        if (chainPots[potId].creator != msg.sender) revert NotPotCreator();
        _;
    }

    modifier validPot(uint256 potId) {
        if (potId <= 0 || potId >= potCounter) revert InvalidPot();
        if (chainPots[potId].creator == address(0)) revert PotDoesNotExist();
        _;
    }

    modifier validCycle(uint256 cycleId) {
        if (cycleId <= 0 || cycleId >= cycleCounter) revert InvalidCycle();
        _;
    }

    modifier onlyLotteryEngine() {
        if (msg.sender != address(lotteryEngine)) revert NotLotteryEngine();
        _;
    }

    // -------------------- Core Logic --------------------

    /// @notice Create a new pot (ROSCA group)
    function createPot(
        string memory name,
        uint256 amountPerCycle,
        uint256 cycleDuration,
        uint256 cycleCount,
        CycleFrequency frequency,
        uint256 bidDepositDeadline,
        uint256 minMembers,
        uint256 maxMembers
    ) external onlyRegistered whenNotPaused returns (uint256) {
        if (bytes(name).length == 0) revert EmptyName();
        if (amountPerCycle <= 0) revert InvalidAmount();
        if (cycleDuration < MIN_CYCLE_DURATION || cycleDuration > MAX_CYCLE_DURATION) revert InvalidCycleDuration();
        if (bidDepositDeadline < MIN_BID_DEADLINE || bidDepositDeadline >= cycleDuration) revert InvalidBidDeadline();
        if (cycleCount <= 0 || cycleCount > 100) revert InvalidCycleCount();
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

        // Creator automatically joins
        pot.members.push(msg.sender);
        hasJoinedPot[potId][msg.sender] = true;
        userPots[msg.sender].push(potId);

        // Register with member manager
        memberManager.updateParticipation(msg.sender, potId, 0, 0, true);

        emit PotCreated(potId, name, msg.sender, amountPerCycle);
        emit JoinedPot(potId, msg.sender);
        return potId;
    }

    /// @notice Join an existing pot
    function joinPot(uint256 potId) external onlyRegistered validPot(potId) whenNotPaused nonReentrant {
        Pot storage pot = chainPots[potId];
        if (pot.status != PotStatus.Active) revert PotNotActive();
        if (hasJoinedPot[potId][msg.sender]) revert AlreadyJoined();
        if (pot.members.length >= pot.maxMembers) revert PotFull();
        if (pot.completedCycles > 0) revert PotAlreadyStarted();

        pot.members.push(msg.sender);
        hasJoinedPot[potId][msg.sender] = true;
        userPots[msg.sender].push(potId);

        memberManager.updateParticipation(msg.sender, potId, 0, 0, false);

        emit JoinedPot(potId, msg.sender);
    }

    /// @notice Leave a pot before it starts
    function leavePot(uint256 potId) external validPot(potId) whenNotPaused nonReentrant {
        Pot storage pot = chainPots[potId];
        if (!hasJoinedPot[potId][msg.sender]) revert NotAMember();
        if (pot.completedCycles > 0) revert CannotLeaveAfterStarted();
        if (msg.sender == pot.creator) revert CreatorCannotLeave();

        // Remove from members array
        for (uint256 i = 0; i < pot.members.length; i++) {
            if (pot.members[i] == msg.sender) {
                pot.members[i] = pot.members[pot.members.length - 1];
                pot.members.pop();
                break;
            }
        }

        hasJoinedPot[potId][msg.sender] = false;

        // Remove from user's pot list
        uint256[] storage userPotList = userPots[msg.sender];
        for (uint256 i = 0; i < userPotList.length; i++) {
            if (userPotList[i] == potId) {
                userPotList[i] = userPotList[userPotList.length - 1];
                userPotList.pop();
                break;
            }
        }

        emit LeftPot(potId, msg.sender);
    }

    /// @notice Start a new cycle - initializes the cycle (funds collected in payForCycle)
    function startCycle(uint256 potId)
        external
        onlyPotCreator(potId)
        validPot(potId)
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        Pot storage pot = chainPots[potId];
        if (pot.status != PotStatus.Active) revert PotNotActive();
        if (pot.members.length < pot.minMembers) revert NotEnoughMembers();
        if (pot.completedCycles >= pot.cycleCount) revert AllCyclesCompleted();

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

    /// @notice Members pay their contribution for the cycle
    /// @dev This is called by each member to pay their share for the cycle
    function payForCycle(uint256 cycleId) external validCycle(cycleId) whenNotPaused nonReentrant {
        AuctionCycle storage cycle = auctionCycles[cycleId];
        Pot storage pot = chainPots[cycle.potId];

        if (cycle.status != CycleStatus.Active) revert CycleNotActive();
        if (!hasJoinedPot[cycle.potId][msg.sender]) revert NotAMember();
        if (hasPaidForCycle[cycle.potId][msg.sender]) revert AlreadyPaidForCycle();

        uint256 amount = pot.amountPerCycle;

        // Transfer USDC from member to this contract
        USDC.safeTransferFrom(msg.sender, address(this), amount);

        // Approve and deposit to escrow (which will deposit to Compound)
        USDC.approve(address(escrow), amount);
        escrow.depositUSDC(cycle.potId, cycleId, msg.sender, amount);

        // Mark as paid
        hasPaidForCycle[cycle.potId][msg.sender] = true;
        cycle.totalCollected += amount;

        // Update member participation
        memberManager.updateParticipation(msg.sender, cycle.potId, cycleId, amount, msg.sender == pot.creator);

        emit MemberPaidForCycle(cycle.potId, cycleId, msg.sender, amount);
    }

    /// @notice Place a bid for early payout (OPTIONAL - members who want funds bid lower)
    /// @dev Lower bid = higher chance to win. Bids are in USDC (6 decimals)
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
        if (!hasPaidForCycle[cycle.potId][msg.sender]) revert NotPaidForCycle();
        if (block.timestamp >= cycle.endTime - pot.bidDepositDeadline) revert BidDeadlinePassed();
        if (bidAmount <= 0 || bidAmount > pot.amountPerCycle) revert InvalidBidAmount();

        // Store bid (overwrite if user bids again with lower amount)
        cycle.bids[msg.sender] = bidAmount;
        cycle.bidders.add(msg.sender);

        // Update member manager
        memberManager.updateBidInfo(msg.sender, cycle.potId, cycleId, bidAmount, true);

        emit BidPlaced(cycleId, msg.sender, bidAmount);
    }

    /// @notice Close bidding period
    function closeBidding(uint256 cycleId)
        external
        onlyPotCreator(auctionCycles[cycleId].potId)
        validCycle(cycleId)
        whenNotPaused
    {
        AuctionCycle storage cycle = auctionCycles[cycleId];
        Pot storage pot = chainPots[cycle.potId];

        if (cycle.status != CycleStatus.Active) revert CycleNotActive();
        if (block.timestamp < cycle.endTime - pot.bidDepositDeadline) revert TooEarlyToClose();

        cycle.status = CycleStatus.BiddingClosed;

        emit BiddingClosed(cycleId, block.timestamp);
    }

    /// @notice Declare winner - either lowest bidder or lottery winner
    function declareWinner(uint256 cycleId)
        external
        onlyPotCreator(auctionCycles[cycleId].potId)
        validCycle(cycleId)
        whenNotPaused
        returns (address winner)
    {
        AuctionCycle storage cycle = auctionCycles[cycleId];
        Pot storage pot = chainPots[cycle.potId];

        if (cycle.status != CycleStatus.BiddingClosed) revert BiddingNotClosed();

        if (cycle.bidders.length() == 0) {
            // No bids - use lottery via Chainlink VRF
            uint256 requestId = lotteryEngine.requestRandomWinner(pot.members);
            cycle.vrfRequestId = uint64(requestId);

            // Store mapping for callback
            requestIdToCycle[requestId] = cycleId;

            // Set status to AwaitingVRF - winner will be set via callback
            cycle.status = CycleStatus.AwaitingVRF;

            emit VRFRequested(cycleId, requestId);

            // Return zero address - winner will be set when VRF is fulfilled
            return address(0);
        } else {
            // Find lowest bidder
            address lowestBidder = address(0);
            uint256 lowestBid = type(uint256).max;

            for (uint256 i = 0; i < cycle.bidders.length(); i++) {
                address bidder = cycle.bidders.at(i);
                uint256 bid = cycle.bids[bidder];

                if (bid < lowestBid) {
                    lowestBid = bid;
                    lowestBidder = bidder;
                }
            }

            cycle.winner = lowestBidder;
            cycle.winningBid = lowestBid;

            // Mark as winner in member manager
            memberManager.markAsWinner(cycle.winner, cycle.potId, cycleId);

            emit WinnerDeclared(cycleId, cycle.winner, cycle.winningBid);
            return cycle.winner;
        }
    }

    /// @notice Callback from LotteryEngine when VRF is fulfilled
    /// @param requestId The VRF request ID
    /// @param winner The randomly selected winner address
    function fulfillRandomWinner(uint256 requestId, address winner) external onlyLotteryEngine whenNotPaused {
        uint256 cycleId = requestIdToCycle[requestId];
        if (cycleId == 0) revert VRFRequestNotFound();

        AuctionCycle storage cycle = auctionCycles[cycleId];

        if (cycle.status != CycleStatus.AwaitingVRF) revert InvalidCycleStatus();
        if (cycle.winner != address(0)) revert WinnerAlreadySet();

        Pot storage pot = chainPots[cycle.potId];

        // Set winner from VRF result
        cycle.winner = winner;
        cycle.winningBid = pot.amountPerCycle;
        cycle.status = CycleStatus.BiddingClosed; // Reset to BiddingClosed so completeCycle can proceed

        // Mark as winner in member manager
        memberManager.markAsWinner(cycle.winner, cycle.potId, cycleId);

        emit WinnerDeclared(cycleId, cycle.winner, cycle.winningBid);
    }

    /// @notice Check if VRF request has been fulfilled and set winner if so
    /// @dev Can be called manually if VRF was fulfilled but callback failed
    function checkAndSetVRFWinner(uint256 cycleId) external validCycle(cycleId) whenNotPaused {
        AuctionCycle storage cycle = auctionCycles[cycleId];

        if (cycle.status != CycleStatus.AwaitingVRF) revert InvalidCycleStatus();
        if (cycle.vrfRequestId == 0) revert InvalidCycle();

        if (!lotteryEngine.isRequestFulfilled(cycle.vrfRequestId)) revert VRFNotFulfilled();

        address winner = lotteryEngine.getWinner(cycle.vrfRequestId);
        if (winner == address(0)) revert InvalidAddress();

        Pot storage pot = chainPots[cycle.potId];

        cycle.winner = winner;
        cycle.winningBid = pot.amountPerCycle;
        cycle.status = CycleStatus.BiddingClosed;

        memberManager.markAsWinner(cycle.winner, cycle.potId, cycleId);

        emit WinnerDeclared(cycleId, cycle.winner, cycle.winningBid);
    }

    /// @notice Complete cycle - distribute funds to winner and interest to others
    function completeCycle(uint256 cycleId)
        external
        onlyPotCreator(auctionCycles[cycleId].potId)
        validCycle(cycleId)
        whenNotPaused
        nonReentrant
    {
        AuctionCycle storage cycle = auctionCycles[cycleId];
        if (cycle.winner == address(0)) revert WinnerNotDeclared();
        if (cycle.status == CycleStatus.Completed) revert AlreadyCompleted();
        if (block.timestamp < cycle.endTime) revert CycleNotEnded();
        if (cycle.fundsReleased) revert FundsAlreadyReleased();

        Pot storage pot = chainPots[cycle.potId];

        // Get interest earned from Compound for this cycle
        uint256 potInterest = escrow.withdrawPotInterest(cycle.potId, cycle.cycleId);

        // Release winning bid amount to winner from escrow
        escrow.releaseFundsToWinner(cycle.potId, cycle.cycleId, cycle.winner, cycle.winningBid);

        // Calculate interest share for non-winners
        uint256 nonWinnerCount = pot.members.length - 1;
        if (potInterest > 0 && nonWinnerCount > 0) {
            uint256 interestPerMember = potInterest / nonWinnerCount;
            uint256 remainder = potInterest % nonWinnerCount; // Distribute remainder to avoid loss

            // Distribute interest to non-winners
            bool remainderDistributed = false;
            for (uint256 i = 0; i < pot.members.length; i++) {
                address member = pot.members[i];
                if (member != cycle.winner) {
                    uint256 amount = interestPerMember;
                    // Distribute remainder to first non-winner
                    if (!remainderDistributed && remainder > 0) {
                        amount += remainder;
                        remainderDistributed = true;
                    }
                    if (amount > 0) {
                        escrow.withdrawInterest(cycle.potId, cycle.cycleId, member, amount);
                    }
                }
            }

            emit InterestDistributed(cycleId, potInterest);
        }

        cycle.status = CycleStatus.Completed;
        cycle.fundsReleased = true;
        pot.completedCycles++;

        // Reset payment tracking for next cycle
        for (uint256 i = 0; i < pot.members.length; i++) {
            hasPaidForCycle[cycle.potId][pot.members[i]] = false;
        }

        // Check if all cycles completed
        if (pot.completedCycles >= pot.cycleCount) {
            pot.status = PotStatus.Completed;
            emit PotStatusChanged(cycle.potId, PotStatus.Completed);
        }

        emit CycleCompleted(cycleId, cycle.potId);
    }

    // -------------------- Admin Functions --------------------

    function pausePot(uint256 potId) external onlyPotCreator(potId) validPot(potId) {
        chainPots[potId].status = PotStatus.Paused;
        emit PotStatusChanged(potId, PotStatus.Paused);
    }

    function resumePot(uint256 potId) external onlyPotCreator(potId) validPot(potId) {
        chainPots[potId].status = PotStatus.Active;
        emit PotStatusChanged(potId, PotStatus.Active);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // -------------------- View Functions --------------------

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
        AuctionCycle storage cycle = auctionCycles[cycleId];
        return (
            cycle.potId,
            cycle.startTime,
            cycle.endTime,
            cycle.winner,
            cycle.winningBid,
            cycle.status,
            cycle.bidders.length(),
            cycle.totalCollected
        );
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
        Pot storage pot = chainPots[potId];
        return (
            pot.name,
            pot.creator,
            pot.amountPerCycle,
            pot.cycleDuration,
            pot.cycleCount,
            pot.completedCycles,
            pot.frequency,
            pot.bidDepositDeadline,
            pot.status,
            pot.members,
            pot.cycleIds
        );
    }

    function getUserBid(uint256 cycleId, address user) external view validCycle(cycleId) returns (uint256) {
        return auctionCycles[cycleId].bids[user];
    }

    function hasMemberPaidForCycle(uint256 potId, address member) external view returns (bool) {
        return hasPaidForCycle[potId][member];
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

    /// @notice Get VRF request ID for a cycle
    /// @param cycleId The cycle identifier
    /// @return The VRF request ID (0 if not set)
    function getCycleVRFRequestId(uint256 cycleId) external view validCycle(cycleId) returns (uint64) {
        return auctionCycles[cycleId].vrfRequestId;
    }

    // -------------------- Emergency Functions --------------------

    function emergencyWithdrawUSDC(uint256 amount, address to) external onlyOwner whenPaused {
        if (amount <= 0) revert InvalidAmount();
        if (to == address(0)) revert InvalidAddress();
        USDC.safeTransfer(to, amount);
    }

    // Owner only helper
    function preApproveEscrow() external onlyOwner {
        USDC.approve(address(escrow), type(uint256).max);
    }
}

// deployed address: 0xEc5D1De2Aa42b2A99fA74609d01E1D3d95595eEA
// _usdc address: 0x036cbd53842c5426634e7929541ec2318f3dcf7e
// Escrow deployed address: 0x98F3371268aE0D740adc4FEFCF6E9F13a69E8A7d
// Lotery Engine: 0x79b507aDC6aBE9B81Dd4BA3340514e455693423b
// Member Manager: 0xca8E6A39d9622fbc37a7d991DDa89409a8C344dF
// approval fun : 0x9de8a523828136141405465efAaF7c6220C760DD
