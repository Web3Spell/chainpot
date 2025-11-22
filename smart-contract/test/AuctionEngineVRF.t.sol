// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AuctionEngine.sol";
import "../src/MemberAccountManager.sol";
import "../src/LotteryEngine.sol";
import "../src/Escrow.sol";
import "./mocks/MockUSDC.sol";
import "./mocks/MockVRFCoordinatorV2Plus.sol";

/// @notice Mock Compound Integrator for testing
contract MockCompoundIntegrator {
    MockUSDC public USDC;
    uint256 public compoundBalance;
    mapping(uint256 => mapping(uint256 => uint256)) public potCycleInterest;
    mapping(uint256 => mapping(uint256 => uint256)) public principal;

    constructor(address _usdc) {
        USDC = MockUSDC(_usdc);
    }

    function supplyUSDCForPot(uint256 potId, uint256 cycleId, uint256 amount) external {
        principal[potId][cycleId] += amount;
        compoundBalance += amount;
    }

    function withdrawUSDCForPot(uint256 potId, uint256 cycleId, uint256 amount) external {
        require(principal[potId][cycleId] >= amount, "not-enough-principal");
        principal[potId][cycleId] -= amount;
        compoundBalance -= amount;
        USDC.mint(msg.sender, amount);
    }

    function getPotCycleInterest(uint256 potId, uint256 cycleId) external view returns (uint256) {
        return potCycleInterest[potId][cycleId];
    }

    function withdrawInterestForPot(uint256 potId, uint256 cycleId) external {
        uint256 interest = potCycleInterest[potId][cycleId];
        potCycleInterest[potId][cycleId] = 0;
        USDC.mint(msg.sender, interest);
    }

    function getCompoundUSDCBalance() external view returns (uint256) {
        return compoundBalance;
    }

    function emergencyWithdrawUSDC(uint256 amount) external {
        if (compoundBalance >= amount) compoundBalance -= amount;
        USDC.mint(msg.sender, amount);
    }

    function emergencyWithdrawAll() external {
        compoundBalance = 0;
    }

    // Helper for tests
    function setInterest(uint256 potId, uint256 cycleId, uint256 interest) external {
        potCycleInterest[potId][cycleId] = interest;
    }
}

/// @notice Test contract for VRF integration flow
contract AuctionEngineVRFTest is Test {
    MockUSDC usdc;
    MockVRFCoordinatorV2Plus vrfCoordinator;
    MockCompoundIntegrator compound;
    LotteryEngine lottery;
    Escrow escrow;
    MemberAccountManager memberManager;
    AuctionEngine auction;

    address owner = address(0xA11CE);
    address creator = address(0xC0FFEE);
    address alice = address(0xBEEF);
    address bob = address(0xCAFE);
    address charlie = address(0xDEAD);

    uint256 constant UNIT = 1_000_000; // 1 USDC in 6 decimals
    uint256 constant AMT = 1_000_000;

    function setUp() public {
        // Deploy contracts
        usdc = new MockUSDC();
        vrfCoordinator = new MockVRFCoordinatorV2Plus();
        compound = new MockCompoundIntegrator(address(usdc));

        // Deploy LotteryEngine with mock VRF coordinator
        vm.prank(owner);
        lottery = new LotteryEngine(address(vrfCoordinator), 1, bytes32(uint256(0x1234)));

        // Deploy Escrow
        vm.prank(owner);
        escrow = new Escrow(address(usdc), address(compound));

        // Deploy MemberAccountManager
        vm.prank(owner);
        memberManager = new MemberAccountManager();

        // Deploy AuctionEngine
        vm.prank(owner);
        auction = new AuctionEngine(address(usdc), address(memberManager), address(lottery), address(escrow));

        // Configure connections
        vm.prank(owner);
        memberManager.addAuthorizedCaller(address(auction));

        vm.prank(owner);
        escrow.setAuctionEngine(address(auction));

        // Setup users
        usdc.mint(creator, 1000 * UNIT);
        usdc.mint(alice, 1000 * UNIT);
        usdc.mint(bob, 1000 * UNIT);
        usdc.mint(charlie, 1000 * UNIT);

        memberManager.registerMember(creator);
        memberManager.registerMember(alice);
        memberManager.registerMember(bob);
        memberManager.registerMember(charlie);

        vm.prank(creator);
        usdc.approve(address(auction), type(uint256).max);

        vm.prank(alice);
        usdc.approve(address(auction), type(uint256).max);

        vm.prank(bob);
        usdc.approve(address(auction), type(uint256).max);

        vm.prank(charlie);
        usdc.approve(address(auction), type(uint256).max);
    }

    // Helper function to create pot and start cycle
    function _createPotAndStartCycle() internal returns (uint256 potId, uint256 cycleId) {
        vm.prank(creator);
        potId = auction.createPot("VRFTest", AMT, 1 days, 3, AuctionEngine.CycleFrequency.Weekly, 1 hours, 2, 10);

        vm.prank(alice);
        auction.joinPot(potId);

        vm.prank(bob);
        auction.joinPot(potId);

        vm.prank(creator);
        cycleId = auction.startCycle(potId);

        // All members pay for cycle
        vm.prank(creator);
        auction.payForCycle(cycleId);

        vm.prank(alice);
        auction.payForCycle(cycleId);

        vm.prank(bob);
        auction.payForCycle(cycleId);
    }

    // Helper to get pot members
    function _getPotMembers(uint256 potId) internal view returns (address[] memory) {
        (,,,,,,,,, address[] memory members,) = auction.getPotInfo(potId);
        return members;
    }

    // ------------------------------------------------------------------------
    // Test VRF Flow: No Bids Scenario
    // ------------------------------------------------------------------------
    function test_declareWinner_noBids_requestsVRF() public {
        (uint256 potId, uint256 cycleId) = _createPotAndStartCycle();

        vm.warp(block.timestamp + 1 days - 1 hours);
        vm.prank(creator);
        auction.closeBidding(cycleId);

        // Declare winner with no bids - should request VRF
        vm.prank(creator);
        address winner = auction.declareWinner(cycleId);

        // Should return address(0) and status should be AwaitingVRF
        assertEq(winner, address(0));

        (,,,,, AuctionEngine.CycleStatus status,,) = auction.getCycleInfo(cycleId);
        assertEq(uint256(status), uint256(AuctionEngine.CycleStatus.AwaitingVRF));

        // Check VRF request ID is stored
        uint64 vrfRequestId = auction.getCycleVRFRequestId(cycleId);
        assertGt(vrfRequestId, 0);
    }

    function test_declareWinner_noBids_emitsVRFRequestedEvent() public {
        (uint256 potId, uint256 cycleId) = _createPotAndStartCycle();

        vm.warp(block.timestamp + 1 days - 1 hours);
        vm.prank(creator);
        auction.closeBidding(cycleId);

        // Expect VRFRequested event
        vm.expectEmit(true, true, false, true);
        emit AuctionEngine.VRFRequested(cycleId, 0); // requestId will be emitted but we don't know exact value

        vm.prank(creator);
        auction.declareWinner(cycleId);
    }

    function test_completeCycle_cannotComplete_whenAwaitingVRF() public {
        (uint256 potId, uint256 cycleId) = _createPotAndStartCycle();

        vm.warp(block.timestamp + 1 days - 1 hours);
        vm.prank(creator);
        auction.closeBidding(cycleId);

        vm.prank(creator);
        auction.declareWinner(cycleId); // Sets status to AwaitingVRF

        // Cannot complete cycle while awaiting VRF
        vm.warp(block.timestamp + 2 days);
        vm.prank(creator);
        vm.expectRevert(AuctionEngine.VRFNotFulfilled.selector);
        auction.completeCycle(cycleId);
    }

    // ------------------------------------------------------------------------
    // Test VRF Callback Flow
    // ------------------------------------------------------------------------
    function test_fulfillRandomWinner_setsWinnerCorrectly() public {
        (uint256 potId, uint256 cycleId) = _createPotAndStartCycle();

        vm.warp(block.timestamp + 1 days - 1 hours);
        vm.prank(creator);
        auction.closeBidding(cycleId);

        vm.prank(creator);
        auction.declareWinner(cycleId); // Returns address(0)

        // Get the actual requestId from the cycle
        uint64 vrfRequestId = auction.getCycleVRFRequestId(cycleId);
        uint256 requestId = uint256(vrfRequestId);

        address[] memory members = _getPotMembers(potId);

        // Fulfill VRF request - random word that selects alice (index 1)
        // Members array: [creator, alice, bob]
        // randomWord = 1, so 1 % 3 = 1 → alice
        uint256 randomWord = 1;
        vrfCoordinator.fulfill(address(lottery), requestId, randomWord);

        // Verify winner is set and status changed
        (,,, address winner,, AuctionEngine.CycleStatus status,,) = auction.getCycleInfo(cycleId);

        // Status should be BiddingClosed after callback
        assertEq(uint256(status), uint256(AuctionEngine.CycleStatus.BiddingClosed));

        // Winner should be alice (index 1 in members array)
        assertEq(winner, members[1]);
    }

    function test_fulfillRandomWinner_emitsWinnerDeclaredEvent() public {
        (uint256 potId, uint256 cycleId) = _createPotAndStartCycle();

        vm.warp(block.timestamp + 1 days - 1 hours);
        vm.prank(creator);
        auction.closeBidding(cycleId);

        vm.prank(creator);
        auction.declareWinner(cycleId);

        uint64 vrfRequestId = auction.getCycleVRFRequestId(cycleId);
        uint256 requestId = uint256(vrfRequestId);

        address[] memory members = _getPotMembers(potId);
        address expectedWinner = members[1]; // alice

        // Expect WinnerDeclared event
        vm.expectEmit(true, true, true, true);
        emit AuctionEngine.WinnerDeclared(cycleId, expectedWinner, AMT);

        vrfCoordinator.fulfill(address(lottery), requestId, 1);
    }

    // ------------------------------------------------------------------------
    // Test checkAndSetVRFWinner Fallback
    // ------------------------------------------------------------------------
    function test_checkAndSetVRFWinner_manualCheck() public {
        (uint256 potId, uint256 cycleId) = _createPotAndStartCycle();

        vm.warp(block.timestamp + 1 days - 1 hours);
        vm.prank(creator);
        auction.closeBidding(cycleId);

        vm.prank(creator);
        auction.declareWinner(cycleId);

        uint64 vrfRequestId = auction.getCycleVRFRequestId(cycleId);
        uint256 requestId = uint256(vrfRequestId);

        address[] memory members = _getPotMembers(potId);

        // Fulfill VRF but simulate callback failure by not calling through lottery
        // Instead, fulfill directly and then manually check
        vrfCoordinator.fulfill(address(lottery), requestId, 2); // Selects bob (index 2)

        // If callback didn't work, manually check and set winner
        vm.prank(creator);
        auction.checkAndSetVRFWinner(cycleId);

        // Verify winner is set
        (,,, address winner,, AuctionEngine.CycleStatus status,,) = auction.getCycleInfo(cycleId);

        assertEq(winner, members[2]); // bob (index 2)
        assertEq(uint256(status), uint256(AuctionEngine.CycleStatus.BiddingClosed));
    }

    function test_checkAndSetVRFWinner_revertsIfNotFulfilled() public {
        (uint256 potId, uint256 cycleId) = _createPotAndStartCycle();

        vm.warp(block.timestamp + 1 days - 1 hours);
        vm.prank(creator);
        auction.closeBidding(cycleId);

        vm.prank(creator);
        auction.declareWinner(cycleId);

        // Try to check before VRF is fulfilled
        vm.prank(creator);
        vm.expectRevert(AuctionEngine.VRFNotFulfilled.selector);
        auction.checkAndSetVRFWinner(cycleId);
    }

    function test_checkAndSetVRFWinner_revertsIfWrongStatus() public {
        (uint256 potId, uint256 cycleId) = _createPotAndStartCycle();

        vm.warp(block.timestamp + 1 days - 1 hours);
        vm.prank(creator);
        auction.closeBidding(cycleId);

        // Try to check when status is not AwaitingVRF
        vm.prank(creator);
        vm.expectRevert(AuctionEngine.InvalidCycleStatus.selector);
        auction.checkAndSetVRFWinner(cycleId);
    }

    // ------------------------------------------------------------------------
    // Test Complete Flow: VRF → Callback → Complete
    // ------------------------------------------------------------------------
    function test_completeCycle_afterVRFCallback() public {
        (uint256 potId, uint256 cycleId) = _createPotAndStartCycle();

        // Set interest in compound
        compound.setInterest(potId, cycleId, 100e6); // 100 USDC interest

        vm.warp(block.timestamp + 1 days - 1 hours);
        vm.prank(creator);
        auction.closeBidding(cycleId);

        vm.prank(creator);
        auction.declareWinner(cycleId);

        uint64 vrfRequestId = auction.getCycleVRFRequestId(cycleId);
        uint256 requestId = uint256(vrfRequestId);

        address[] memory members = _getPotMembers(potId);

        // Fulfill VRF - select creator as winner (index 0)
        vrfCoordinator.fulfill(address(lottery), requestId, 0);

        // Now complete cycle should work
        vm.warp(block.timestamp + 2 days);

        uint256 winnerBalanceBefore = usdc.balanceOf(creator);
        uint256 aliceBalanceBefore = usdc.balanceOf(alice);
        uint256 bobBalanceBefore = usdc.balanceOf(bob);

        vm.prank(creator);
        auction.completeCycle(cycleId);

        // Winner (creator) should receive winning bid amount
        assertEq(usdc.balanceOf(creator) - winnerBalanceBefore, AMT);

        // Non-winners should receive interest (100e6 / 2 = 50e6 each)
        assertEq(usdc.balanceOf(alice) - aliceBalanceBefore, 50e6);
        assertEq(usdc.balanceOf(bob) - bobBalanceBefore, 50e6);
    }

    // ------------------------------------------------------------------------
    // Test Interest Distribution with Remainder (Precision Loss Fix)
    // ------------------------------------------------------------------------
    function test_interestDistribution_withRemainder() public {
        (uint256 potId, uint256 cycleId) = _createPotAndStartCycle();

        // Set interest that doesn't divide evenly: 101e6 interest with 2 non-winners
        // 101e6 / 2 = 50e6 each, remainder 1e6 → first non-winner gets extra
        compound.setInterest(potId, cycleId, 101e6);

        vm.warp(block.timestamp + 1 days - 1 hours);
        vm.prank(creator);
        auction.closeBidding(cycleId);

        vm.prank(creator);
        auction.declareWinner(cycleId);

        uint64 vrfRequestId = auction.getCycleVRFRequestId(cycleId);
        uint256 requestId = uint256(vrfRequestId);

        address[] memory members = _getPotMembers(potId);

        // Select creator as winner (index 0)
        vrfCoordinator.fulfill(address(lottery), requestId, 0);

        vm.warp(block.timestamp + 2 days);

        uint256 aliceBalanceBefore = usdc.balanceOf(alice);
        uint256 bobBalanceBefore = usdc.balanceOf(bob);

        vm.prank(creator);
        auction.completeCycle(cycleId);

        // First non-winner (alice) gets base + remainder: 50e6 + 1e6 = 51e6
        // Second non-winner (bob) gets base: 50e6
        uint256 aliceInterest = usdc.balanceOf(alice) - aliceBalanceBefore;
        uint256 bobInterest = usdc.balanceOf(bob) - bobBalanceBefore;

        assertEq(aliceInterest + bobInterest, 101e6, "Total interest distributed");
        assertEq(aliceInterest, 51e6, "Alice gets base + remainder");
        assertEq(bobInterest, 50e6, "Bob gets base");
    }

    // ------------------------------------------------------------------------
    // Test Error Cases
    // ------------------------------------------------------------------------
    function test_fulfillRandomWinner_revertsIfNotLotteryEngine() public {
        (uint256 potId, uint256 cycleId) = _createPotAndStartCycle();

        vm.warp(block.timestamp + 1 days - 1 hours);
        vm.prank(creator);
        auction.closeBidding(cycleId);

        vm.prank(creator);
        auction.declareWinner(cycleId);

        uint64 vrfRequestId = auction.getCycleVRFRequestId(cycleId);
        uint256 requestId = uint256(vrfRequestId);

        // Try to call fulfillRandomWinner from non-lottery address
        vm.prank(alice);
        vm.expectRevert(AuctionEngine.NotLotteryEngine.selector);
        auction.fulfillRandomWinner(requestId, alice);
    }

    function test_fulfillRandomWinner_revertsIfRequestNotFound() public {
        vm.prank(address(lottery));
        vm.expectRevert(AuctionEngine.VRFRequestNotFound.selector);
        auction.fulfillRandomWinner(999, alice);
    }

    function test_fulfillRandomWinner_revertsIfWinnerAlreadySet() public {
        (uint256 potId, uint256 cycleId) = _createPotAndStartCycle();

        vm.warp(block.timestamp + 1 days - 1 hours);
        vm.prank(creator);
        auction.closeBidding(cycleId);

        vm.prank(creator);
        auction.declareWinner(cycleId);

        uint64 vrfRequestId = auction.getCycleVRFRequestId(cycleId);
        uint256 requestId = uint256(vrfRequestId);

        // Fulfill once
        vrfCoordinator.fulfill(address(lottery), requestId, 0);

        // Try to fulfill again (should revert)
        vm.prank(address(lottery));
        vm.expectRevert(AuctionEngine.WinnerAlreadySet.selector);
        auction.fulfillRandomWinner(requestId, creator);
    }

    function test_declareWinner_revertsIfNotBiddingClosed() public {
        (uint256 potId, uint256 cycleId) = _createPotAndStartCycle();

        // Try to declare winner before closing bidding
        vm.prank(creator);
        vm.expectRevert(AuctionEngine.BiddingNotClosed.selector);
        auction.declareWinner(cycleId);
    }
}
