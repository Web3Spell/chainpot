// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @title MemberAccountManagerV3
/// @notice Tracks user activity in ChainPot pots/cycles. Self-registration only (H-06).
contract MemberAccountManagerV3 is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;

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
        EnumerableSet.UintSet cycleIds;
        mapping(uint256 => CycleParticipation) cycleParticipation;
    }

    struct MemberProfile {
        bool registered;
        uint256 totalCyclesParticipated;
        uint256 totalCyclesWon;
        uint256 totalContribution;
        uint256 reputationScore;
        uint256 registrationTimestamp;
        uint256 lastActivityTimestamp;
        EnumerableSet.UintSet createdPots;
        EnumerableSet.UintSet joinedPots;
        mapping(uint256 => PotData) pots;
    }

    mapping(address => MemberProfile) private memberProfiles;
    EnumerableSet.AddressSet private registeredMembers;
    mapping(address => bool) public authorizedCallers;

    uint256 public constant INITIAL_REPUTATION = 100;
    uint256 public constant REPUTATION_PARTICIPATION = 2;
    uint256 public constant REPUTATION_BID = 1;
    uint256 public constant REPUTATION_WIN = 10;
    uint256 public constant REPUTATION_DEFAULT_PENALTY = 25;

    error UserNotRegistered(address user);
    error NotAuthorized(address caller);
    error InvalidAddress();
    error AlreadyRegistered(address user);
    error InvalidPotId();
    error InvalidCycleId();
    error PotNotFound(uint256 potId);
    error CycleNotFound(uint256 cycleId);
    error AlreadyMarkedWinner(uint256 potId, uint256 cycleId);
    error SelfRegistrationOnly();

    event MemberRegistered(address indexed user, uint256 timestamp);
    event ParticipationUpdated(address indexed user, uint256 indexed potId, uint256 indexed cycleId, uint256 contribution);
    event BidUpdated(address indexed user, uint256 indexed potId, uint256 indexed cycleId, uint256 bidAmount, bool didBid);
    event WinnerMarked(address indexed user, uint256 indexed potId, uint256 indexed cycleId);
    event MemberDefaulted(address indexed user, uint256 indexed potId, uint256 indexed cycleId);
    event ReputationUpdated(address indexed user, uint256 newScore, string reason);
    event AuthorizedCallerAdded(address indexed caller);
    event AuthorizedCallerRemoved(address indexed caller);
    event MemberLeftPot(address indexed user, uint256 indexed potId);

    constructor() Ownable(msg.sender) {}

    modifier onlyRegistered(address user) {
        if (!memberProfiles[user].registered) revert UserNotRegistered(user);
        _;
    }

    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender] && msg.sender != owner()) revert NotAuthorized(msg.sender);
        _;
    }

    // ---- Authorization ----

    function addAuthorizedCaller(address caller) external onlyOwner {
        if (caller == address(0)) revert InvalidAddress();
        authorizedCallers[caller] = true;
        emit AuthorizedCallerAdded(caller);
    }

    function removeAuthorizedCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = false;
        emit AuthorizedCallerRemoved(caller);
    }

    // ---- Registration (H-06: self only) ----

    /// @notice Register the caller as a member. Anyone can register themselves; you cannot register others.
    function registerMember() external {
        address user = msg.sender;
        if (memberProfiles[user].registered) revert AlreadyRegistered(user);

        MemberProfile storage profile = memberProfiles[user];
        profile.registered = true;
        profile.reputationScore = INITIAL_REPUTATION;
        profile.registrationTimestamp = block.timestamp;
        profile.lastActivityTimestamp = block.timestamp;

        registeredMembers.add(user);
        emit MemberRegistered(user, block.timestamp);
    }

    /// @notice Backwards-compatible single-arg form: only allowed if user == msg.sender.
    function registerMember(address user) external {
        if (user != msg.sender) revert SelfRegistrationOnly();
        if (memberProfiles[user].registered) revert AlreadyRegistered(user);

        MemberProfile storage profile = memberProfiles[user];
        profile.registered = true;
        profile.reputationScore = INITIAL_REPUTATION;
        profile.registrationTimestamp = block.timestamp;
        profile.lastActivityTimestamp = block.timestamp;

        registeredMembers.add(user);
        emit MemberRegistered(user, block.timestamp);
    }

    // ---- Core ----

    function updateParticipation(address user, uint256 potId, uint256 cycleId, uint256 contribution, bool isCreator)
        external
        onlyAuthorized
        onlyRegistered(user)
    {
        if (potId == 0) revert InvalidPotId();

        MemberProfile storage profile = memberProfiles[user];
        PotData storage pot = profile.pots[potId];

        if (pot.potId == 0) {
            pot.potId = potId;
            pot.isCreator = isCreator;
            if (isCreator) profile.createdPots.add(potId);
            else profile.joinedPots.add(potId);
        }

        if (cycleId == 0) {
            profile.lastActivityTimestamp = block.timestamp;
            return;
        }

        if (contribution > 0) {
            bool cycleExists = pot.cycleIds.contains(cycleId);
            if (!cycleExists) {
                pot.cycleIds.add(cycleId);
                profile.totalCyclesParticipated += 1;
            }

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

    function updateBidInfo(address user, uint256 potId, uint256 cycleId, uint256 bidAmount, bool didBid)
        external
        onlyAuthorized
        onlyRegistered(user)
    {
        if (potId == 0) revert InvalidPotId();
        if (cycleId == 0) revert InvalidCycleId();

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

    function markAsWinner(address user, uint256 potId, uint256 cycleId)
        external
        onlyAuthorized
        onlyRegistered(user)
    {
        if (potId == 0) revert InvalidPotId();
        if (cycleId == 0) revert InvalidCycleId();

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

    /// @notice Penalize reputation for failing to pay a cycle.
    function markAsDefaulter(address user, uint256 potId, uint256 cycleId) external onlyAuthorized {
        if (potId == 0) revert InvalidPotId();
        if (cycleId == 0) revert InvalidCycleId();

        MemberProfile storage profile = memberProfiles[user];
        if (profile.reputationScore >= REPUTATION_DEFAULT_PENALTY) {
            profile.reputationScore -= REPUTATION_DEFAULT_PENALTY;
        } else {
            profile.reputationScore = 0;
        }
        emit MemberDefaulted(user, potId, cycleId);
        emit ReputationUpdated(user, profile.reputationScore, "default");
    }

    /// @notice Clean up when a member leaves a pot before it starts (M-03).
    function removeFromPot(address user, uint256 potId) external onlyAuthorized {
        MemberProfile storage profile = memberProfiles[user];
        profile.joinedPots.remove(potId);
        delete profile.pots[potId].potId;
        emit MemberLeftPot(user, potId);
    }

    // ---- Reads ----

    function isRegistered(address user) external view returns (bool) {
        return memberProfiles[user].registered;
    }

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

    function getCycleParticipation(address user, uint256 potId, uint256 cycleId)
        external
        view
        returns (CycleParticipation memory)
    {
        return memberProfiles[user].pots[potId].cycleParticipation[cycleId];
    }

    function getPotCycles(address user, uint256 potId) external view returns (uint256[] memory) {
        return memberProfiles[user].pots[potId].cycleIds.values();
    }

    function getReputationScore(address user) external view returns (uint256) {
        return memberProfiles[user].reputationScore;
    }

    function getTotalMembers() external view returns (uint256) {
        return registeredMembers.length();
    }

    function getMemberByIndex(uint256 index) external view returns (address) {
        return registeredMembers.at(index);
    }

    function isPotCreator(address user, uint256 potId) external view returns (bool) {
        return memberProfiles[user].pots[potId].isCreator;
    }
}
