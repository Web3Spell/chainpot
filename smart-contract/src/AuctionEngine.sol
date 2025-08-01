// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MemberAccountManager.sol";
import "./LotteryEngine.sol";
import "./Escrow.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract AuctionEngine is Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;

    MemberAccountManager public memberManager;
    LotteryEngine public lotteryEngine;
    Escrow public escrow;

    enum CycleFrequency { Monthly, BiWeekly, Weekly }
    enum PotStatus { Active, Paused, Completed }
    enum CycleStatus { Pending, Active, BiddingClosed, Completed }

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

    constructor(
        address _memberManager,
        address _lotteryEngine,
        address payable _escrow
    ) Ownable(msg.sender) {
        require(_memberManager != address(0), "Invalid member manager");
        require(_lotteryEngine != address(0), "Invalid lottery engine");
        require(_escrow != address(0), "Invalid escrow");

        memberManager = MemberAccountManager(_memberManager);
        lotteryEngine = LotteryEngine(_lotteryEngine);
        escrow = Escrow(_escrow);
    }

    modifier onlyRegistered() {
        require(memberManager.isRegistered(msg.sender), "Not registered");
        _;
    }

    modifier onlyPotCreator(uint256 potId) {
        require(chainPots[potId].creator == msg.sender, "Not pot creator");
        _;
    }

    modifier validPot(uint256 potId) {
        require(potId > 0 && potId < potCounter, "Invalid pot ID");
        require(chainPots[potId].creator != address(0), "Pot does not exist");
        _;
    }

    modifier validCycle(uint256 cycleId) {
        require(cycleId > 0 && cycleId < cycleCounter, "Invalid cycle ID");
        _;
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
        require(bytes(name).length > 0, "Name cannot be empty");
        require(amountPerCycle > 0, "Amount must be > 0");
        require(cycleDuration >= MIN_CYCLE_DURATION && cycleDuration <= MAX_CYCLE_DURATION, "Invalid cycle duration");
        require(bidDepositDeadline >= MIN_BID_DEADLINE && bidDepositDeadline < cycleDuration, "Invalid bid deadline");
        require(cycleCount > 0 && cycleCount <= 100, "Invalid cycle count");
        require(minMembers >= 2 && minMembers <= maxMembers, "Invalid member limits");
        require(maxMembers <= MAX_MEMBERS, "Too many members");

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
        require(pot.status == PotStatus.Active, "Pot not active");
        require(!hasJoinedPot[potId][msg.sender], "Already joined");
        require(pot.members.length < pot.maxMembers, "Pot is full");
        require(pot.completedCycles == 0, "Pot already started");

        pot.members.push(msg.sender);
        hasJoinedPot[potId][msg.sender] = true;
        userPots[msg.sender].push(potId);

        emit JoinedPot(potId, msg.sender);
    }

    function leavePot(uint256 potId) external validPot(potId) nonReentrant {
        Pot storage pot = chainPots[potId];
        require(hasJoinedPot[potId][msg.sender], "Not a member");
        require(pot.completedCycles == 0, "Cannot leave after pot started");
        require(msg.sender != pot.creator, "Creator cannot leave");

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
        require(pot.status == PotStatus.Active, "Pot not active");
        require(pot.members.length >= pot.minMembers, "Not enough members");
        require(pot.completedCycles < pot.cycleCount, "All cycles completed");

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
            require(member.balance >= pot.amountPerCycle, "Insufficient balance");
            
            // Update member participation
            memberManager.updateParticipation(
                member,
                potId,
                cycleId,
                pot.amountPerCycle,
                member == pot.creator
            );
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

        require(cycle.status == CycleStatus.Active, "Cycle not active");
        require(hasJoinedPot[cycle.potId][msg.sender], "Not a pot member");
        require(block.timestamp < cycle.endTime - pot.bidDepositDeadline, "Bid deadline passed");
        require(bidAmount > 0 && bidAmount <= pot.amountPerCycle, "Invalid bid amount");
        require(msg.value == bidAmount, "Incorrect payment");

        // Store bid (overwrite if user bids again)
        cycle.bids[msg.sender] = bidAmount;
        cycle.participants.add(msg.sender);

        // Update member manager
        memberManager.updateBidInfo(msg.sender, cycle.potId, cycleId, bidAmount, true);

        emit BidPlaced(cycleId, msg.sender, bidAmount);
    }

    function closeBidding(uint256 cycleId) 
        external 
        onlyPotCreator(auctionCycles[cycleId].potId) 
        validCycle(cycleId) 
    {
        AuctionCycle storage cycle = auctionCycles[cycleId];
        require(cycle.status == CycleStatus.Active, "Cycle not active");
        require(block.timestamp >= cycle.endTime - chainPots[cycle.potId].bidDepositDeadline, "Too early to close");

        cycle.status = CycleStatus.BiddingClosed;
    }

    function declareWinner(uint256 cycleId) 
        external 
        onlyPotCreator(auctionCycles[cycleId].potId) 
        validCycle(cycleId) 
    {
        AuctionCycle storage cycle = auctionCycles[cycleId];
        require(cycle.status == CycleStatus.BiddingClosed, "Bidding not closed");

        Pot storage pot = chainPots[cycle.potId];
        
        if (cycle.participants.length() == 0) {
            // No bids - use lottery
            cycle.winner = lotteryEngine.selectRandomWinner(pot.members);
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
        require(cycle.winner != address(0), "Winner not declared");
        require(cycle.status != CycleStatus.Completed, "Already completed");
        require(block.timestamp >= cycle.endTime, "Cycle not ended");
        require(!cycle.fundsReleased, "Funds already released");

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

    function getUserBid(uint256 cycleId, address user) 
        external 
        view 
        validCycle(cycleId) 
        returns (uint256) 
    {
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
        require(address(this).balance >= amount, "Insufficient balance");
        payable(owner()).transfer(amount);
    }

    receive() external payable {}
    fallback() external payable {}
}