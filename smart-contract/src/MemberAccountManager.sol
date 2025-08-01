// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @title MemberAccountManager
/// @notice Tracks user activity: pots, cycles, bids, and performance in ChainPot
contract MemberAccountManager is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    /// === Structs ===

    struct CycleParticipation {
        uint256 cycleId;
        uint256 contribution;
        uint256 bidAmount;
        bool didBid;
        bool won;
    }

    struct PotData {
        uint256 potId;
        bool isCreator;
        uint256[] cycleIds;
        mapping(uint256 => CycleParticipation) cycleParticipation; // cycleId => info
    }

    struct MemberProfile {
        bool registered;
        uint256 totalCyclesParticipated;
        uint256 totalCyclesWon;
        uint256 totalContribution;
        uint256 reputationScore;
        uint256 lastJoinedTimestamp;
        uint256[] createdPots;
        uint256[] joinedPots;
        mapping(uint256 => PotData) pots; // potId => pot details
    }

    /// === Storage ===

    mapping(address => MemberProfile) private memberProfiles;
    EnumerableSet.AddressSet private registeredMembers;
    mapping(address => bool) public authorizedCallers;

    /// === Events ===

    event MemberRegistered(address indexed user);
    event ParticipationUpdated(address indexed user, uint256 potId, uint256 cycleId);
    event BidUpdated(address indexed user, uint256 potId, uint256 cycleId, uint256 bidAmount, bool didBid);
    event WinnerMarked(address indexed user, uint256 potId, uint256 cycleId);
    event PotFundingUpdated(address indexed user, uint256 potId, uint256 cycleId, uint256 amount);
    event AuthorizedCallerAdded(address indexed caller);
    event AuthorizedCallerRemoved(address indexed caller);

    /// === Constructor ===

    constructor() Ownable(msg.sender) {}

    /// === Modifiers ===

    modifier onlyRegistered(address user) {
        require(memberProfiles[user].registered, "User not registered");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    /// === Authorization Management ===

    function addAuthorizedCaller(address caller) external onlyOwner {
        require(caller != address(0), "Invalid address");
        authorizedCallers[caller] = true;
        emit AuthorizedCallerAdded(caller);
    }

    function removeAuthorizedCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = false;
        emit AuthorizedCallerRemoved(caller);
    }

    /// === Registration ===

    function registerMember(address user) external {
        require(user != address(0), "Invalid address");
        require(!memberProfiles[user].registered, "Already registered");

        MemberProfile storage profile = memberProfiles[user];
        profile.registered = true;
        profile.reputationScore = 100; // Starting reputation
        profile.lastJoinedTimestamp = block.timestamp;

        registeredMembers.add(user);

        emit MemberRegistered(user);
    }

    /// === Core Functionalities ===

    function updateParticipation(
        address user,
        uint256 potId,
        uint256 cycleId,
        uint256 contribution,
        bool isCreator
    ) external onlyAuthorized onlyRegistered(user) {
        require(potId > 0, "Invalid pot ID");
        require(cycleId > 0, "Invalid cycle ID");
        require(contribution > 0, "Invalid contribution");

        MemberProfile storage profile = memberProfiles[user];
        PotData storage pot = profile.pots[potId];

        // Initialize pot data if first time
        if (pot.potId == 0) {
            pot.potId = potId;
            pot.isCreator = isCreator;
            
            if (isCreator) {
                profile.createdPots.push(potId);
            } else {
                profile.joinedPots.push(potId);
            }
        }

        // Check if cycle already exists
        bool cycleExists = false;
        for (uint256 i = 0; i < pot.cycleIds.length; i++) {
            if (pot.cycleIds[i] == cycleId) {
                cycleExists = true;
                break;
            }
        }

        if (!cycleExists) {
            pot.cycleIds.push(cycleId);
            profile.totalCyclesParticipated += 1;
        }

        pot.cycleParticipation[cycleId] = CycleParticipation({
            cycleId: cycleId,
            contribution: contribution,
            bidAmount: 0,
            didBid: false,
            won: false
        });

        profile.totalContribution += contribution;
        profile.reputationScore += 2;
        profile.lastJoinedTimestamp = block.timestamp;

        emit ParticipationUpdated(user, potId, cycleId);
    }

    function updatePotFundingDetails(
        address user,
        uint256 potId,
        uint256 cycleId,
        uint256 amount
    ) external onlyAuthorized onlyRegistered(user) {
        require(amount > 0, "Invalid amount");
        
        PotData storage pot = memberProfiles[user].pots[potId];
        require(pot.potId != 0, "Pot not found");
        
        CycleParticipation storage participation = pot.cycleParticipation[cycleId];
        require(participation.cycleId != 0, "Cycle not found");
        
        uint256 oldContribution = participation.contribution;
        participation.contribution = amount;
        
        // Update total contribution
        memberProfiles[user].totalContribution = 
            memberProfiles[user].totalContribution - oldContribution + amount;

        emit PotFundingUpdated(user, potId, cycleId, amount);
    }

    function updateBidInfo(
        address user,
        uint256 potId,
        uint256 cycleId,
        uint256 bidAmount,
        bool didBid
    ) external onlyAuthorized onlyRegistered(user) {
        PotData storage pot = memberProfiles[user].pots[potId];
        require(pot.potId != 0, "Pot not found");
        
        CycleParticipation storage participation = pot.cycleParticipation[cycleId];
        require(participation.cycleId != 0, "Cycle not found");
        
        participation.bidAmount = bidAmount;
        participation.didBid = didBid;

        if (didBid) {
            memberProfiles[user].reputationScore += 1;
        }

        emit BidUpdated(user, potId, cycleId, bidAmount, didBid);
    }

    function markAsWinner(
        address user,
        uint256 potId,
        uint256 cycleId
    ) external onlyAuthorized onlyRegistered(user) {
        PotData storage pot = memberProfiles[user].pots[potId];
        require(pot.potId != 0, "Pot not found");
        
        CycleParticipation storage participation = pot.cycleParticipation[cycleId];
        require(participation.cycleId != 0, "Cycle not found");
        require(!participation.won, "Already marked as winner");
        
        participation.won = true;
        memberProfiles[user].totalCyclesWon += 1;
        memberProfiles[user].reputationScore += 10; // Bonus for winning

        emit WinnerMarked(user, potId, cycleId);
    }

    /// === Read Functions ===

    function getMemberProfile(address user)
        external
        view
        returns (
            bool registered,
            uint256 totalCyclesParticipated,
            uint256 totalCyclesWon,
            uint256 totalContribution,
            uint256 reputationScore,
            uint256 lastJoinedTimestamp,
            uint256[] memory createdPots,
            uint256[] memory joinedPots
        )
    {
        MemberProfile storage p = memberProfiles[user];
        return (
            p.registered,
            p.totalCyclesParticipated,
            p.totalCyclesWon,
            p.totalContribution,
            p.reputationScore,
            p.lastJoinedTimestamp,
            p.createdPots,
            p.joinedPots
        );
    }

    function isRegistered(address user) external view returns (bool) {
        return memberProfiles[user].registered;
    }

    function getTotalMembers() external view returns (uint256) {
        return registeredMembers.length();
    }

    function getMemberByIndex(uint256 index) external view returns (address) {
        require(index < registeredMembers.length(), "Index out of bounds");
        return registeredMembers.at(index);
    }

    function getCycleParticipation(address user, uint256 potId, uint256 cycleId)
        external
        view
        returns (CycleParticipation memory)
    {
        return memberProfiles[user].pots[potId].cycleParticipation[cycleId];
    }

    function getPotCycles(address user, uint256 potId)
        external
        view
        returns (uint256[] memory)
    {
        return memberProfiles[user].pots[potId].cycleIds;
    }

    function getReputationScore(address user) external view returns (uint256) {
        return memberProfiles[user].reputationScore;
    }

    function getWinRate(address user) external view returns (uint256) {
        MemberProfile storage profile = memberProfiles[user];
        if (profile.totalCyclesParticipated == 0) return 0;
        return (profile.totalCyclesWon * 10000) / profile.totalCyclesParticipated; // Basis points
    }
}