// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Escrow.sol";
import "./mocks/MockUSDC.sol";
import "./mocks/MockCompundV3Integrator.sol";

contract EscrowTest is Test {
    Escrow escrow;
    MockUSDC usdc;
    MockCompoundV3Integrator compound;

    address owner = address(0xA1);
    address auction = address(0xA2);
    address user1 = address(0xA3);
    address winner = address(0xA4);
    address alice = address(0xA5);

    function setUp() public {
        vm.startPrank(owner);

        usdc = new MockUSDC();
        compound = new MockCompoundV3Integrator();

        escrow = new Escrow(address(usdc), address(compound));

        escrow.setAuctionEngine(auction);

        vm.stopPrank();

        // Give auction engine some USDC to forward deposits
        usdc.mint(auction, 1_000_000e6);
        vm.prank(auction);
        usdc.approve(address(escrow), type(uint256).max);
    }

    function test_deposit() external {
        vm.startPrank(auction);
        usdc.approve(address(escrow), 100e6);

        escrow.depositUSDC(1, 1, alice, 100e6);

        (uint256 totalDeposited,,) = escrow.getPotFunds(1);
        assertEq(totalDeposited, 100e6);

        (, uint256 cycleWithdrawn, uint256 interestEarned, uint256 principal, bool completed) =
            escrow.getCycleFunds(1, 1);

        assertEq(cycleWithdrawn, 0);
        assertEq(interestEarned, 0);
        assertEq(principal, 100e6);
        assertEq(completed, false);

        vm.stopPrank();
    }

    function test_releaseFundsToWinner1() external {
        vm.startPrank(auction);
        usdc.approve(address(escrow), 200e6);
        escrow.depositUSDC(1, 1, alice, 200e6);

        // winner withdraws 150
        escrow.releaseFundsToWinner(1, 1, alice, 150e6);

        (,,, uint256 principalLeft,) = escrow.getCycleFunds(1, 1);

        assertEq(principalLeft, 50e6);

        vm.stopPrank();
    }

    function test_depositUSDC() public {
        uint256 potId = 1;
        uint256 cycleId = 1;
        uint256 amount = 500e6;

        vm.prank(auction);
        escrow.depositUSDC(potId, cycleId, user1, amount);

        (uint256 deposited,,, uint256 principal, bool completed) = escrow.getCycleFunds(potId, cycleId);

        assertEq(deposited, amount);
        assertEq(principal, amount);
        assertEq(completed, false);

        // Check forwarded to compound
        assertEq(compound.potCycleBalance(potId, cycleId), amount);
    }

    function test_releaseFundsToWinner() public {
        uint256 potId = 1;
        uint256 cycleId = 1;
        uint256 amount = 300e6;

        // first deposit to seed compound
        vm.prank(auction);
        escrow.depositUSDC(potId, cycleId, user1, 500e6);

        vm.prank(auction);
        escrow.releaseFundsToWinner(potId, cycleId, winner, amount);

        // principal should drop
        (,,, uint256 principal,) = escrow.getCycleFunds(potId, cycleId);
        assertEq(principal, 200e6);

        // winner should receive USDC
        assertEq(usdc.balanceOf(winner), amount);
    }

    function test_onlyEngineCanCall() external {
        vm.prank(alice);
        vm.expectRevert();
        escrow.depositUSDC(1, 1, alice, 1e6);
    }

    function test_cycleComplete() external {
        vm.prank(auction);
        escrow.markCycleCompleted(1, 1);

        (,,,, bool completed) = escrow.getCycleFunds(1, 1);

        assertTrue(completed);
    }

    function test_onlyAuctionEngineCanCallCoreFuncs() public {
        uint256 potId = 1;
        uint256 cycleId = 1;

        vm.expectRevert();
        escrow.depositUSDC(potId, cycleId, user1, 10e6);
    }

    function test_constructor_zeroUSDC_reverts() external {
        vm.expectRevert(Escrow.InvalidUSDCAddress.selector);
        new Escrow(address(0), address(compound));
    }

    function test_constructor_zeroIntegrator_reverts() external {
        vm.expectRevert(Escrow.InvalidAddress.selector);
        new Escrow(address(usdc), address(0));
    }

    function test_setAuctionEngine() external {
        vm.startPrank(owner);
        address newEngine = address(0xBEEF);

        escrow.setAuctionEngine(newEngine);

        assertEq(escrow.auctionEngine(), newEngine);
        vm.stopPrank();
    }

    function test_setAuctionEngine_zero_reverts() external {
        vm.startPrank(owner);
        vm.expectRevert(Escrow.InvalidAddress.selector);
        escrow.setAuctionEngine(address(0));
        vm.stopPrank();
    }

    function test_setAuctionEngine_notOwner_reverts() external {
        vm.prank(alice);
        vm.expectRevert();
        escrow.setAuctionEngine(alice);
    }

    function test_deposit_zeroAmount_reverts() external {
        vm.startPrank(auction);
        vm.expectRevert(Escrow.InvalidAmount.selector);
        escrow.depositUSDC(1, 1, user1, 0);
        vm.stopPrank();
    }

    function test_deposit_invalidMember_reverts() external {
        vm.startPrank(auction);
        vm.expectRevert(Escrow.InvalidAddress.selector);
        escrow.depositUSDC(1, 1, address(0), 10e6);
        vm.stopPrank();
    }

    function test_deposit_invalidPotId_reverts() external {
        vm.startPrank(auction);
        vm.expectRevert(Escrow.InvalidPotId.selector);
        escrow.depositUSDC(0, 1, user1, 10e6);
    }

    function test_deposit_invalidCycleId_reverts() external {
        vm.startPrank(auction);
        vm.expectRevert(Escrow.InvalidCycleId.selector);
        escrow.depositUSDC(1, 0, user1, 10e6);
    }

    function test_deposit_updatesUserDeposits() external {
        vm.startPrank(auction);
        escrow.depositUSDC(1, 1, user1, 50e6);

        uint256[] memory arr = escrow.getDepositsForUser(user1);
        assertEq(arr.length, 1);

        Escrow.DepositInfo memory d = escrow.getDepositInfo(arr[0]);
        assertEq(d.depositor, user1);
        assertEq(d.amount, 50e6);
    }

    function test_deposit_updatesCycleDeposits() external {
        vm.startPrank(auction);
        escrow.depositUSDC(1, 4, user1, 1e6);

        uint256[] memory arr = escrow.getDepositsForCycle(4);
        assertEq(arr.length, 1);
    }

    function test_releaseFunds_insufficientBalance_reverts() external {
        vm.startPrank(auction);
        escrow.depositUSDC(1, 1, user1, 10e6);

        vm.expectRevert(abi.encodeWithSelector(Escrow.InsufficientCycleBalance.selector, 1, 1));
        escrow.releaseFundsToWinner(1, 1, winner, 20e6);
    }

    function test_releaseFunds_invalidWinner_reverts() external {
        vm.startPrank(auction);
        escrow.depositUSDC(1, 1, user1, 10e6);

        vm.expectRevert(Escrow.InvalidAddress.selector);
        escrow.releaseFundsToWinner(1, 1, address(0), 5e6);
    }

    function test_markCycleCompleted_twice_reverts() external {
        vm.startPrank(auction);
        escrow.markCycleCompleted(1, 1);

        vm.expectRevert(abi.encodeWithSelector(Escrow.CycleAlreadyCompleted.selector, 1, 1));
        escrow.markCycleCompleted(1, 1);

        vm.stopPrank();
    }

    function test_pause_onlyOwner() external {
        vm.prank(owner);
        escrow.pause();
        assertTrue(escrow.paused());
    }

    function test_pause_blocksDeposit() external {
        vm.prank(owner);
        escrow.pause();

        vm.startPrank(auction);
        vm.expectRevert();
        escrow.depositUSDC(1, 1, user1, 1e6);
        vm.stopPrank();
    }

    function test_emergencyWithdrawUSDC_contractHasEnough() external {
        vm.startPrank(owner);
        usdc.mint(address(escrow), 100e6);

        uint256 before = usdc.balanceOf(owner);
        escrow.pause();

        escrow.emergencyWithdrawUSDC(50e6, owner);

        assertEq(usdc.balanceOf(owner) - before, 50e6);
    }

    function test_emergencyWithdrawUSDC_needsCompoundWithdraw() external {
        vm.startPrank(auction);
        escrow.depositUSDC(1, 1, user1, 40e6);
        vm.stopPrank();

        vm.prank(owner);
        escrow.pause();

        uint256 before = usdc.balanceOf(owner);

        vm.prank(owner);
        escrow.emergencyWithdrawUSDC(40e6, owner);

        assertEq(usdc.balanceOf(owner) - before, 40e6);
    }

    function test_getDepositInfo_invalidId_reverts() external {
        vm.expectRevert();
        escrow.getDepositInfo(999);
    }

    function test_getDepositInfo_depositDoesNotExist_reverts() external {
        vm.startPrank(auction);
        escrow.depositUSDC(1, 1, user1, 10e6);
        vm.stopPrank();

        vm.prank(auction);
        vm.expectRevert();
        escrow.getDepositInfo(999);
    }
}
