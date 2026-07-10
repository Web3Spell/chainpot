// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RoscaEngineBaseV4} from "./RoscaEngineBaseV4.sol";

/// @title CircleEngineV4 — Program A (social, no bidding)
/// @notice Winner each cycle is the earliest-ranked eligible member of a VRF Fisher–Yates shuffle
///         fixed once at `startPot` (1 VRF call per pot). An opt-in `perCycleVRF` mode draws per cycle.
/// @dev M-01/M-02/M-03 are N/A (no bidding). Interest is split among all non-defaulted members (§9.2)
///      — note this deliberately INCLUDES the cycle winner, unlike the auction engine, whose
///      discount+interest pool excludes the winner (the discount is the winner's cost of early cash).
///
///      V4.1 (F-02): the shuffle callback no longer writes an order array to storage (n SSTOREs
///      inside a gas-capped VRF callback bricked large pots). Only the 1-word SEED is stored — the
///      winner order is recomputed in memory on demand, which is pure computation and cheap even at
///      MAX_MEMBERS. Combined with the base's store-then-finalize VRF (F-01) and
///      `cancelStuckShuffle` recovery, a circle of any allowed size can always make progress.
contract CircleEngineV4 is RoscaEngineBaseV4 {
    mapping(uint256 => bool) public perCycleVRF;
    mapping(uint256 => bool) public shuffleReady;
    mapping(uint256 => uint256) internal _shuffleSeed; // (F-02) seed only; order derived on demand

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
        if (block.timestamp < _effPaymentDeadline(potId, idx)) revert PaymentWindowOpen(); // F-04

        _ensureSettled(potId, idx);

        if (perCycleVRF[potId]) {
            _drawGated(potId, idx); // C-02 gate: 0 -> early, 1 -> direct, >=2 -> VRF
            return;
        }

        if (!shuffleReady[potId]) revert ShuffleNotReady();
        address[] memory order = _computeOrder(potId);
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
        // (F-02) When a reopened pot restarts, any previous seed is discarded for a fresh request.
        if (!perCycleVRF[potId]) {
            shuffleReady[potId] = false;
            _requestShuffle(potId);
        }
    }

    function _canStartCycle(uint256 potId) internal view override returns (bool) {
        if (perCycleVRF[potId]) return true;
        return shuffleReady[potId];
    }

    /// @dev (F-01/F-02) Runs inside the permissionless `finalizeDraw` transaction (full gas budget),
    ///      and stores ONLY the seed — no per-member SSTOREs, so pot size cannot brick it.
    function _onShuffleSeed(uint256 potId, uint256 seed) internal override {
        _shuffleSeed[potId] = seed;
        shuffleReady[potId] = true;
        emit ShuffleFixed(potId);
    }

    /// @dev Deterministic Fisher–Yates over the (frozen) roster from the stored seed, in memory.
    function _computeOrder(uint256 potId) internal view returns (address[] memory members) {
        members = _pots[potId].members;
        uint256 seed = _shuffleSeed[potId];
        uint256 n = members.length;
        for (uint256 i = n; i > 1; i--) {
            uint256 j = seed % i;
            (members[i - 1], members[j]) = (members[j], members[i - 1]);
            seed = uint256(keccak256(abi.encode(seed, i)));
        }
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
        out = new address[](n);
        uint256 k;
        for (uint256 i = 0; i < n; i++) {
            if (!defaulted[potId][members[i]]) out[k++] = members[i];
        }
        assembly {
            mstore(out, k)
        }
    }

    /// @notice The fixed winner order (empty until the shuffle seed is finalized).
    function getWinnerOrder(uint256 potId) external view returns (address[] memory) {
        if (!shuffleReady[potId]) return new address[](0);
        return _computeOrder(potId);
    }
}
