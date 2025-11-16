// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @title MemberAccountManager
/// @notice Tracks user activity: pots, cycles, bids, and performance in ChainPot
contract MemberAccountManager is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;

    /// === Structs ===

    struct CycleParticipation {
        uint256 cycleId;
        uint256 contribution;
        uint256 bidAmount;
        bool didBid;
        bool won;
        uint256 timestamp;
    }

    struct PotData {
        uint256 potId;
        bool isCreator;
        EnumerableSet.UintSet cycleIds; // Use EnumerableSet for gas optimization
        mapping(uint256 => CycleParticipation) cycleParticipation; // cycleId => info
    }

    struct MemberProfile {
        bool registered;
        uint256 totalCyclesParticipated;
        uint256 totalCyclesWon;
        uint256 totalContribution;
        uint256 reputationScore;
        uint256 registrationTimestamp;
        uint256 lastActivityTimestamp;
        EnumerableSet.UintSet createdPots; // Gas-optimized
        EnumerableSet.UintSet joinedPots; // Gas-optimized
        mapping(uint256 => PotData) pots; // potId => pot details
    }

    /// === Storage ===

    mapping(address => MemberProfile) private memberProfiles;
    EnumerableSet.AddressSet private registeredMembers;
    mapping(address => bool) public authorizedCallers;

    // Constants
    uint256 public constant INITIAL_REPUTATION = 100;
    uint256 public constant REPUTATION_PARTICIPATION = 2;
    uint256 public constant REPUTATION_BID = 1;
    uint256 public constant REPUTATION_WIN = 10;

    // ===== Custom Errors =====
    error UserNotRegistered(address user);
    error NotAuthorized(address caller);
    error InvalidAddress();
    error AlreadyRegistered(address user);
    error InvalidPotId(uint256 potId);
    error InvalidCycleId(uint256 cycleId);
    error InvalidContribution(uint256 contribution);
    error InvalidAmount(uint256 amount);
    error PotNotFound(uint256 potId);
    error CycleNotFound(uint256 cycleId);
    error AlreadyMarkedWinner(uint256 potId, uint256 cycleId);

    /// === Events ===

    event MemberRegistered(address indexed user, uint256 timestamp);
    event ParticipationUpdated(
        address indexed user,
        uint256 indexed potId,
        uint256 indexed cycleId,
        uint256 contribution
    );
    event BidUpdated(
        address indexed user,
        uint256 indexed potId,
        uint256 indexed cycleId,
        uint256 bidAmount,
        bool didBid
    );
    event WinnerMarked(address indexed user, uint256 indexed potId, uint256 indexed cycleId);
    event ReputationUpdated(address indexed user, uint256 newScore, string reason);
    event AuthorizedCallerAdded(address indexed caller);
    event AuthorizedCallerRemoved(address indexed caller);

    /// === Constructor ===

    constructor() Ownable(msg.sender) {}

    /// === Modifiers ===

    modifier onlyRegistered(address user) {
        if (!memberProfiles[user].registered) revert UserNotRegistered(user);
        _;
    }

    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender] && msg.sender != owner()) {
            revert NotAuthorized(msg.sender);
        }
        _;
    }

    /// === Authorization Management ===

    function addAuthorizedCaller(address caller) external onlyOwner {
        if (caller == address(0)) revert InvalidAddress();
        authorizedCallers[caller] = true;
        emit AuthorizedCallerAdded(caller);
    }

    function removeAuthorizedCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = false;
        emit AuthorizedCallerRemoved(caller);
    }

    /// === Registration ===

    function registerMember(address user) external {
        if (user == address(0)) revert InvalidAddress();
        if (memberProfiles[user].registered) revert AlreadyRegistered(user);

        MemberProfile storage profile = memberProfiles[user];
        profile.registered = true;
        profile.reputationScore = INITIAL_REPUTATION;
        profile.registrationTimestamp = block.timestamp;
        profile.lastActivityTimestamp = block.timestamp;

        registeredMembers.add(user);

        emit MemberRegistered(user, block.timestamp);
    }

    /// === Core Functionalities ===

    /// @notice Update member participation for a pot cycle
    function updateParticipation(
        address user,
        uint256 potId,
        uint256 cycleId,
        uint256 contribution,
        bool isCreator
    ) external onlyAuthorized onlyRegistered(user) {
        if (potId == 0) revert InvalidPotId(potId);

        MemberProfile storage profile = memberProfiles[user];
        PotData storage pot = profile.pots[potId];

        // Initialize pot data if first time
        if (pot.potId == 0) {
            pot.potId = potId;
            pot.isCreator = isCreator;

            if (isCreator) {
                profile.createdPots.add(potId);
            } else {
                profile.joinedPots.add(potId);
            }
        }

        // If cycleId is 0, this is just pot joining (no cycle yet)
        if (cycleId == 0) {
            profile.lastActivityTimestamp = block.timestamp;
            return;
        }

        // Handle cycle participation
        if (cycleId != 0 && contribution != 0) {
            // Check if cycle already exists
            bool cycleExists = pot.cycleIds.contains(cycleId);

            if (!cycleExists) {
                pot.cycleIds.add(cycleId);
                profile.totalCyclesParticipated += 1;
            }

            // Update or create cycle participation
            CycleParticipation storage participation = pot.cycleParticipation[cycleId];
            participation.cycleId = cycleId;
            participation.contribution = contribution;
            participation.timestamp = block.timestamp;

            profile.totalContribution += contribution;
            profile.reputationScore += REPUTATION_PARTICIPATION;
            profile.lastActivityTimestamp = block.timestamp;

            emit ParticipationUpdated(user, potId, cycleId, contribution);
            emit ReputationUpdated(user, profile.reputationScore, "participation");
        }
    }

    /// @notice Update bid information for a cycle
    function updateBidInfo(
        address user,
        uint256 potId,
        uint256 cycleId,
        uint256 bidAmount,
        bool didBid
    ) external onlyAuthorized onlyRegistered(user) {
        if (potId == 0) revert InvalidPotId(potId);
        if (cycleId == 0) revert InvalidCycleId(cycleId);

        PotData storage pot = memberProfiles[user].pots[potId];
        if (pot.potId == 0) revert PotNotFound(potId);

        CycleParticipation storage participation = pot.cycleParticipation[cycleId];
        if (participation.cycleId == 0) revert CycleNotFound(cycleId);

        participation.bidAmount = bidAmount;
        participation.didBid = didBid;

        if (didBid) {
            memberProfiles[user].reputationScore += REPUTATION_BID;
            memberProfiles[user].lastActivityTimestamp = block.timestamp;
            
            emit ReputationUpdated(user, memberProfiles[user].reputationScore, "bid_placed");
        }

        emit BidUpdated(user, potId, cycleId, bidAmount, didBid);
    }

    /// @notice Mark a user as winner for a cycle
    function markAsWinner(
        address user,
        uint256 potId,
        uint256 cycleId
    ) external onlyAuthorized onlyRegistered(user) {
        if (potId == 0) revert InvalidPotId(potId);
        if (cycleId == 0) revert InvalidCycleId(cycleId);

        PotData storage pot = memberProfiles[user].pots[potId];
        if (pot.potId == 0) revert PotNotFound(potId);

        CycleParticipation storage participation = pot.cycleParticipation[cycleId];
        if (participation.cycleId == 0) revert CycleNotFound(cycleId);
        if (participation.won) revert AlreadyMarkedWinner(potId, cycleId);

        participation.won = true;
        memberProfiles[user].totalCyclesWon += 1;
        memberProfiles[user].reputationScore += REPUTATION_WIN;
        memberProfiles[user].lastActivityTimestamp = block.timestamp;

        emit WinnerMarked(user, potId, cycleId);
        emit ReputationUpdated(user, memberProfiles[user].reputationScore, "cycle_won");
    }

    /// === Read Functions ===

    /// @notice Get comprehensive member profile
    function getMemberProfile(address user)
        external
        view
        returns (
            bool registered,
            uint256 totalCyclesParticipated,
            uint256 totalCyclesWon,
            uint256 totalContribution,
            uint256 reputationScore,
            uint256 registrationTimestamp,
            uint256 lastActivityTimestamp,
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
            p.registrationTimestamp,
            p.lastActivityTimestamp,
            p.createdPots.values(),
            p.joinedPots.values()
        );
    }

    /// @notice Check if user is registered
    function isRegistered(address user) external view returns (bool) {
        return memberProfiles[user].registered;
    }

    /// @notice Get total number of registered members
    function getTotalMembers() external view returns (uint256) {
        return registeredMembers.length();
    }

    /// @notice Get member address by index (for iteration)
    function getMemberByIndex(uint256 index) external view returns (address) {
        return registeredMembers.at(index);
    }

    /// @notice Get cycle participation details
    function getCycleParticipation(
        address user,
        uint256 potId,
        uint256 cycleId
    ) external view returns (CycleParticipation memory) {
        return memberProfiles[user].pots[potId].cycleParticipation[cycleId];
    }

    /// @notice Get all cycle IDs for a user in a pot
    function getPotCycles(address user, uint256 potId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return memberProfiles[user].pots[potId].cycleIds.values();
    }

    /// @notice Get user's reputation score
    function getReputationScore(address user) external view returns (uint256) {
        return memberProfiles[user].reputationScore;
    }

    /// @notice Get user's win rate (in basis points)
    function getWinRate(address user) external view returns (uint256) {
        MemberProfile storage profile = memberProfiles[user];
        if (profile.totalCyclesParticipated == 0) return 0;
        return (profile.totalCyclesWon * 10000) / profile.totalCyclesParticipated;
    }

    /// @notice Check if user is pot creator
    function isPotCreator(address user, uint256 potId) external view returns (bool) {
        return memberProfiles[user].pots[potId].isCreator;
    }

    /// @notice Get user statistics
    function getUserStats(address user)
        external
        view
        returns (
            uint256 totalPots,
            uint256 totalCycles,
            uint256 totalWins,
            uint256 winRate,
            uint256 reputation
        )
    {
        MemberProfile storage profile = memberProfiles[user];
        uint256 totalPotsCount = profile.createdPots.length() + profile.joinedPots.length();
        uint256 winRateCalc = profile.totalCyclesParticipated > 0
            ? (profile.totalCyclesWon * 10000) / profile.totalCyclesParticipated
            : 0;

        return (
            totalPotsCount,
            profile.totalCyclesParticipated,
            profile.totalCyclesWon,
            winRateCalc,
            profile.reputationScore
        );
    }

    /// @notice Get list of top members by reputation
    function getTopMembers(uint256 count) 
        external 
        view 
        returns (address[] memory topMembers, uint256[] memory scores) 
    {
        uint256 totalMembers = registeredMembers.length();
        uint256 resultCount = count > totalMembers ? totalMembers : count;

        topMembers = new address[](resultCount);
        scores = new uint256[](resultCount);

        // Simple sorting - for production, consider off-chain sorting
        for (uint256 i = 0; i < resultCount; i++) {
            uint256 highestScore = 0;
            address highestMember = address(0);
            uint256 highestIndex = 0;

            for (uint256 j = 0; j < totalMembers; j++) {
                address member = registeredMembers.at(j);
                uint256 score = memberProfiles[member].reputationScore;

                // Check if not already in results
                bool alreadyAdded = false;
                for (uint256 k = 0; k < i; k++) {
                    if (topMembers[k] == member) {
                        alreadyAdded = true;
                        break;
                    }
                }

                if (!alreadyAdded && score > highestScore) {
                    highestScore = score;
                    highestMember = member;
                    highestIndex = j;
                }
            }

            if (highestMember != address(0)) {
                topMembers[i] = highestMember;
                scores[i] = highestScore;
            }
        }

        return (topMembers, scores);
    }
}

// new address: 0xca8E6A39d9622fbc37a7d991DDa89409a8C344dF
