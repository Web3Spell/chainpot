// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @title MemberRegistryV4
/// @notice Global identity, reputation and blacklist for ChainPot V4. Shared by both engines.
/// @dev Remediations:
///      - M-02: bid reputation is awarded only on the *first* bid of a cycle (`firstBid` flag).
///      - M-04: `markAsDefaulter` slashes reputation AND sets the global blacklist; join/create gates.
///      - L-02: blacklist is global across both programs and gates joins/creates only.
///      Self-registration only (carried over H-06 from V3). The blacklist NEVER touches funds —
///      it only blocks joining/creating new pots (enforced by the engines + VaultV4.claim is ungated).
contract MemberRegistryV4 is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    struct MemberProfile {
        bool registered;
        uint256 reputationScore;
        uint256 totalCyclesParticipated;
        uint256 totalCyclesWon;
        uint256 totalContribution;
        uint256 registrationTimestamp;
        uint256 lastActivityTimestamp;
    }

    mapping(address => MemberProfile) private memberProfiles;
    EnumerableSet.AddressSet private registeredMembers;

    /// @notice Engines and the Vault that may mutate reputation/blacklist.
    mapping(address => bool) public authorizedCallers;

    /// @notice Global blacklist. A blacklisted member cannot join or create new pots in either program.
    mapping(address => bool) public isBlacklisted;

    uint256 public constant INITIAL_REPUTATION = 100;
    uint256 public constant REPUTATION_PARTICIPATION = 2;
    uint256 public constant REPUTATION_BID = 1;
    uint256 public constant REPUTATION_WIN = 10;
    uint256 public constant REPUTATION_DEFAULT_PENALTY = 25;
    uint256 public constant REPUTATION_LEAVE_PENALTY = 5;

    // M-04: thresholds. NOTE (auditor disclosure): fresh wallets start at INITIAL_REPUTATION (100),
    // which is >= both thresholds, so the reputation floor only bites *after* a slash. The invite
    // (Merkle) gate — not the floor — is what stops uninvited sybils. See plan §3 (M-04) and §1.3.
    uint256 public constant MIN_REPUTATION_TO_JOIN = 50;
    uint256 public constant MIN_REPUTATION_TO_CREATE = 75;

    error UserNotRegistered(address user);
    error NotAuthorized(address caller);
    error InvalidAddress();
    error AlreadyRegistered(address user);
    error SelfRegistrationOnly();

    event MemberRegistered(address indexed user, uint256 timestamp);
    event ParticipationRecorded(address indexed user, uint256 indexed potId, uint256 indexed cycleId, uint256 contribution);
    event BidRecorded(address indexed user, uint256 indexed potId, uint256 indexed cycleId, uint256 bidAmount, bool firstBid);
    event WinnerRecorded(address indexed user, uint256 indexed potId, uint256 indexed cycleId);
    event MemberDefaulted(address indexed user, uint256 indexed potId, uint256 indexed cycleId);
    event MemberLeftPenalty(address indexed user, uint256 indexed potId);
    event ReputationUpdated(address indexed user, uint256 newScore, string reason);
    event BlacklistUpdated(address indexed user, bool blacklisted);
    event AuthorizedCallerUpdated(address indexed caller, bool authorized);

    constructor() Ownable(msg.sender) {}

    modifier onlyRegistered(address user) {
        if (!memberProfiles[user].registered) revert UserNotRegistered(user);
        _;
    }

    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender] && msg.sender != owner()) revert NotAuthorized(msg.sender);
        _;
    }

    // ---- Authorization (owner == governance multisig in production) ----

    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        if (caller == address(0)) revert InvalidAddress();
        authorizedCallers[caller] = authorized;
        emit AuthorizedCallerUpdated(caller, authorized);
    }

    /// @notice Governance-only blacklist control. Gates joins/creates only; never touches funds.
    function setBlacklist(address user, bool blacklisted) external onlyOwner {
        if (user == address(0)) revert InvalidAddress();
        isBlacklisted[user] = blacklisted;
        emit BlacklistUpdated(user, blacklisted);
    }

    // ---- Registration (self only) ----

    function registerMember() external {
        _register(msg.sender);
    }

    function registerMember(address user) external {
        if (user != msg.sender) revert SelfRegistrationOnly();
        _register(user);
    }

    function _register(address user) private {
        if (memberProfiles[user].registered) revert AlreadyRegistered(user);
        MemberProfile storage p = memberProfiles[user];
        p.registered = true;
        p.reputationScore = INITIAL_REPUTATION;
        p.registrationTimestamp = block.timestamp;
        p.lastActivityTimestamp = block.timestamp;
        registeredMembers.add(user);
        emit MemberRegistered(user, block.timestamp);
    }

    // ---- Reputation hooks (authorized engines only) ----

    function recordParticipation(address user, uint256 potId, uint256 cycleId, uint256 contribution)
        external
        onlyAuthorized
        onlyRegistered(user)
    {
        MemberProfile storage p = memberProfiles[user];
        p.totalCyclesParticipated += 1;
        p.totalContribution += contribution;
        p.reputationScore += REPUTATION_PARTICIPATION;
        p.lastActivityTimestamp = block.timestamp;
        emit ParticipationRecorded(user, potId, cycleId, contribution);
        emit ReputationUpdated(user, p.reputationScore, "participation");
    }

    /// @notice M-02: award bid reputation only when `firstBid` is true (first bid of the cycle).
    function updateBidInfo(address user, uint256 potId, uint256 cycleId, uint256 bidAmount, bool didBid, bool firstBid)
        external
        onlyAuthorized
        onlyRegistered(user)
    {
        MemberProfile storage p = memberProfiles[user];
        if (didBid && firstBid) {
            p.reputationScore += REPUTATION_BID;
            p.lastActivityTimestamp = block.timestamp;
            emit ReputationUpdated(user, p.reputationScore, "bid_placed");
        }
        emit BidRecorded(user, potId, cycleId, bidAmount, firstBid);
    }

    function recordWin(address user, uint256 potId, uint256 cycleId) external onlyAuthorized onlyRegistered(user) {
        MemberProfile storage p = memberProfiles[user];
        p.totalCyclesWon += 1;
        p.reputationScore += REPUTATION_WIN;
        p.lastActivityTimestamp = block.timestamp;
        emit WinnerRecorded(user, potId, cycleId);
        emit ReputationUpdated(user, p.reputationScore, "cycle_won");
    }

    /// @notice M-04: slash reputation AND set the global blacklist on default.
    function markAsDefaulter(address user, uint256 potId, uint256 cycleId) external onlyAuthorized {
        MemberProfile storage p = memberProfiles[user];
        if (p.reputationScore >= REPUTATION_DEFAULT_PENALTY) {
            p.reputationScore -= REPUTATION_DEFAULT_PENALTY;
        } else {
            p.reputationScore = 0;
        }
        isBlacklisted[user] = true;
        emit MemberDefaulted(user, potId, cycleId);
        emit BlacklistUpdated(user, true);
        emit ReputationUpdated(user, p.reputationScore, "default");
    }

    /// @notice L-02: penalize reputation when a member repeatedly leaves before a pot starts.
    function penalizeLeave(address user, uint256 potId) external onlyAuthorized {
        MemberProfile storage p = memberProfiles[user];
        if (p.reputationScore >= REPUTATION_LEAVE_PENALTY) {
            p.reputationScore -= REPUTATION_LEAVE_PENALTY;
        } else {
            p.reputationScore = 0;
        }
        emit MemberLeftPenalty(user, potId);
        emit ReputationUpdated(user, p.reputationScore, "leave");
    }

    // ---- Gates / Reads ----

    /// @notice True if `user` may JOIN a pot: registered, not blacklisted, reputation >= join floor.
    function canJoin(address user) external view returns (bool) {
        MemberProfile storage p = memberProfiles[user];
        return p.registered && !isBlacklisted[user] && p.reputationScore >= MIN_REPUTATION_TO_JOIN;
    }

    /// @notice True if `user` may CREATE a pot: registered, not blacklisted, reputation >= create floor.
    function canCreate(address user) external view returns (bool) {
        MemberProfile storage p = memberProfiles[user];
        return p.registered && !isBlacklisted[user] && p.reputationScore >= MIN_REPUTATION_TO_CREATE;
    }

    function isRegistered(address user) external view returns (bool) {
        return memberProfiles[user].registered;
    }

    function getReputationScore(address user) external view returns (uint256) {
        return memberProfiles[user].reputationScore;
    }

    function getMemberProfile(address user)
        external
        view
        returns (
            bool registered,
            uint256 reputationScore,
            uint256 totalCyclesParticipated,
            uint256 totalCyclesWon,
            uint256 totalContribution,
            uint256 registrationTimestamp,
            uint256 lastActivityTimestamp
        )
    {
        MemberProfile storage p = memberProfiles[user];
        return (
            p.registered,
            p.reputationScore,
            p.totalCyclesParticipated,
            p.totalCyclesWon,
            p.totalContribution,
            p.registrationTimestamp,
            p.lastActivityTimestamp
        );
    }

    function getTotalMembers() external view returns (uint256) {
        return registeredMembers.length();
    }

    function getMemberByIndex(uint256 index) external view returns (address) {
        return registeredMembers.at(index);
    }

    /// @notice (NEW-1) Convenience view for the frontend to surface creator trust info before a user
    ///         joins a pot. Prominently displayed alongside the creator address.
    function getCreatorProfile(address creator)
        external
        view
        returns (
            uint256 reputationScore,
            uint256 totalCyclesParticipated,
            uint256 totalCyclesWon,
            uint256 totalContribution,
            bool blacklisted,
            bool registered
        )
    {
        MemberProfile storage p = memberProfiles[creator];
        return (
            p.reputationScore,
            p.totalCyclesParticipated,
            p.totalCyclesWon,
            p.totalContribution,
            isBlacklisted[creator],
            p.registered
        );
    }
}
