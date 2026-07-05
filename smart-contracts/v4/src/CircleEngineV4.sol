// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RoscaEngineBaseV4} from "./RoscaEngineBaseV4.sol";

/// @title CircleEngineV4 — Program A (social, no bidding)
/// @notice Winner each cycle is the earliest-ranked eligible member of a VRF Fisher–Yates shuffle
///         fixed once at `startPot` (1 VRF call per pot). An opt-in `perCycleVRF` mode draws per cycle.
/// @dev M-01/M-02/M-03 are N/A (no bidding). Interest is split among all non-defaulted members (§9.2).
contract CircleEngineV4 is RoscaEngineBaseV4 {
    mapping(uint256 => bool) public perCycleVRF;
    mapping(uint256 => bool) public shuffleReady;
    mapping(uint256 => address[]) internal _winnerOrder;

    error ShuffleNotReady();

    event ShuffleFixed(uint256 indexed potId);

    constructor(address _registry, address _vault, address _lottery)
        RoscaEngineBaseV4(_registry, _vault, _lottery)
    {}

    function createPot(
        bytes32 merkleRoot,
        uint256 memberCount,
        uint256 amountPerCycle,
        uint256 cycleDuration,
        uint256 paymentWindow,
        bool _perCycleVRF
    ) external whenNotPaused returns (uint256 potId) {
        potId = _initPot(merkleRoot, memberCount, amountPerCycle, cycleDuration, paymentWindow, 0);
        perCycleVRF[potId] = _perCycleVRF;
    }

    /// @notice Draw (or assign) the current cycle's winner after payments close. Permissionless.
    function drawWinner(uint256 potId) external whenNotPaused {
        Pot storage p = _pots[potId];
        if (p.status != PotStatus.Active) revert PotNotActive();
        uint256 idx = p.currentCycle;
        Cycle storage c = _cycles[potId][idx];
        if (c.status != CycleStatus.Active) revert CycleNotActive();
        if (block.timestamp < c.paymentDeadline) revert PaymentWindowOpen();

        _ensureSettled(potId, idx);

        if (perCycleVRF[potId]) {
            _drawGated(potId, idx); // C-02 gate: 0 -> early, 1 -> direct, >=2 -> VRF
            return;
        }

        if (!shuffleReady[potId]) revert ShuffleNotReady();
        address[] storage order = _winnerOrder[potId];
        uint256 n = order.length;
        address winner = address(0);
        for (uint256 i = 0; i < n; i++) {
            if (_isEligible(potId, idx, order[i])) {
                winner = order[i];
                break;
            }
        }
        if (winner == address(0)) {
            _finalizeNoWinner(potId, idx);
        } else {
            _finalizeWinner(potId, idx, winner, c.totalCollected); // full pot to winner
        }
    }

    // ---- Hooks ----

    function _onStartPot(uint256 potId) internal override {
        // Default path: one VRF request fixes the winning order. perCycleVRF pots draw per cycle.
        if (!perCycleVRF[potId]) {
            _requestShuffle(potId);
        }
    }

    function _canStartCycle(uint256 potId) internal view override returns (bool) {
        if (perCycleVRF[potId]) return true;
        return shuffleReady[potId];
    }

    function _onShuffleSeed(uint256 potId, uint256 seed) internal override {
        address[] memory members = _pots[potId].members;
        uint256 n = members.length;
        // Fisher–Yates over a copy, then persist.
        for (uint256 i = n; i > 1; i--) {
            uint256 j = seed % i;
            (members[i - 1], members[j]) = (members[j], members[i - 1]);
            seed = uint256(keccak256(abi.encode(seed, i)));
        }
        address[] storage order = _winnerOrder[potId];
        for (uint256 i = 0; i < n; i++) {
            order.push(members[i]);
        }
        shuffleReady[potId] = true;
        emit ShuffleFixed(potId);
    }

    /// @notice Circle: interest split among ALL non-defaulted members (§9.2).
    function _interestRecipients(uint256 potId, uint256, /*idx*/ address /*winner*/ )
        internal
        view
        override
        returns (address[] memory out)
    {
        address[] storage members = _pots[potId].members;
        uint256 n = members.length;
        uint256 count;
        for (uint256 i = 0; i < n; i++) {
            if (!defaulted[potId][members[i]]) count++;
        }
        out = new address[](count);
        uint256 k;
        for (uint256 i = 0; i < n; i++) {
            if (!defaulted[potId][members[i]]) out[k++] = members[i];
        }
    }

    function getWinnerOrder(uint256 potId) external view returns (address[] memory) {
        return _winnerOrder[potId];
    }
}
