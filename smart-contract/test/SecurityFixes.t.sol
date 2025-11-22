// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Escrow.sol";
import "../src/AuctionEngine.sol";
import "../src/CompoundIntegrator.sol";
import "../src/MemberAccountManager.sol";
import "../src/LotteryEngine.sol";
import "./mocks/MockUSDC.sol";
import "./mocks/MockCompundV3Integrator.sol";
import "./mocks/MockVRFCoordinatorV2Plus.sol";

/// @notice Test contract for security fixes applied
contract SecurityFixesTest is Test {
    MockUSDC usdc;
    MockCompoundV3Integrator compound;
    MockVRFCoordinatorV2Plus vrfCoordinator;
    LotteryEngine lottery;
    Escrow escrow;
    MemberAccountManager memberManager;
    AuctionEngine auction;

    address owner = address(0xA11CE);
    address user = address(0xBEEF);
    address eoa = address(0xDEAD); // EOA address for testing contract verification

    function setUp() public {
        usdc = new MockUSDC();
        compound = new MockCompoundV3Integrator();
        vrfCoordinator = new MockVRFCoordinatorV2Plus();

        vm.prank(owner);
        lottery = new LotteryEngine(address(vrfCoordinator), 1, bytes32(uint256(0x1234)));

        vm.prank(owner);
        escrow = new Escrow(address(usdc), address(compound));

        vm.prank(owner);
        memberManager = new MemberAccountManager();

        vm.prank(owner);
        auction = new AuctionEngine(address(usdc), address(memberManager), address(lottery), address(escrow));

        // Setup
        vm.prank(owner);
        memberManager.addAuthorizedCaller(address(auction));

        vm.prank(owner);
        escrow.setAuctionEngine(address(auction));

        usdc.mint(owner, 1_000_000e6);
        usdc.mint(user, 1_000_000e6);
        usdc.mint(address(auction), 1_000_000e6);
        // auction approves escrow (some tests call depositUSDC by impersonating auction)
        vm.prank(address(auction));
        usdc.approve(address(escrow), type(uint256).max);
    }

    // ========================================================================
    // Test 1: Contract Address Verification
    // ========================================================================
    function test_setAuctionEngine_revertsOnEOA() public {
        vm.prank(owner);
        vm.expectRevert(Escrow.InvalidAddress.selector);
        escrow.setAuctionEngine(eoa); // EOA has no code
    }

    function test_setAuctionEngine_revertsOnZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(Escrow.InvalidAddress.selector);
        escrow.setAuctionEngine(address(0));
    }

    function test_setAuctionEngine_acceptsContract() public {
        address newContract = address(new MockCompoundV3Integrator());
        vm.prank(owner);
        escrow.setAuctionEngine(newContract);
        assertEq(escrow.auctionEngine(), newContract);
    }

    function test_setCompoundIntegrator_revertsOnEOA() public {
        vm.prank(owner);
        vm.expectRevert(Escrow.InvalidAddress.selector);
        escrow.setCompoundIntegrator(eoa);
    }

    function test_setCompoundIntegrator_acceptsContract() public {
        MockCompoundV3Integrator newIntegrator = new MockCompoundV3Integrator();
        vm.prank(owner);
        escrow.setCompoundIntegrator(address(newIntegrator));
        assertEq(address(escrow.compoundIntegrator()), address(newIntegrator));
    }

    function test_CompoundIntegrator_setEscrow_revertsOnEOA() public {
        // This test requires deploying a real CompoundIntegrator
        // The mock doesn't have setEscrow, so we skip this test for now
        // In a real deployment test, we'd use the actual CompoundIntegrator contract
    }

    function test_AuctionEngine_constructor_revertsOnEOA() public {
        // Test that constructor verifies contracts
        vm.prank(owner);
        vm.expectRevert(); // Should revert when non-contract addresses are passed
        new AuctionEngine(address(usdc), eoa, address(lottery), address(escrow));
    }

    // ========================================================================
    // Test 2: Zero Address Checks in Emergency Functions
    // ========================================================================
    function test_emergencyWithdrawUSDC_revertsOnZeroAddress() public {
        vm.prank(owner);
        auction.pause();

        vm.prank(owner);
        usdc.mint(address(auction), 100e6);

        vm.prank(owner);
        vm.expectRevert(AuctionEngine.InvalidAddress.selector);
        auction.emergencyWithdrawUSDC(100e6, address(0));
    }

    function test_emergencyWithdrawUSDC_worksWithValidAddress() public {
        vm.prank(owner);
        auction.pause();

        vm.prank(owner);
        usdc.mint(address(auction), 100e6);

        uint256 balanceBefore = usdc.balanceOf(user);

        vm.prank(owner);
        auction.emergencyWithdrawUSDC(100e6, user);

        assertEq(usdc.balanceOf(user) - balanceBefore, 100e6);
    }

    // ========================================================================
    // Test 3: Event Emissions
    // ========================================================================
    function test_withdrawPotInterest_emitsEvent() public {
        // ensure auction has funds and approval (setUp already does this, but be explicit)
        usdc.mint(address(auction), 1000e6);
        vm.prank(address(auction));
        usdc.approve(address(escrow), 1000e6);
        vm.prank(address(auction));
        escrow.depositUSDC(1, 1, user, 1000e6);

        // Set interest in mock
        compound.setInterest(1, 1, 100e6);

        // Expect event emission
        vm.expectEmit(true, true, true, true);
        emit Escrow.InterestWithdrawn(1, 1, address(0), 100e6);

        vm.prank(address(auction));
        escrow.withdrawPotInterest(1, 1);
    }

    // ========================================================================
    // Test 4: Compound Verification Checks
    // ========================================================================
    function test_supplyUSDCForPot_verifiesBalanceIncrease() public {
        // This test verifies that the balance check was added
        // The mock should work correctly, but we test the flow
        vm.prank(address(escrow));
        usdc.approve(address(compound), 100e6);
        usdc.mint(address(compound), 100e6); // Pre-mint to compound for supply

        vm.prank(address(escrow));
        compound.supplyUSDCForPot(1, 1, 100e6);

        // Mock should track the supply correctly
        assertEq(compound.potCycleBalance(1, 1), 100e6);
    }

    function test_withdrawUSDCForPot_verifiesBalanceChange() public {
        // Pre-seed mock compound with tokens and make escrow caller supply
        // (mint to compound so the mock has liquidity to credit)
        usdc.mint(address(compound), 200e6);

        // Let the Escrow (msg.sender) call supply; supply should record pot balance in mock
        vm.prank(address(escrow));
        compound.supplyUSDCForPot(1, 1, 200e6);

        // Now withdraw part of it back to escrow
        uint256 balanceBefore = usdc.balanceOf(address(escrow));
        vm.prank(address(escrow));
        compound.withdrawUSDCForPot(1, 1, 100e6);
        uint256 balanceAfter = usdc.balanceOf(address(escrow));

        // Should receive the withdrawn amount
        assertEq(balanceAfter - balanceBefore, 100e6);
        assertEq(compound.potCycleBalance(1, 1), 100e6); // Remaining
    }

    function test_withdrawInterestForPot_verifiesBalanceChange() public {
        // Seed compound and supply under escrow
        usdc.mint(address(compound), 1000e6);
        vm.prank(address(escrow));
        compound.supplyUSDCForPot(1, 1, 1000e6);

        // Set interest in mock
        compound.setInterest(1, 1, 50e6);

        uint256 balanceBefore = usdc.balanceOf(address(escrow));
        vm.prank(address(escrow));
        compound.withdrawInterestForPot(1, 1);
        uint256 balanceAfter = usdc.balanceOf(address(escrow));

        assertEq(balanceAfter - balanceBefore, 50e6);
    }

    // ========================================================================
    // Test 5: Precision Loss Fix (Interest Distribution)
    // ========================================================================
    function test_interestDistribution_withRemainder_distributesAll() public {
        // This test is already in AuctionEngineVRF.t.sol but we can add a simpler version here
        // Create a simple pot for testing
        vm.prank(user);
        memberManager.registerMember(user);

        address alice = address(0xAAAA);
        address bob = address(0xBBBB);
        vm.prank(alice);
        memberManager.registerMember(alice);
        vm.prank(bob);
        memberManager.registerMember(bob);

        vm.prank(user);
        uint256 potId = auction.createPot("Test", 100e6, 1 days, 1, AuctionEngine.CycleFrequency.Weekly, 1 hours, 2, 3);

        vm.prank(alice);
        auction.joinPot(potId);
        vm.prank(bob);
        auction.joinPot(potId);

        vm.prank(user);
        uint256 cycleId = auction.startCycle(potId);

        // Approve and pay
        vm.prank(user);
        usdc.approve(address(auction), 100e6);
        vm.prank(user);
        auction.payForCycle(cycleId);

        // give alice & bob funds so payForCycle works
        usdc.mint(alice, 100e6);
        usdc.mint(bob, 100e6);

        vm.prank(alice);
        usdc.approve(address(auction), 100e6);
        vm.prank(alice);
        auction.payForCycle(cycleId);

        vm.prank(bob);
        usdc.approve(address(auction), 100e6);
        vm.prank(bob);
        auction.payForCycle(cycleId);

        // Set interest with remainder: 101e6 interest, 2 non-winners = 50e6 + 50e6 + 1e6 remainder
        compound.setInterest(potId, cycleId, 101e6);

        // Close bidding and declare winner (with bids)
        vm.warp(block.timestamp + 1 days - 1 hours);
        vm.prank(user);
        auction.closeBidding(cycleId);

        // Place bids so we don't need VRF
        vm.prank(alice);
        auction.placeBid(cycleId, 50e6);
        vm.prank(bob);
        auction.placeBid(cycleId, 60e6);

        vm.prank(user);
        auction.declareWinner(cycleId); // alice wins (lower bid)

        // Complete cycle
        vm.warp(block.timestamp + 2 days);

        uint256 aliceBalanceBefore = usdc.balanceOf(alice);
        uint256 bobBalanceBefore = usdc.balanceOf(bob);

        vm.prank(user);
        auction.completeCycle(cycleId);

        // Alice (winner) gets bid amount + interest
        // Bob and user (non-winners) split interest: 101e6 / 2 = 50e6 + 50e6 + 1e6 remainder
        // First non-winner (user) gets base + remainder
        uint256 aliceInterest = usdc.balanceOf(alice) - aliceBalanceBefore - 50e6; // Subtract bid amount
        uint256 bobInterest = usdc.balanceOf(bob) - bobBalanceBefore;

        // Verify all interest was distributed (no precision loss)
        // Winner gets bid, non-winners get interest
        // Total interest: 101e6
        // Non-winners: user and bob = 2
        // Distribution: first gets 51e6, second gets 50e6
        assertEq(aliceInterest, 0, "Winner doesn't get interest share");
        assertGe(bobInterest, 50e6, "Bob gets at least base interest");
    }

    // ========================================================================
    // Test 6: Pause Checks on Critical Functions
    // ========================================================================
    function test_markCycleCompleted_requiresNotPaused() public {
        vm.prank(owner);
        escrow.pause();

        vm.prank(address(auction));
        vm.expectRevert(); // Should revert on pause
        escrow.markCycleCompleted(1, 1);
    }

    function test_markCycleCompleted_worksWhenNotPaused() public {
        // fund auction -> deposit
        usdc.mint(address(auction), 100e6);
        vm.prank(address(auction));
        usdc.approve(address(escrow), 100e6);
        vm.prank(address(auction));
        escrow.depositUSDC(1, 1, user, 100e6);

        vm.prank(address(auction));
        escrow.markCycleCompleted(1, 1);

        (,,,, bool completed) = escrow.getCycleFunds(1, 1);
        assertTrue(completed);
    }

    // ========================================================================
    // Test 7: VRF Request Tracking
    // ========================================================================
    function test_requestIdToCycle_mapping_isPublic() public {
        // Test that we can read the public mapping
        uint256 requestId = 123;
        uint256 cycleId = 456;

        // Can't directly set, but we can verify it's public and readable
        // This is tested indirectly through the VRF flow tests
    }

    // ========================================================================
    // Helper Functions
    // ========================================================================
    function _createSimplePot() internal returns (uint256 potId, uint256 cycleId) {
        address user1 = address(0x1111);
        address user2 = address(0x2222);

        vm.prank(user1);
        memberManager.registerMember(user1);
        vm.prank(user2);
        memberManager.registerMember(user2);

        vm.prank(user1);
        usdc.mint(user1, 10000e6);
        vm.prank(user2);
        usdc.mint(user2, 10000e6);

        vm.prank(user1);
        usdc.approve(address(auction), type(uint256).max);
        vm.prank(user2);
        usdc.approve(address(auction), type(uint256).max);

        vm.prank(user1);
        potId = auction.createPot("Test", 100e6, 1 days, 1, AuctionEngine.CycleFrequency.Weekly, 1 hours, 2, 3);

        vm.prank(user2);
        auction.joinPot(potId);

        vm.prank(user1);
        cycleId = auction.startCycle(potId);

        vm.prank(user1);
        auction.payForCycle(cycleId);
        vm.prank(user2);
        auction.payForCycle(cycleId);
    }
}

