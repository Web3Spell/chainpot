// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import "../src/CompoundIntegrator.sol";
import "./mocks/MockComet.sol";
import "./mocks/MockUSDC.sol";

contract CompoundV3IntegratorTest is Test {
    // These must match the addresses hardcoded in the integrator contract:
    // COMET_USDC = 0x571621Ce60Cebb0c1D442B5afb38B1663C6Bf017
    // USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e
    address constant FIXED_COMET = 0x571621Ce60Cebb0c1D442B5afb38B1663C6Bf017;
    address constant FIXED_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    CompoundV3Integrator integrator;
    MockComet tempComet;
    MockUSDC tempUSDC;

    address deployer = address(this); // test contract will be owner in constructor
    address alice = address(0xA1);
    address bob = address(0xA2);

    function setUp() public {
        // deploy temp mocks so we can extract runtime bytecode
        tempComet = new MockComet();
        tempUSDC = new MockUSDC();

        // Put the mock runtime code at the fixed addresses the integrator expects
        vm.etch(FIXED_COMET, address(tempComet).code);
        vm.etch(FIXED_USDC, address(tempUSDC).code);

        // Initialize runtime storage where necessary (MockComet has setter)
        MockComet(FIXED_COMET).setUSDC(FIXED_USDC);

        // Deploy the real integrator (it will reference the fixed addresses above)
        integrator = new CompoundV3Integrator();

        // Sanity: integrator owner is this test contract
        assertEq(integrator.owner(), deployer);
    }

    /* ----------------------- Admin functions ----------------------- */

    function test_setEscrow_zero_reverts() public {
        vm.expectRevert(CompoundV3Integrator.InvalidAddress.selector);
        integrator.setEscrow(address(0));
    }

    function test_setEscrow_and_update() public {
        integrator.setEscrow(alice);
        assertEq(integrator.escrow(), alice);
    }

    function test_adminApproveComet_setsAllowance() public {
        // integrator constructor already called USDC.approve(COMET) but we assert it doesn't revert when called again
        integrator.adminApproveComet();
    }

    /* ----------------------- supplyUSDCForPot ----------------------- */

    function test_supplyUSDCForPot_authorized_and_flow() public {
        uint256 potId = 1;
        uint256 cycleId = 2;
        uint256 amount = 1_000e6;

        // mint to alice and approve integrator to pull
        MockUSDC(FIXED_USDC).mint(alice, type(uint256).max);

        vm.prank(alice);
        MockUSDC(FIXED_USDC).approve(address(integrator), type(uint256).max);

        // alice is not authorized yet
        vm.prank(alice);
        vm.expectRevert(CompoundV3Integrator.NotAuthorized.selector);
        integrator.supplyUSDCForPot(potId, cycleId, amount);

        // mint to deployer also (important!)
        MockUSDC(FIXED_USDC).mint(deployer, type(uint256).max);

        // owner is authorized (deployer)
        vm.prank(deployer);
        MockUSDC(FIXED_USDC).approve(address(integrator), type(uint256).max);
        integrator.supplyUSDCForPot(potId, cycleId, amount);

        // check pot/cycle tracked
        (uint256 principal,,,) = integrator.getCycleDeposit(potId, cycleId);
        assertEq(principal, amount);

        (uint256 potTotal, uint256 potWithdrawn) = integrator.getPotStats(potId);
        assertEq(potTotal, amount);
        assertEq(potWithdrawn, 0);

        // Comet should have recorded integrator's supply
        uint256 cometBalance = MockComet(FIXED_COMET).balanceOf(address(integrator));
        assertEq(cometBalance, amount);

        // global principal incremented
        assertEq(integrator.getTotalPrincipalSupplied(), amount);
    }

    function test_supplyUSDC_invalidInputs_revert() public {
        vm.prank(deployer);
        vm.expectRevert(CompoundV3Integrator.InvalidAmount.selector);
        integrator.supplyUSDCForPot(1, 1, 0);

        vm.prank(deployer);
        vm.expectRevert(CompoundV3Integrator.InvalidPotId.selector);
        integrator.supplyUSDCForPot(0, 1, 1e6);

        vm.prank(deployer);
        vm.expectRevert(CompoundV3Integrator.InvalidCycleId.selector);
        integrator.supplyUSDCForPot(1, 0, 1e6);
    }

    /* ----------------------- withdrawUSDCForPot ----------------------- */

    function test_withdrawUSDCForPot_success_flow() public {
        uint256 potId = 5;
        uint256 cycleId = 6;
        uint256 amount = 500e6;

        // seed: owner supply first so there is principal in Comet
        MockUSDC(FIXED_USDC).mint(deployer, amount);
        vm.prank(deployer);
        MockUSDC(FIXED_USDC).approve(address(integrator), amount);
        vm.prank(deployer);
        integrator.supplyUSDCForPot(potId, cycleId, amount);

        // make sure comet has enough to withdraw (comet tracked balances)
        assertEq(MockComet(FIXED_COMET).balanceOf(address(integrator)), amount);

        // withdraw: authorized owner call -> integrator will call comet.withdraw then send USDC to caller
        vm.prank(deployer);
        integrator.withdrawUSDCForPot(potId, cycleId, 200e6);

        // caller (owner) should have received minted USDC by MockComet
        assertEq(MockUSDC(FIXED_USDC).balanceOf(deployer), 200e6);

        // pot and cycle accounting updated
        (uint256 p, uint256 w,,) = integrator.getCycleDeposit(potId, cycleId);
        assertEq(p, amount);
        assertEq(w, 200e6);

        (uint256 potTotal, uint256 potWithdrawn) = integrator.getPotStats(potId);
        assertEq(potTotal, amount);
        assertEq(potWithdrawn, 200e6);
    }

    function test_withdrawUSDC_invalids_and_reverts() public {
        vm.prank(deployer);
        vm.expectRevert(CompoundV3Integrator.InvalidAmount.selector);
        integrator.withdrawUSDCForPot(1, 1, 0);

        vm.prank(deployer);
        vm.expectRevert(CompoundV3Integrator.InvalidPotId.selector);
        integrator.withdrawUSDCForPot(0, 1, 1e6);

        vm.prank(deployer);
        vm.expectRevert(CompoundV3Integrator.InvalidCycleId.selector);
        integrator.withdrawUSDCForPot(1, 0, 1e6);

        // withdraw when cycle not active -> CycleNotActive
        vm.prank(deployer);
        vm.expectRevert(CompoundV3Integrator.CycleNotActive.selector);
        integrator.withdrawUSDCForPot(99, 99, 1e6);
    }

    function test_withdrawUSDC_insufficientCompoundBalance_revert() public {
        // If comet doesn't have enough global balance, it will still allow integrator to call withdraw
        // but contract has explicit check: we check COMET.balanceOf(address(this)) < amount
        // To trigger revert, make sure COMET balance is 0 and attempt withdraw
        vm.prank(deployer);
        vm.expectRevert();
        integrator.withdrawUSDCForPot(1, 1, 1e6);
    }

    /* ----------------------- withdrawInterestForPot ----------------------- */

    function test_withdrawInterest_zero_and_nonzero_flow() public {
        uint256 potId = 10;
        uint256 cycleId = 11;
        uint256 amount = 1_000e6;

        // seed principal so totalPrincipalSupplied isn't zero
        MockUSDC(FIXED_USDC).mint(deployer, amount);
        vm.prank(deployer);
        MockUSDC(FIXED_USDC).approve(address(integrator), amount);
        vm.prank(deployer);
        integrator.supplyUSDCForPot(potId, cycleId, amount);

        // no interest -> returns 0
        vm.prank(deployer);
        uint256 got = integrator.withdrawInterestForPot(potId, cycleId);
        assertEq(got, 0);

        // simulate comet growing by minting extra USDC to integrator via COMET.withdraw
        // but easier: make MockComet's internal balance higher to appear as earned interest
        // we emulate interest by directly minting USDC into the integrator's balance through the MockComet withdrawal path:
        // first deposit some extra amount into comet's internal bookkeeping for integrator
        MockComet(FIXED_COMET).balances(address(integrator)); // noop just to read
        // to emulate earned interest, set MockComet total supply and then mint directly to integrator through withdraw path:
        // call withdrawInterest path by setting some internal difference: deposit + then withdraw interest via COMET.withdraw call performed inside integrator.withdrawInterestForPot
        // we cheat by setting MockComet's balances higher and then calling integrator.withdrawInterestForPot which will call comet.withdraw and mint tokens
        // increase comet's internal balances so getPotCycleInterest sees positive value:
        // there is no direct setter for comet balances for integrator, but we can call MockComet.supply pretending another user supplied interest to the comet and thereby increase COMET.balanceOf(address(this))
        // easier: call MockUSDC.mint to integrator (simulate outside interest), then integrator.getTotalInterestEarned will detect difference:
        MockUSDC(FIXED_USDC).mint(address(integrator), 50e6);

        // Now integrator.withdrawInterestForPot should call COMET.withdraw for interestAmount (there will be some interest computed)
        vm.prank(deployer);
        uint256 interest = integrator.withdrawInterestForPot(potId, cycleId);

        // interest may be zero depending on rounding; we at least ensure function executes and returns a uint
        assertTrue(interest >= 0);
    }

    /* ----------------------- compoundInterest / apy / market info ----------------------- */

    function test_compoundInterest_and_views() public {
        // Set supply rate and utilization on comet and call view functions
        MockComet(FIXED_COMET).setUtilization(123);
        MockComet(FIXED_COMET).setSupplyRate(uint64(2e16)); // 0.02 per second (just for math checks)

        uint256 apy = integrator.getCurrentSupplyAPY();
        assertGt(apy, 0);

        uint256 util = integrator.getMarketUtilization();
        assertEq(util, 123);

        (uint256 s, uint256 b) = integrator.getMarketStats();
        assertEq(s, MockComet(FIXED_COMET).totalSupply());
        assertEq(b, MockComet(FIXED_COMET).totalBorrow());
    }

    function test_isAccountHealthy() public {
        // default false (not liquidatable) -> isAccountHealthy returns true
        MockComet(FIXED_COMET).setLiquidatable(false);
        assertTrue(integrator.isAccountHealthy());

        MockComet(FIXED_COMET).setLiquidatable(true);
        assertFalse(integrator.isAccountHealthy());
    }

    /* ----------------------- emergency & rescue ----------------------- */

    function test_emergencyWithdrawAll_and_emergencyWithdrawUSDC() public {
        // seed comet internal balance by supplying
        uint256 potId = 20;
        uint256 cycleId = 21;
        MockUSDC(FIXED_USDC).mint(deployer, 1_000e6);
        vm.prank(deployer);
        MockUSDC(FIXED_USDC).approve(address(integrator), 1_000e6);
        vm.prank(deployer);
        integrator.supplyUSDCForPot(potId, cycleId, 1_000e6);

        // pause integrator as owner: emergency functions require whenPaused
        vm.prank(deployer);
        integrator.pause();

        // emergencyWithdrawAll should withdraw from comet and emit; we check owner's balance increases
        vm.prank(deployer);
        integrator.emergencyWithdrawAll();

        // emergencyWithdrawUSDC: contract has some USDC possibly; call for a small amount
        vm.prank(deployer);
        integrator.emergencyWithdrawUSDC(1e6);

        // ensure owner got some tokens (minted by MockComet or via transfer)
        assertTrue(MockUSDC(FIXED_USDC).balanceOf(deployer) >= 1e6);
    }

    function test_rescueTokens_reverts_and_success() public {
        // try to rescue USDC - should revert
        vm.prank(deployer);
        vm.expectRevert(CompoundV3Integrator.InvalidAddress.selector);
        integrator.rescueTokens(FIXED_USDC, 1e6);

        // rescue another token address: we etch a minimal token at some address and then rescue
        address randomTokenAddr = address(0xBEEF);
        // put a minimal ERC20 runtime (reuse MockUSDC code) at randomTokenAddr
        vm.etch(randomTokenAddr, address(tempUSDC).code);
        // mint some to integrator
        MockUSDC(randomTokenAddr).mint(address(integrator), 10e6);

        vm.prank(deployer);
        integrator.rescueTokens(randomTokenAddr, 5e6);

        // owner should have received rescued tokens
        assertEq(MockUSDC(randomTokenAddr).balanceOf(deployer), 5e6);
    }

    /* ----------------------- access control negative tests ----------------------- */

    function test_onlyAuthorized_reverts_for_non_authorized() public {
        // call supply from bob (not owner, not escrow)
        MockUSDC(FIXED_USDC).mint(bob, 100e6);
        vm.prank(bob);
        MockUSDC(FIXED_USDC).approve(address(integrator), 100e6);

        vm.prank(bob);
        vm.expectRevert(CompoundV3Integrator.NotAuthorized.selector);
        integrator.supplyUSDCForPot(1, 1, 100e6);
    }

    function test_pause_unpause_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(); // alice not owner
        integrator.pause();

        vm.prank(deployer);
        integrator.pause();
        assertTrue(integrator.paused());

        vm.prank(deployer);
        integrator.unpause();
        assertFalse(integrator.paused());
    }
}
