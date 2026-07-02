// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {CompoundIntegratorV4} from "../src/CompoundIntegratorV4.sol";
import {VaultV4} from "../src/VaultV4.sol";

interface ICometAccrue {
    function accrueAccount(address account) external;
    function balanceOf(address account) external view returns (uint256);
}

/// @notice Fork test against REAL Compound III (Comet) + USDC on Base mainnet. Exercises the actual
///         supply/accrue/withdraw integration that the unit-test mocks cannot validate.
/// @dev Run with a fork:
///        forge test --match-contract ForkCometTest --fork-url https://mainnet.base.org -vv
///      Without a fork these tests no-op (the Comet/USDC addresses have no code locally).
contract ForkCometTest is Test {
    // Base mainnet
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant COMET = 0xb125E6687d4313864e53df431d5425969c15Eb2F; // cUSDCv3

    CompoundIntegratorV4 integrator;
    VaultV4 vault;
    bool forked;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        if (USDC.code.length == 0 || COMET.code.length == 0) {
            forked = false;
            return; // not on a fork; skip
        }
        forked = true;

        integrator = new CompoundIntegratorV4(COMET, USDC);
        vault = new VaultV4(USDC, address(integrator));
        integrator.setVault(address(vault));
        // act as the "engine" so we can drive the Vault directly
        vault.setEngine(address(this), true);

        deal(USDC, alice, 10_000e6);
        deal(USDC, bob, 10_000e6);
        vm.prank(alice);
        IERC20(USDC).approve(address(vault), type(uint256).max);
        vm.prank(bob);
        IERC20(USDC).approve(address(vault), type(uint256).max);
    }

    /// @notice Supply real USDC to Comet, accrue a year of interest, harvest, and assert the position
    ///         grew and the round-trip returns >= principal with exact pull-ledger conservation.
    function test_fork_supplyAccrueWithdraw() public {
        if (!forked) return;

        uint256 principal = 5_000e6;
        vault.depositForCycle(1, 1, alice, principal);

        // Comet realizes interest on interaction; warp a year then force accrual.
        uint256 startBal = ICometAccrue(COMET).balanceOf(address(integrator));
        assertApproxEqAbs(startBal, principal, 2, "supplied principal present in Comet");

        vm.warp(block.timestamp + 365 days);
        ICometAccrue(COMET).accrueAccount(address(integrator));

        uint256 grownBal = ICometAccrue(COMET).balanceOf(address(integrator));
        assertGe(grownBal, startBal, "Comet balance never shrinks");
        emit log_named_uint("principal (USDC 1e6)", principal);
        emit log_named_uint("balance after 1y", grownBal);
        emit log_named_uint("interest earned", grownBal - startBal);

        // Harvest the cycle out of Comet into the Vault, then pull.
        uint256 assets = vault.harvestCycle(1, 1);
        assertGe(assets, principal, "harvest returns at least principal");
        assertEq(vault.backing(), assets, "all harvested assets become backing");

        vault.creditWithdrawable(alice, assets);
        assertEq(vault.backing(), 0, "backing drained to credits");

        uint256 before = IERC20(USDC).balanceOf(alice);
        vm.prank(alice);
        vault.claim();
        assertEq(IERC20(USDC).balanceOf(alice) - before, assets, "alice pulls exactly her credited assets");
    }

    /// @notice Two depositors share the position pro-rata against real Comet share math.
    function test_fork_twoDepositorsProRata() public {
        if (!forked) return;

        vault.depositForCycle(1, 1, alice, 3_000e6);
        vault.depositForCycle(1, 2, bob, 1_000e6);

        vm.warp(block.timestamp + 180 days);
        ICometAccrue(COMET).accrueAccount(address(integrator));

        uint256 aAssets = vault.harvestCycle(1, 1);
        uint256 bAssets = vault.harvestCycle(1, 2);

        assertGe(aAssets, 3_000e6, "alice >= her principal");
        assertGe(bAssets, 1_000e6, "bob >= his principal");
        // alice supplied 3x bob; her share of value must be ~3x his (within rounding/timing).
        assertApproxEqRel(aAssets, bAssets * 3, 0.01e18, "pro-rata ~3:1");
    }
}
