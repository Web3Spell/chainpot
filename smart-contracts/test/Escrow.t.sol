// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Escrow.sol";
import "./mocks/MockUSDC.sol";
import "./mocks/MockCompundV3Integrator.sol";

contract MockAuctionEngine {
    // only needed so setAuctionEngine sees a contract with code
    // add any minimal hooks here if tests call it
    function noop() external pure {}
}

contract EscrowTest is Test {
    Escrow escrow;
    MockUSDC usdc;
    MockCompoundV3Integrator compound;
    MockAuctionEngine mockAuction = new MockAuctionEngine();
    address owner = address(0xA1);
    address auction = address(mockAuction);
    address user1 = address(0xA3);
    address winner = address(0xA4);
    address alice = address(0xA5);

    // Trackers used by fuzz actions / tests
    uint256 totalDeposited;
    uint256 totalReleased;

    function setUp() public {
        vm.startPrank(owner);
        usdc = new MockUSDC();
        compound = new MockCompoundV3Integrator();

        escrow = new Escrow(address(usdc), address(compound));
        escrow.setAuctionEngine(address(auction));

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
        vm.expectRevert();
        escrow.setAuctionEngine(newEngine);

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

    function test_withdrawPotInterest_zero() public {
        uint256 potId = 1;
        uint256 cycleId = 1;

        vm.prank(auction);
        escrow.depositUSDC(potId, cycleId, user1, 1000e6);

        vm.prank(auction);
        uint256 interest = escrow.withdrawPotInterest(potId, cycleId);
        assertEq(interest, 0, "should return zero");
    }

    function test_emergencyWithdrawUSDC_fromBalance() public {
        // fund escrow directly
        usdc.mint(address(escrow), 200e6);

        vm.prank(owner);
        escrow.pause();

        vm.prank(owner);
        escrow.emergencyWithdrawUSDC(100e6, alice);

        assertEq(usdc.balanceOf(alice), 100e6);
    }

    function test_emergencyWithdrawAllFromCompound() public {
        vm.prank(owner);
        escrow.pause();

        vm.prank(owner);
        escrow.emergencyWithdrawAllFromCompound();

        assertFalse(compound.allWithdrawnCalled());
    }

    function test_setCompoundIntegrator() public {
        vm.startPrank(owner);
        address newIntegrator = address(0x1234);
        vm.expectRevert();
        escrow.setCompoundIntegrator(newIntegrator);

        vm.stopPrank();
    }

    function test_setCompoundIntegrator_zero_reverts() public {
        vm.prank(owner);
        vm.expectRevert(Escrow.InvalidAddress.selector);
        escrow.setCompoundIntegrator(address(0));
    }

    function test_getDepositsForUser() public {
        vm.startPrank(auction);

        escrow.depositUSDC(1, 1, user1, 10e6);
        escrow.depositUSDC(1, 1, user1, 20e6);

        vm.stopPrank();

        uint256[] memory d = escrow.getDepositsForUser(user1);
        assertEq(d.length, 2);
    }

    function test_getGlobalStats() public {
        vm.prank(auction);
        escrow.depositUSDC(1, 1, user1, 100e6);

        (uint256 totalD, uint256 totalW, uint256 totalC) = escrow.getGlobalStats();

        assertEq(totalD, 100e6);
        assertEq(totalW, 0);
        assertEq(totalC, 100e6);
    }

    function test_onlyOwner_emergencyWithdrawUSDC() public {
        vm.prank(alice);
        vm.expectRevert();
        escrow.emergencyWithdrawUSDC(100e6, alice);
    }

    /// ----------------------------------------------------------
    ///  FUZZ ACTION: random deposit
    /// ----------------------------------------------------------
    function deposit(uint256 potId, uint256 cycleId, uint256 amount) public {
        potId = bound(potId, 1, 20);
        cycleId = bound(cycleId, 1, 20);
        amount = bound(amount, 1e6, 5_000e6);

        // mint to auction for transfers
        usdc.mint(auction, amount);

        vm.startPrank(auction);
        usdc.approve(address(escrow), amount);

        escrow.depositUSDC(potId, cycleId, msg.sender, amount);

        vm.stopPrank();

        totalDeposited += amount;
    }

    /// ----------------------------------------------------------
    ///  FUZZ ACTION: random release to random winner
    /// ----------------------------------------------------------
    function release(uint256 potId, uint256 cycleId, uint256 amount) public {
        potId = bound(potId, 1, 20);
        cycleId = bound(cycleId, 1, 20);
        amount = bound(amount, 1e6, 2_000e6);

        address winner = address(uint160(uint256(keccak256(abi.encodePacked(msg.sender, potId, cycleId)))));

        vm.prank(auction);

        // ignore failures (valid for invariant model)
        try escrow.releaseFundsToWinner(potId, cycleId, winner, amount) {
            totalReleased += amount;
        } catch {}
    }

    /// ----------------------------------------------------------
    ///  FUZZ ACTION: fetch interest (no-op for model)
    /// ----------------------------------------------------------
    function harvestInterest(uint256 potId, uint256 cycleId, uint256 amount) public {
        potId = bound(potId, 1, 20);
        cycleId = bound(cycleId, 1, 20);
        amount = bound(amount, 1e6, 500e6);

        // set interest into mock integrator
        compound.setInterest(potId, cycleId, amount);

        vm.prank(auction);
        try escrow.withdrawPotInterest(potId, cycleId) {} catch {}
    }
}
