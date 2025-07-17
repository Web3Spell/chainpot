// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MemberAccountManager.sol";
import "./LotteryEngine.sol";
import "./Escrow.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract AuctionEngine is Ownable(msg.sender) {
    using Counters for Counters.Counter;
    using EnumerableSet for EnumerableSet.AddressSet;

    MemberAccountManager public memberManager;
    LotteryEngine public lotteryEngine;
    Escrow public escrow;

    constructor(address _memberManager, address _lotteryEngine, address _escrow) {
        memberManager = MemberAccountManager(_memberManager);
        lotteryEngine = LotteryEngine(_lotteryEngine);
        escrow = Escrow(_escrow);
    }

    struct Pot {
        string name;
        uint256 amountPerCycle;
        uint256 cycleDuration;
        address[] members;
        uint256[] cycleIds;
    }

    struct AuctionCycle {
        uint256 potId;
        uint256 cycleId;
        uint256 startTime;
        uint256 endTime;
        address winner;
        uint256 lowestBid;
        address lowestBidder;
        bool settled;
        mapping(address => uint256) bids;
        EnumerableSet.AddressSet participants;
    }

    Counters.Counter private potCounter;
    Counters.Counter private cycleCounter;

    mapping(uint256 => Pot) public chainPots;
    mapping(uint256 => AuctionCycle) private auctionCycles;

    event PotCreated(uint256 indexed potId, string name);
    event CycleStarted(uint256 indexed cycleId, uint256 potId, uint256 startTime, uint256 endTime);
    event BidPlaced(uint256 indexed cycleId, address bidder, uint256 amount);
    event CycleEnded(uint256 indexed cycleId, address winner, uint256 winningBid);
    event RefundIssued(address indexed user, uint256 amount);

    modifier onlyRegistered() {
        require(memberManager.isRegistered(msg.sender), "Not registered");
        _;
    }

    function createPot(
        string memory name,
        uint256 amountPerCycle,
        uint256 cycleDuration,
        address[] memory members
    ) external onlyOwner {
        uint256 potId = potCounter.current();
        potCounter.increment();

        chainPots[potId] = Pot({
            name: name,
            amountPerCycle: amountPerCycle,
            cycleDuration: cycleDuration,
            members: members,
            cycleIds: new uint256[](0)
        });

        emit PotCreated(potId, name);
    }

    function startCycle(uint256 potId) external onlyOwner {
        require(bytes(chainPots[potId].name).length != 0, "Invalid pot");

        uint256 cycleId = cycleCounter.current();
        cycleCounter.increment();

        AuctionCycle storage cycle = auctionCycles[cycleId];
        cycle.potId = potId;
        cycle.cycleId = cycleId;
        cycle.startTime = block.timestamp;
        cycle.endTime = block.timestamp + chainPots[potId].cycleDuration;
        cycle.lowestBid = type(uint256).max;

        chainPots[potId].cycleIds.push(cycleId);

        // Deposit from each member
        for (uint256 i = 0; i < chainPots[potId].members.length; i++) {
            address member = chainPots[potId].members[i];
            escrow.deposit{value: chainPots[potId].amountPerCycle}(potId, cycleId, member);
        }

        emit CycleStarted(cycleId, potId, cycle.startTime, cycle.endTime);
    }

    function placeBid(uint256 cycleId) external payable onlyRegistered {
        AuctionCycle storage cycle = auctionCycles[cycleId];
        require(block.timestamp < cycle.endTime, "Cycle ended");

        require(msg.value > 0, "Bid cannot be zero");
        require(msg.value <= chainPots[cycle.potId].amountPerCycle, "Bid too high");

        cycle.bids[msg.sender] = msg.value;
        cycle.participants.add(msg.sender);

        if (msg.value < cycle.lowestBid) {
            cycle.lowestBid = msg.value;
            cycle.lowestBidder = msg.sender;
        }

        emit BidPlaced(cycleId, msg.sender, msg.value);
    }
    
function endCycle(uint256 cycleId) external onlyOwner {
    AuctionCycle storage cycle = auctionCycles[cycleId];
    require(!cycle.settled, "Already settled");
    require(block.timestamp >= cycle.endTime, "Cycle ongoing");

    Pot memory pot = chainPots[cycle.potId];
    uint256 totalFund = pot.amountPerCycle * pot.members.length;

    if (cycle.lowestBidder == address(0)) {
        // No bids received – fallback to lottery
        address randomWinner = lotteryEngine.selectRandomWinner(pot.members);
        cycle.winner = randomWinner;
        cycle.lowestBid = totalFund;
    } else {
        cycle.winner = cycle.lowestBidder;
    }

    // Release funds to winner
    escrow.releaseFundsToWinner(cycle.lowestBid, payable(cycle.winner));

    // Refund profit (interest) equally to all others
    uint256 interest = totalFund - cycle.lowestBid;
    uint256 sharePerMember = pot.members.length > 1 ? interest / (pot.members.length - 1) : 0;

    // Prepare arrays for releaseInterestToContributors
    uint256[] memory depositIds = new uint256[](pot.members.length - 1);
    address[] memory recipients = new address[](pot.members.length - 1);
    uint256[] memory amounts = new uint256[](pot.members.length - 1);

    uint256 recipientIndex = 0;
    for (uint256 i = 0; i < pot.members.length; i++) {
        address member = pot.members[i];
        if (member != cycle.winner) {
            depositIds[recipientIndex] = i; // Assuming depositId is the index or some unique identifier
            recipients[recipientIndex] = member;
            amounts[recipientIndex] = sharePerMember;
            recipientIndex++;
        }
    }

    // Call releaseInterestToContributors with the prepared arrays
    escrow.releaseInterestToContributors(depositIds, recipients, amounts);

    // Emit RefundIssued events
    for (uint256 i = 0; i < recipients.length; i++) {
        emit RefundIssued(recipients[i], amounts[i]);
    }

    cycle.settled = true;

    memberManager.updateCycleParticipation(cycle.winner, cycle.lowestBid, cycleId);
    memberManager.markAsWinner(cycle.winner, cycleId);

    emit CycleEnded(cycleId, cycle.winner, cycle.lowestBid);
}

    function getCycleWinner(uint256 cycleId) external view returns (address, uint256) {
        AuctionCycle storage cycle = auctionCycles[cycleId];
        return (cycle.winner, cycle.lowestBid);
    }

    function getPotInfo(uint256 potId) external view returns (
        string memory,
        uint256,
        uint256,
        address[] memory,
        uint256[] memory
    ) {
        Pot memory pot = chainPots[potId];
        return (
            pot.name,
            pot.amountPerCycle,
            pot.cycleDuration,
            pot.members,
            pot.cycleIds
        );
    }

    receive() external payable {}
}
