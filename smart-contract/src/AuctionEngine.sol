// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MemberAccountManager} from "./MemberAccountManager.sol";
import {LotteryEngine} from "./LotteryEngine.sol";
import {Escrow} from "./Escrow.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract AuctionEngine is Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;

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
        Completed
    }

    struct Pot {
        string name;
        address creator;
        uint256 amountPerCycle;
        uint256 cycleDuration;
        uint256 cycleCount;
        uint256 completedCycles;
        CycleFrequency frequency;
        uint256 bidDepositDeadline; // in seconds before cycle end
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
        address lowestBidder;
        CycleStatus status;
        mapping(address => uint256) bids;
        EnumerableSet.AddressSet participants;
        uint256 totalDeposited;
        bool fundsReleased;
    }

    uint256 public potCounter = 1;
    uint256 public cycleCounter = 1;

    mapping(uint256 => Pot) public chainPots;
    mapping(uint256 => AuctionCycle) private auctionCycles;
    mapping(uint256 => mapping(address => bool)) public hasJoinedPot;
    mapping(address => uint256[]) public userPots;

    // Constants
    uint256 public constant MIN_CYCLE_DURATION = 1 days;
    uint256 public constant MAX_CYCLE_DURATION = 30 days;
    uint256 public constant MIN_BID_DEADLINE = 1 hours;
    uint256 public constant MAX_MEMBERS = 100;

    //Custom Errors
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
    error InsufficientContractBalance();
    error InvalidMemberManager();
    error InvalidLotteryEngine();
    error InvalidEscrow();
    error PotDoesNotExist();
    error PotIsFull();
    error CannotLeaveAfterStarted();
    error NotAPotMember();

    // -------------------- Events --------------------
    event PotCreated(uint256 indexed potId, string name, address indexed creator, uint256 amountPerCycle);
    event JoinedPot(uint256 indexed potId, address indexed user);
    event LeftPot(uint256 indexed potId, address indexed user);
    event CycleStarted(uint256 indexed cycleId, uint256 indexed potId, uint256 startTime, uint256 endTime);
    event BidPlaced(uint256 indexed cycleId, address indexed bidder, uint256 amount);
    event WinnerDeclared(uint256 indexed cycleId, address indexed winner, uint256 amount);
    event CycleCompleted(uint256 indexed cycleId, uint256 indexed potId);
    event RefundIssued(address indexed user, uint256 amount);
    event PotStatusChanged(uint256 indexed potId, PotStatus status);

    constructor(address _memberManager, address _lotteryEngine, address payable _escrow) Ownable(msg.sender) {
        if (_memberManager == address(0)) revert InvalidMemberManager();
        if (_lotteryEngine == address(0)) revert InvalidLotteryEngine();
        if (_escrow == address(0)) revert InvalidEscrow();

        memberManager = MemberAccountManager(_memberManager);
        lotteryEngine = LotteryEngine(payable(_lotteryEngine));
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
        _validCycle(cycleId);
        _;
    }

    function _validCycle(uint256 cycleId) internal view {
        if (cycleId <= 0 || cycleId >= cycleCounter) revert InvalidCycle();
    }

    // -------------------- Core Logic --------------------

    function createPot(
        string memory name,
        uint256 amountPerCycle,
        uint256 cycleDuration,
        uint256 cycleCount,
        CycleFrequency frequency,
        uint256 bidDepositDeadline,
        uint256 minMembers,
        uint256 maxMembers
    ) external onlyRegistered returns (uint256) {
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

    function joinPot(uint256 potId) external onlyRegistered validPot(potId) nonReentrant {
        Pot storage pot = chainPots[potId];
        if (pot.status != PotStatus.Active) revert PotNotActive();
        if (hasJoinedPot[potId][msg.sender]) revert AlreadyJoined();
        if (pot.members.length >= pot.maxMembers) revert PotIsFull();
        if (pot.completedCycles > 0) revert PotAlreadyStarted();

        pot.members.push(msg.sender);
        hasJoinedPot[potId][msg.sender] = true;
        userPots[msg.sender].push(potId);

        emit JoinedPot(potId, msg.sender);
    }

    function leavePot(uint256 potId) external validPot(potId) nonReentrant {
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

    function startCycle(uint256 potId) external onlyPotCreator(potId) validPot(potId) nonReentrant {
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

        // Collect deposits from all members
        for (uint256 i = 0; i < pot.members.length; i++) {
            address member = pot.members[i];
            if (member.balance < pot.amountPerCycle) revert InsufficientBalance();

            // Update member participation
            memberManager.updateParticipation(member, potId, cycleId, pot.amountPerCycle, member == pot.creator);
        }

        cycle.totalDeposited = pot.amountPerCycle * pot.members.length;

        emit CycleStarted(cycleId, potId, cycle.startTime, cycle.endTime);
    }

    function placeBid(uint256 cycleId, uint256 bidAmount)
        external
        payable
        onlyRegistered
        validCycle(cycleId)
        nonReentrant
    {
        AuctionCycle storage cycle = auctionCycles[cycleId];
        Pot storage pot = chainPots[cycle.potId];

        if (cycle.status != CycleStatus.Active) revert CycleNotActive();
        if (!hasJoinedPot[cycle.potId][msg.sender]) revert NotAPotMember();
        if (block.timestamp >= cycle.endTime - pot.bidDepositDeadline) revert BidDeadlinePassed();
        if (bidAmount <= 0 || bidAmount > pot.amountPerCycle) revert InvalidBidAmount();
        if (msg.value != bidAmount) revert IncorrectPayment();

        // Store bid (overwrite if user bids again)
        cycle.bids[msg.sender] = bidAmount;
        cycle.participants.add(msg.sender);

        // Update member manager
        memberManager.updateBidInfo(msg.sender, cycle.potId, cycleId, bidAmount, true);

        emit BidPlaced(cycleId, msg.sender, bidAmount);
    }

    function closeBidding(uint256 cycleId) external onlyPotCreator(auctionCycles[cycleId].potId) validCycle(cycleId) {
        AuctionCycle storage cycle = auctionCycles[cycleId];
        if (cycle.status != CycleStatus.Active) revert CycleNotActive();
        if (block.timestamp < cycle.endTime - chainPots[cycle.potId].bidDepositDeadline) revert TooEarlyToClose();

        cycle.status = CycleStatus.BiddingClosed;
    }

    function declareWinner(uint256 cycleId) external onlyPotCreator(auctionCycles[cycleId].potId) validCycle(cycleId) {
        AuctionCycle storage cycle = auctionCycles[cycleId];
        if (cycle.status != CycleStatus.BiddingClosed) revert BiddingNotClosed();

        Pot storage pot = chainPots[cycle.potId];

        if (cycle.participants.length() == 0) {
            // No bids - use lottery
            cycle.winner = lotteryEngine.previewRandomWinner(pot.members);
            cycle.winningBid = pot.amountPerCycle;
        } else {
            // Find lowest bidder
            address lowestBidder = address(0);
            uint256 lowestBid = type(uint256).max;

            for (uint256 i = 0; i < cycle.participants.length(); i++) {
                address participant = cycle.participants.at(i);
                uint256 bid = cycle.bids[participant];

                if (bid < lowestBid) {
                    lowestBid = bid;
                    lowestBidder = participant;
                }
            }

            cycle.winner = lowestBidder;
            cycle.winningBid = lowestBid;
        }

        // Mark as winner in member manager
        memberManager.markAsWinner(cycle.winner, cycle.potId, cycleId);

        emit WinnerDeclared(cycleId, cycle.winner, cycle.winningBid);
    }

    function completeCycle(uint256 cycleId)
        external
        onlyPotCreator(auctionCycles[cycleId].potId)
        validCycle(cycleId)
        nonReentrant
    {
        AuctionCycle storage cycle = auctionCycles[cycleId];
        if (cycle.winner == address(0)) revert WinnerNotDeclared();
        if (cycle.status == CycleStatus.Completed) revert AlreadyCompleted();
        if (block.timestamp < cycle.endTime) revert CycleNotEnded();
        if (cycle.fundsReleased) revert FundsAlreadyReleased();

        Pot storage pot = chainPots[cycle.potId];
        uint256 totalFund = cycle.totalDeposited;

        // Release winning amount to winner
        escrow.releaseFundsToWinner(cycle.winningBid, payable(cycle.winner));

        // Calculate and distribute interest to non-winners
        uint256 interest = totalFund - cycle.winningBid;
        if (interest > 0 && pot.members.length > 1) {
            uint256 sharePerMember = interest / (pot.members.length - 1);

            for (uint256 i = 0; i < pot.members.length; i++) {
                address member = pot.members[i];
                if (member != cycle.winner && sharePerMember > 0) {
                    escrow.withdrawFunds(sharePerMember, member);
                    emit RefundIssued(member, sharePerMember);
                }
            }
        }

        cycle.status = CycleStatus.Completed;
        cycle.fundsReleased = true;
        pot.completedCycles++;

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
            uint256 participantCount,
            uint256 totalDeposited
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
            cycle.participants.length(),
            cycle.totalDeposited
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

    // -------------------- Emergency Functions --------------------

    function emergencyWithdraw(uint256 amount) external onlyOwner {
        if (address(this).balance < amount) revert InsufficientBalance();
        payable(owner()).transfer(amount);
    }

    receive() external payable {}
    fallback() external payable {}
}
