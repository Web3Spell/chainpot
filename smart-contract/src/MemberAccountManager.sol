// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @title MemberAccountManager
/// @notice Handles member registration, profile tracking, and reputation scoring in BlockCircle
contract MemberAccountManager is Ownable(msg.sender) {
    using EnumerableSet for EnumerableSet.AddressSet;

    /// @dev Struct for member profile
    struct MemberProfile {
        bool registered;
        uint256 totalCyclesParticipated;
        uint256 totalCyclesWon;
        uint256 totalContribution;
        uint256 reputationScore;
        uint256 lastJoinedTimestamp;
        uint256[] cyclesParticipated;
        uint256[] cyclesWon;
        uint256[] cyclesCreated;
    }

    /// @dev Mapping of user address to profile
    mapping(address => MemberProfile) private memberProfiles;

    /// @dev Set to track registered members
    EnumerableSet.AddressSet private registeredMembers;

    /// Events
    event MemberRegistered(address indexed user);
    event MemberProfileUpdated(address indexed user, uint256 newReputation);

    /// Modifier to check if user is registered
    modifier onlyRegistered(address user) {
        require(memberProfiles[user].registered, "User not registered");
        _;
    }

    /// Register a new member
 function registerMember() external {
    require(!memberProfiles[msg.sender].registered, "Already registered");

    memberProfiles[msg.sender] = MemberProfile({
        registered: true,
        totalCyclesParticipated: 0,
        totalCyclesWon: 0,
        totalContribution: 0,
        reputationScore: 0,
        lastJoinedTimestamp: block.timestamp,
        cyclesParticipated: new uint256[](0),
        cyclesWon: new uint256[](0),
        cyclesCreated: new uint256[](0)
    });

    registeredMembers.add(msg.sender);

    emit MemberRegistered(msg.sender);
}
    /// Called after user contributes in a cycle
    function updateCycleParticipation(
        address user,
        uint256 contributionAmount,
        uint256 cycleId
    ) external onlyOwner onlyRegistered(user) {
        MemberProfile storage profile = memberProfiles[user];
        profile.totalCyclesParticipated += 1;
        profile.totalContribution += contributionAmount;
        profile.reputationScore += 2;
        profile.lastJoinedTimestamp = block.timestamp;
        profile.cyclesParticipated.push(cycleId);

        emit MemberProfileUpdated(user, profile.reputationScore);
    }

    /// Called when user wins a cycle
    function markAsWinner(address user, uint256 cycleId)
        external
        onlyOwner
        onlyRegistered(user)
    {
        MemberProfile storage profile = memberProfiles[user];
        profile.totalCyclesWon += 1;
        profile.reputationScore += 1;
        profile.cyclesWon.push(cycleId);

        emit MemberProfileUpdated(user, profile.reputationScore);
    }

    /// Called when user creates a pool
    function recordCreatedCycle(address user, uint256 cycleId)
        external
        onlyOwner
        onlyRegistered(user)
    {
        memberProfiles[user].cyclesCreated.push(cycleId);
    }

    /// Get complete profile of a user
    function getMemberProfile(address user)
        external
        view
        returns (MemberProfile memory)
    {
        return memberProfiles[user];
    }

    /// Check if a user is registered
    function isRegistered(address user) external view returns (bool) {
        return memberProfiles[user].registered;
    }

    /// Get total number of registered users
    function getTotalMembers() external view returns (uint256) {
        return registeredMembers.length();
    }

    /// Get member address by index
    function getMemberByIndex(uint256 index) external view returns (address) {
        return registeredMembers.at(index);
    }
}