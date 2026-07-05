// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RoscaEngineBaseV4} from "./RoscaEngineBaseV4.sol";

/// @title AuctionEngineV4 — Program B (low-bid market)
/// @notice Lowest bid wins (accepts a discount = cost of early cash); VRF only when nobody bids.
/// @dev Remediations:
///      - H-01: `placeBid` reverts for previous winners (`hasWonInPot`).
///      - H-03: bid ceiling is `cycle.totalCollected` (actual), not a hopeful max.
///      - M-01: a new bid must be a strictly-lower new lowest, so the standing lowest bidder can never
///        raise/withdraw their commitment.
///      - M-02: bid reputation awarded once per (member, cycle) via `firstBid`.
///      - M-03: a new lowest must beat the standing lowest by >= MIN_BID_STEP_BPS.
contract AuctionEngineV4 is RoscaEngineBaseV4 {
    uint256 public constant MIN_BID_STEP_BPS = 200; // 2% (M-03)

    mapping(uint256 => mapping(uint256 => uint256)) public lowestBid; // pot => cycle => amount
    mapping(uint256 => mapping(uint256 => address)) public lowestBidder; // pot => cycle => bidder
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public bidOf; // pot=>cycle=>member
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasBidThisCycle;

    error NotPaidThisCycle();
    error BidTooHigh();
    error BidNotLower();
    error BiddingClosed();
    error BiddingNotConfigured();

    event BidPlaced(uint256 indexed potId, uint256 indexed cycleId, address indexed bidder, uint256 amount);

    constructor(address _registry, address _vault, address _lottery)
        RoscaEngineBaseV4(_registry, _vault, _lottery)
    {}

    function createPot(
        bytes32 merkleRoot,
        uint256 memberCount,
        uint256 amountPerCycle,
        uint256 cycleDuration,
        uint256 paymentWindow,
        uint256 biddingWindow
    ) external whenNotPaused returns (uint256 potId) {
        if (biddingWindow == 0) revert BiddingNotConfigured();
        potId = _initPot(merkleRoot, memberCount, amountPerCycle, cycleDuration, paymentWindow, biddingWindow);
    }

    /// @notice Place a strictly-lower bid for the current cycle. Discount auction (lowest wins).
    function placeBid(uint256 potId, uint256 amount) external whenNotPaused {
        Pot storage p = _pots[potId];
        if (p.status != PotStatus.Active) revert PotNotActive();
        uint256 idx = p.currentCycle;
        Cycle storage c = _cycles[potId][idx];
        if (c.status != CycleStatus.Active) revert CycleNotActive();

        if (!isMember[potId][msg.sender]) revert NotMember();
        if (!paidForCycle[potId][idx][msg.sender]) revert NotPaidThisCycle();
        if (hasWonInPot[potId][msg.sender]) revert AlreadyWonThisPot(); // H-01
        if (defaulted[potId][msg.sender]) revert NotMember();
        if (block.timestamp >= c.biddingDeadline) revert BiddingClosed(); // M-06

        if (amount == 0 || amount >= c.totalCollected) revert BidTooHigh(); // H-03 ceiling = actual

        address curLow = lowestBidder[potId][idx];
        if (curLow != address(0)) {
            uint256 standing = lowestBid[potId][idx];
            uint256 minStep = (standing * MIN_BID_STEP_BPS) / 10_000;
            if (minStep == 0) minStep = 1;
            if (amount + minStep > standing) revert BidTooHigh(); // M-03: must beat standing by step
            // M-01: a re-bidder must also go strictly lower than their own previous bid.
            if (hasBidThisCycle[potId][idx][msg.sender] && amount >= bidOf[potId][idx][msg.sender]) {
                revert BidNotLower();
            }
        }

        bool firstBid = !hasBidThisCycle[potId][idx][msg.sender];
        hasBidThisCycle[potId][idx][msg.sender] = true;
        bidOf[potId][idx][msg.sender] = amount;
        lowestBid[potId][idx] = amount;
        lowestBidder[potId][idx] = msg.sender;

        registry.updateBidInfo(msg.sender, potId, idx, amount, true, firstBid); // M-02
        emit BidPlaced(potId, idx, msg.sender, amount);
    }

    /// @notice Close the cycle: lowest bidder wins at a discount, else VRF among non-bidders.
    function declareWinner(uint256 potId) external whenNotPaused {
        Pot storage p = _pots[potId];
        if (p.status != PotStatus.Active) revert PotNotActive();
        uint256 idx = p.currentCycle;
        Cycle storage c = _cycles[potId][idx];
        if (c.status != CycleStatus.Active) revert CycleNotActive();
        if (c.biddingDeadline == 0) revert BiddingNotConfigured();
        if (block.timestamp < c.biddingDeadline) revert BiddingOpen();

        _ensureSettled(potId, idx);

        address low = lowestBidder[potId][idx];
        if (low != address(0) && _isEligible(potId, idx, low)) {
            // Lowest bidder wins at their bid; discount + interest go to non-winners.
            _finalizeWinner(potId, idx, low, lowestBid[potId][idx]);
        } else {
            // No (eligible) bids -> VRF among eligible, full pot, no discount. C-02 gate.
            _drawGated(potId, idx);
        }
    }

    /// @notice Auction: discount + interest split among non-winner, non-defaulted members (C-01).
    function _interestRecipients(uint256 potId, uint256, /*idx*/ address winner)
        internal
        view
        override
        returns (address[] memory out)
    {
        address[] storage members = _pots[potId].members;
        uint256 n = members.length;
        uint256 count;
        for (uint256 i = 0; i < n; i++) {
            address m = members[i];
            if (m != winner && !defaulted[potId][m]) count++;
        }
        out = new address[](count);
        uint256 k;
        for (uint256 i = 0; i < n; i++) {
            address m = members[i];
            if (m != winner && !defaulted[potId][m]) out[k++] = m;
        }
    }
}
