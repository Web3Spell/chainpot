// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {BaseTest} from "./Base.t.sol";
import {CompoundIntegratorV3} from "../src/CompoundIntegratorV3.sol";

contract CompoundIntegratorV3Test is BaseTest {
    /// Direct unit test against CompoundIntegrator with this contract as escrow.
    function setUp() public override {
        super.setUp();
        // Repoint integrator's escrow at this test contract for direct interaction.
        // We deploy a new isolated integrator to avoid breaking the systemwide wiring.
    }

    function _newIntegrator() internal returns (CompoundIntegratorV3 ci) {
        ci = new CompoundIntegratorV3(address(comet), address(usdc));
        // Deploy a 2-byte stub at a fresh address and register it as escrow,
        // then bypass by routing tests through owner (also onlyAuthorized).
    }

    /// C-02 fix: per-cycle interest accounting via shares.
    /// Two cycles deposit the same amount; both should receive equal interest after equal time.
    function test_shares_equalCyclesEqualInterest() public {
        CompoundIntegratorV3 ci = _newIntegrator();
        // Owner is authorized in onlyAuthorized; we can call directly.
        usdc.mint(address(this), 10_000 * USDC_ONE);
        usdc.approve(address(ci), type(uint256).max);

        ci.supplyUSDCForPot(1, 1, 1_000 * USDC_ONE);
        ci.supplyUSDCForPot(1, 2, 1_000 * USDC_ONE);

        // Advance 30 days
        vm.warp(block.timestamp + 30 days);

        uint256 interest1 = ci.getCycleInterest(1, 1);
        uint256 interest2 = ci.getCycleInterest(1, 2);

        // Should be equal within 1 wei rounding
        assertApproxEqAbs(interest1, interest2, 1);
        assertGt(interest1, 0);
    }

    /// C-02 fix: late-joining cycle should NOT get interest from earlier period.
    function test_shares_lateCycleNoEarlyInterest() public {
        CompoundIntegratorV3 ci = _newIntegrator();
        usdc.mint(address(this), 10_000 * USDC_ONE);
        usdc.approve(address(ci), type(uint256).max);

        ci.supplyUSDCForPot(1, 1, 1_000 * USDC_ONE);
        vm.warp(block.timestamp + 30 days);
        ci.supplyUSDCForPot(1, 2, 1_000 * USDC_ONE);
        vm.warp(block.timestamp + 30 days);

        uint256 interest1 = ci.getCycleInterest(1, 1);
        uint256 interest2 = ci.getCycleInterest(1, 2);

        // Cycle 1 was deposited 60 days ago, cycle 2 only 30 days ago.
        assertGt(interest1, interest2);
    }

    /// C-02 fix: withdrawing cycle 1's principal does not corrupt cycle 2's interest.
    function test_shares_withdrawDoesNotCorruptOtherCycle() public {
        CompoundIntegratorV3 ci = _newIntegrator();
        usdc.mint(address(this), 10_000 * USDC_ONE);
        usdc.approve(address(ci), type(uint256).max);

        ci.supplyUSDCForPot(1, 1, 1_000 * USDC_ONE);
        ci.supplyUSDCForPot(1, 2, 1_000 * USDC_ONE);

        vm.warp(block.timestamp + 30 days);

        // Withdraw cycle 1's principal
        ci.withdrawUSDCForPot(1, 1, 1_000 * USDC_ONE);

        // Cycle 2's interest should still be readable and positive
        uint256 interest2 = ci.getCycleInterest(1, 2);
        assertGt(interest2, 0);
    }

    function test_supplyAndWithdrawPrincipal() public {
        CompoundIntegratorV3 ci = _newIntegrator();
        usdc.mint(address(this), 10_000 * USDC_ONE);
        usdc.approve(address(ci), type(uint256).max);

        ci.supplyUSDCForPot(1, 1, 1_000 * USDC_ONE);
        uint256 startBal = usdc.balanceOf(address(this));

        ci.withdrawUSDCForPot(1, 1, 500 * USDC_ONE);
        assertEq(usdc.balanceOf(address(this)) - startBal, 500 * USDC_ONE);
    }

    function test_withdrawCycleRemainder() public {
        CompoundIntegratorV3 ci = _newIntegrator();
        usdc.mint(address(this), 10_000 * USDC_ONE);
        usdc.approve(address(ci), type(uint256).max);

        ci.supplyUSDCForPot(1, 1, 5_000 * USDC_ONE);
        vm.warp(block.timestamp + 30 days);

        // Withdraw 4_000 (winner payout)
        ci.withdrawUSDCForPot(1, 1, 4_000 * USDC_ONE);

        uint256 balBefore = usdc.balanceOf(address(this));
        uint256 remainder = ci.withdrawCycleRemainder(1, 1);
        uint256 balAfter = usdc.balanceOf(address(this));

        // Remainder ~= residual principal (1000) + interest accrued on residual
        assertGe(remainder, 1_000 * USDC_ONE);
        assertEq(balAfter - balBefore, remainder);
    }

    function test_unauthorized_supply_reverts() public {
        CompoundIntegratorV3 ci = _newIntegrator();
        vm.prank(alice);
        vm.expectRevert(CompoundIntegratorV3.NotAuthorized.selector);
        ci.supplyUSDCForPot(1, 1, 100);
    }
}
