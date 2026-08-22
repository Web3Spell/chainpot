// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RoscaEngineBaseV4} from "./RoscaEngineBaseV4.sol";

/// @title CircleEngineV4 — Program A (social, no bidding)
/// @notice Winner each cycle is chosen via payment-gated per-cycle VRF draws after payments close.
/// @dev M-01/M-02/M-03 are N/A (no bidding). Interest is split among all non-defaulted members (§9.2)
///      — note this deliberately INCLUDES the cycle winner, unlike the auction engine, whose
///      discount+interest pool excludes the winner (the discount is the winner's cost of early cash).
contract CircleEngineV4 is RoscaEngineBaseV4 {
    constructor(address _registry, address _vault, address _lottery)
        RoscaEngineBaseV4(_registry, _vault, _lottery)
    {}

    function createPot(
        bytes32 merkleRoot,
        uint256 memberCount,
        uint256 amountPerCycle,
        uint256 cycleDuration,
        uint256 paymentWindow
    ) external whenNotPaused returns (uint256 potId) {
        potId = _initPot(merkleRoot, memberCount, amountPerCycle, cycleDuration, paymentWindow, 0);
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

        // H-01: Payment-gated draw (0 -> early, 1 -> direct, >=2 -> VRF)
        _drawGated(potId, idx);
    }

    // ---- Hooks ----

    function _onStartPot(uint256 potId) internal override {
        // H-01: No unfunded VRF calls on pot start. Draws happen per-cycle after payment.
    }

    function _canStartCycle(uint256 /*potId*/) internal pure override returns (bool) {
        return true;
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
}
