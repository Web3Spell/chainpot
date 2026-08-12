// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import "../src/AuctionEngine.sol";
import "../src/MemberAccountManager.sol";
import "../src/LotteryEngine.sol";
import "../src/Escrow.sol";
import "./mocks/MockUSDC.sol";
import "./mocks/MockLotteryEngine.sol";

/// ------------------------
/// Mock VRF Coordinator interface minimal
/// ------------------------
contract MockVRFCoordinator {
    uint256 public requests;

    // This mirrors the signature of the VRF V2 coordinator, but you can ignore the args
    function requestRandomWords(
        bytes32, // keyHash
        uint64, // subId
        uint16, // minimumRequestConfirmations
        uint32, // callbackGasLimit
        uint32 // numWords
    )
        external
        returns (uint256)
    {
        requests++;
        return requests;
    }

    // helper if you need to simulate fulfillment in tests
    function fulfillRandomWords(uint256 requestId, address consumer, uint256[] memory randomWords) external {
        // VRFConsumerBaseV2 expects this callback
        (bool ok,) =
            consumer.call(abi.encodeWithSignature("rawFulfillRandomWords(uint256,uint256[])", requestId, randomWords));
        require(ok, "callback failed");
    }
}

/// ------------------------
/// Mock Compound Integrator
/// minimal functions used by Escrow
/// ------------------------
contract MockCompoundIntegrator {
    MockUSDC public USDC;
    uint256 public compoundBalance;
    mapping(uint256 => mapping(uint256 => uint256)) public potCycleInterest;
    mapping(uint256 => mapping(uint256 => uint256)) public principal; // potId->cycleId->principal

    constructor(address _usdc) {
        USDC = MockUSDC(_usdc);
    }

    function supplyUSDCForPot(uint256 potId, uint256 cycleId, uint256 amount) external {
        // transfer already happened into escrow; just track principal and compoundBalance
        principal[potId][cycleId] += amount;
        compoundBalance += amount;
    }

    function withdrawUSDCForPot(uint256 potId, uint256 cycleId, uint256 amount) external {
        require(principal[potId][cycleId] >= amount, "not-enough-principal");
        principal[potId][cycleId] -= amount;
        compoundBalance -= amount;
    }

    function getPotCycleInterest(uint256 potId, uint256 cycleId) external view returns (uint256) {
        return potCycleInterest[potId][cycleId];
    }

    function withdrawInterestForPot(uint256 potId, uint256 cycleId) external {
        // reset interest to 0 (assume withdraw transfers were handled by escrow)
        potCycleInterest[potId][cycleId] = 0;
    }

    function getCompoundUSDCBalance() external view returns (uint256) {
        return compoundBalance;
    }

    function emergencyWithdrawUSDC(uint256 amount) external {
        // reduce compound balance (tests will mint actual USDC into escrow/contract so transfers succeed)
        if (compoundBalance >= amount) compoundBalance -= amount;
    }

    function emergencyWithdrawAll() external {
        compoundBalance = 0;
    }

    // helpers for tests
    function setPotCycleInterest(uint256 potId, uint256 cycleId, uint256 interest) external {
        potCycleInterest[potId][cycleId] = interest;
    }
}

/// ------------------------
/// Test contract
/// ------------------------
contract AuctionEngineIntegrationTest is Test {
    MockUSDC usdc;
    MockVRFCoordinator vrfCoordinator;
    MockCompoundIntegrator compound;
    LotteryEngine lottery;
    MockLotteryEngine rng;
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
        // deploy mocks and real contracts
        usdc = new MockUSDC();
        vrfCoordinator = new MockVRFCoordinator();
        compound = new MockCompoundIntegrator(address(usdc));

        // deploy LotteryEngine with mock VRF coordinator
        // LotteryEngine constructor requires _vrfCoordinator, _subscriptionId, _keyHash (non-zero)
        vm.prank(owner);
        lottery = new LotteryEngine(address(vrfCoordinator), 1, bytes32(uint256(0x1234)));

        // deploy Escrow with compound integrator
        vm.prank(owner);
        escrow = new Escrow(address(usdc), address(compound));

        // deploy MemberAccountManager
        vm.prank(owner);
        memberManager = new MemberAccountManager();

        // deploy AuctionEngine pointing to real lottery & escrow
        vm.prank(owner);
        auction = new AuctionEngine(address(usdc), address(memberManager), address(lottery), address(escrow));

        // configure connections:
        // - register AuctionEngine in MemberAccountManager as authorized caller (memberManager owner == test-contract owner? memberManager deployed by owner via vm.prank(owner) so owner is 'owner' address; we must call addAuthorizedCaller as owner)
        vm.prank(owner);
        memberManager.addAuthorizedCaller(address(auction));

        // - set Escrow's auctionEngine to auction so Escrow.onlyAuctionEngine succeeds (escrow owner is 'owner')
        vm.prank(owner);
        escrow.setAuctionEngine(address(auction));

        // give test users USDC
        usdc.mint(creator, 1000 * UNIT);
        usdc.mint(alice, 1000 * UNIT);
        usdc.mint(bob, 1000 * UNIT);
        usdc.mint(charlie, 1000 * UNIT);

        // register users in memberManager (registerMember is external and unrestricted)
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

    // --------------------------------------
    // Constructor / minor sanity checks
    // --------------------------------------
    function testAuctionConstructorRevertsOnZeroUSDC() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(AuctionEngine.InvalidUSDCAddress.selector));
        new AuctionEngine(address(0), address(memberManager), address(lottery), address(escrow));
    }

    function testEscrowConstructorRejectsZeroIntegrator() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(Escrow.InvalidAddress.selector));
        new Escrow(address(usdc), address(0));
    }

    // ------------------------------------------------------------------------
    // Create Pot
    // ------------------------------------------------------------------------
    function test_createPot() public {
        vm.prank(alice);
        uint256 potId =
            auction.createPot("TestPot", 100e6, 1 days, 4, AuctionEngine.CycleFrequency.Weekly, 1 hours, 2, 10);
        assertEq(potId, 1);

        (string memory name,,,, uint256 cycleCount, uint256 completedCycles,,,, address[] memory members,) =
            auction.getPotInfo(potId);

        assertEq(name, "TestPot");
        assertEq(cycleCount, 4);
        assertEq(completedCycles, 0);
        assertEq(members.length, 1);
    }

    // ------------------------------------------------------------------------
    // Join Pot
    // ------------------------------------------------------------------------
    function test_joinPot() public {
        vm.prank(alice);
        uint256 potId = auction.createPot("Pot", AMT, 1 days, 3, AuctionEngine.CycleFrequency.Weekly, 1 hours, 2, 10);

        vm.prank(bob);
        auction.joinPot(potId);

        assertTrue(auction.isPotMember(potId, bob));
        assertEq(auction.getPotMemberCount(potId), 2);
    }

    function test_leavePot_beforeStart() public {
        vm.prank(alice);
        uint256 potId = auction.createPot("Pot", AMT, 1 days, 3, AuctionEngine.CycleFrequency.Weekly, 1 hours, 2, 10);

        vm.prank(bob);
        auction.joinPot(potId);

        vm.prank(bob);
        auction.leavePot(potId);

        assertFalse(auction.isPotMember(potId, bob));
    }

    // ------------------------------------------------------------------------
    // Start Cycle
    // ------------------------------------------------------------------------
    function test_startCycle() public {
        vm.prank(alice);
        uint256 potId = auction.createPot("Pot", AMT, 1 days, 3, AuctionEngine.CycleFrequency.Weekly, 1 hours, 2, 10);

        vm.prank(bob);
        auction.joinPot(potId);

        vm.prank(alice);
        uint256 cycleId = auction.startCycle(potId);

        assertEq(cycleId, 1);
    }

    // ------------------------------------------------------------------------
    // Pay Cycle
    // ------------------------------------------------------------------------
    function test_payForCycle() public {
        (uint256 potId, uint256 cycleId) = _prepareCycle();

        vm.prank(alice);
        auction.payForCycle(cycleId);

        assertTrue(auction.hasMemberPaidForCycle(potId, alice));
    }

    // helper to create pot + join + start cycle
    function _prepareCycle() internal returns (uint256 potId, uint256 cycleId) {
        vm.prank(alice);
        potId = auction.createPot("Pot", AMT, 1 days, 3, AuctionEngine.CycleFrequency.Weekly, 1 hours, 2, 10);

        vm.prank(bob);
        auction.joinPot(potId);

        vm.prank(alice);
        cycleId = auction.startCycle(potId);
    }

    // ------------------------------------------------------------------------
    // Bidding
    // ------------------------------------------------------------------------
    function test_placeBid() public {
        (uint256 potId, uint256 cycleId) = _prepareCycle();

        vm.prank(alice);
        auction.payForCycle(cycleId);
        vm.prank(bob);
        auction.payForCycle(cycleId);

        vm.prank(alice);
        auction.placeBid(cycleId, 500_000);

        assertEq(auction.getUserBid(cycleId, alice), 500_000);
    }

    // ------------------------------------------------------------------------
    // Close Bidding
    // ------------------------------------------------------------------------
    function test_closeBidding() public {
        (uint256 potId, uint256 cycleId) = _prepareCycle();

        vm.prank(alice);
        auction.payForCycle(cycleId);
        vm.prank(bob);
        auction.payForCycle(cycleId);

        vm.warp(block.timestamp + 1 days - 1 hours);

        vm.prank(alice);
        auction.closeBidding(cycleId);

        (,,,,, AuctionEngine.CycleStatus status,,) = auction.getCycleInfo(cycleId);

        assertEq(uint256(status), uint256(AuctionEngine.CycleStatus.BiddingClosed));
    }

    // ------------------------------------------------------------------------
    // Declare Winner - Lowest Bidder
    // ------------------------------------------------------------------------
    function test_declareWinner_lowestBid() public {
        (uint256 potId, uint256 cycleId) = _prepareCycle();

        vm.prank(alice);
        auction.payForCycle(cycleId);
        vm.prank(bob);
        auction.payForCycle(cycleId);

        vm.prank(alice);
        auction.placeBid(cycleId, 500_000);
        vm.prank(bob);
        auction.placeBid(cycleId, 200_000);

        vm.warp(block.timestamp + 1 days - 1 hours);
        vm.prank(alice);
        auction.closeBidding(cycleId);

        vm.prank(alice);
        address winner = auction.declareWinner(cycleId);

        assertEq(winner, bob);
    }

    // ------------------------------------------------------------------------
    // Complete Cycle
    // ------------------------------------------------------------------------
    function test_completeCycle() public {
        (uint256 potId, uint256 cycleId) = _prepareCycle();

        vm.prank(alice);
        auction.payForCycle(cycleId);
        vm.prank(bob);
        auction.payForCycle(cycleId);

        vm.prank(bob);
        auction.placeBid(cycleId, 500_000);
        vm.prank(alice);
        auction.placeBid(cycleId, 200_000);

        vm.warp(block.timestamp + 1 days - 1 hours);
        vm.prank(alice);
        auction.closeBidding(cycleId);

        vm.prank(alice);
        auction.declareWinner(cycleId);

        vm.warp(block.timestamp + 1 days + 1);

        vm.prank(alice);
        auction.completeCycle(cycleId);
    }

    // ------------------------------------------------------------------------
    // Pause / Resume
    // ------------------------------------------------------------------------
    function test_pause_unpause() public {
        vm.prank(owner);
        auction.pause();

        assertTrue(auction.paused());

        vm.prank(owner);
        auction.unpause();

        assertFalse(auction.paused());
    }

    // ------------------------------------------------------------------------
    // Emergency Withdraw
    // ------------------------------------------------------------------------
    function test_emergencyWithdraw() public {
        vm.prank(owner);
        usdc.mint(address(auction), 1000e6);

        vm.prank(owner);
        auction.pause();

        vm.prank(owner);
        auction.emergencyWithdrawUSDC(500e6, owner);

        assertEq(usdc.balanceOf(owner), 500e6);
    }

    // --------------------------------------
    // createPot + join + leave flows
    // --------------------------------------
    function testCreatePotHappyPathAndJoin() public {
        // creator must be registered (it is)
        vm.startPrank(creator);
        uint256 pid =
            auction.createPot("ROSCA", 5 * UNIT, 1 days, 2, AuctionEngine.CycleFrequency.Weekly, 1 hours, 2, 10);
        vm.stopPrank();

        assertEq(auction.getCurrentPotCount(), 1);

        // alice joins
        vm.prank(alice);
        auction.joinPot(pid);

        // bob joins
        vm.prank(bob);
        auction.joinPot(pid);

        // member count 3 (creator + alice + bob)
        assertEq(auction.getPotMemberCount(pid), 3);

        // alice leaves
        vm.prank(alice);
        auction.leavePot(pid);
        assertEq(auction.getPotMemberCount(pid), 2);
    }

    function testCreatePotRejectsInvalidParams() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(AuctionEngine.EmptyName.selector));
        auction.createPot("", 5 * UNIT, 1 days, 2, AuctionEngine.CycleFrequency.Weekly, 1 hours, 2, 10);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(AuctionEngine.InvalidAmount.selector));
        auction.createPot("X", 0, 1 days, 2, AuctionEngine.CycleFrequency.Weekly, 1 hours, 2, 10);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(AuctionEngine.InvalidCycleDuration.selector));
        auction.createPot("Y", 5 * UNIT, 10 minutes, 2, AuctionEngine.CycleFrequency.Weekly, 1 hours, 2, 10);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(AuctionEngine.InvalidBidDeadline.selector));
        auction.createPot("Z", 5 * UNIT, 1 days, 2, AuctionEngine.CycleFrequency.Weekly, 1 days, 2, 10);
    }

    // --------------------------------------
    // startCycle + payForCycle + escrow integration
    // --------------------------------------
    function testStartCycleRequiresMinMembersAndPayFlow() public {
        // create pot with minMembers = 3
        vm.prank(creator);
        uint256 pid =
            auction.createPot("StartTest", 10 * UNIT, 1 days, 2, AuctionEngine.CycleFrequency.Monthly, 1 hours, 3, 10);

        // currently only creator has joined => NotEnoughMembers
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(AuctionEngine.NotEnoughMembers.selector));
        auction.startCycle(pid);

        // add two more members
        vm.prank(alice);
        auction.joinPot(pid);
        vm.prank(bob);
        auction.joinPot(pid);

        // now startCycle ok
        vm.prank(creator);
        uint256 cid = auction.startCycle(pid);
        (uint256 potId,,,,, AuctionEngine.CycleStatus status,,) = auction.getCycleInfo(cid);
        assertEq(potId, pid);
        assertEq(uint256(status), uint256(AuctionEngine.CycleStatus.Active));

        // members must approve AuctionEngine to pull USDC
        vm.prank(alice);
        usdc.approve(address(auction), 10 * UNIT);

        vm.prank(bob);
        usdc.approve(address(auction), 10 * UNIT);

        // alice pays for cycle -> AuctionEngine.transferFrom alice to AuctionEngine, then AuctionEngine approves escrow and calls escrow.depositUSDC
        vm.prank(alice);
        auction.payForCycle(cid);

        // escrow should have recorded deposit via depositCounter and getDepositsForUser
        uint256[] memory userDeposits = escrow.getDepositsForUser(alice);
        assertTrue(userDeposits.length >= 1);

        // Escrow's pot funds principal must reflect deposited principal (via compound.supply)
        (uint256 totDeposited,,) = escrow.getPotFunds(potId);
        assertEq(
            totDeposited,
            10 * UNIT / 1 /* note: potFunds track in Escrow's logic; amount is passed as is */
        );
        // Note: the above assert may differ depending on internal accounting; at least ensure deposit list length > 0:
        assertGt(userDeposits.length, 0);
    }

    // --------------------------------------
    // bidding, close, declare winner flows
    // --------------------------------------
    function testBiddingAndDeclareWinnerLowestBid() public {
        // create pot and join
        vm.prank(creator);
        uint256 pid =
            auction.createPot("BidPot", 10 * UNIT, 1 days, 2, AuctionEngine.CycleFrequency.Weekly, 1 hours, 2, 5);

        vm.prank(alice);
        auction.joinPot(pid);
        vm.prank(bob);
        auction.joinPot(pid);

        // start cycle
        vm.prank(creator);
        uint256 cid = auction.startCycle(pid);

        // approve USDC for both and pay
        vm.prank(alice);
        usdc.approve(address(auction), 10 * UNIT);
        vm.prank(alice);
        auction.payForCycle(cid);

        vm.prank(bob);
        usdc.approve(address(auction), 10 * UNIT);
        vm.prank(bob);
        auction.payForCycle(cid);

        // place bids before bid deadline
        vm.prank(alice);
        auction.placeBid(cid, 2 * UNIT);

        vm.prank(bob);
        auction.placeBid(cid, 4 * UNIT);

        // warp to near close time (endTime - bidDepositDeadline)
        (,, uint256 endTime,,,,,) = auction.getCycleInfo(cid);
        vm.warp(endTime - (1 hours) + 2);

        // close bidding
        vm.prank(creator);
        auction.closeBidding(cid);

        // declare winner -> lowest bidder (alice)
        vm.prank(creator);
        address winner = auction.declareWinner(cid);
        assertEq(winner, alice);
    }

    // --------------------------------------
    // completeCycle: interest & release flows
    // --------------------------------------

    function testCompleteCycleRevertsIfWinnerNotDeclaredOrTooEarlyOrAlreadyCompleted() public {
        // create pot and join
        vm.prank(creator);
        uint256 pid = auction.createPot(
            "RevertComplete", 10 * UNIT, 1 days, 1, AuctionEngine.CycleFrequency.Weekly, 1 hours, 2, 5
        );
        vm.prank(alice);
        auction.joinPot(pid);
        vm.prank(bob);
        auction.joinPot(pid);

        vm.prank(creator);
        uint256 cid = auction.startCycle(pid);

        // try complete without winner
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(AuctionEngine.WinnerNotDeclared.selector));
        auction.completeCycle(cid);

        // pay and bid, close, declare
        vm.prank(alice);
        usdc.approve(address(auction), 10 * UNIT);
        vm.prank(alice);
        auction.payForCycle(cid);
        vm.prank(bob);
        usdc.approve(address(auction), 10 * UNIT);
        vm.prank(bob);
        auction.payForCycle(cid);

        vm.prank(alice);
        auction.placeBid(cid, 2 * UNIT);
        vm.prank(bob);
        auction.placeBid(cid, 3 * UNIT);

        (,, uint256 endTime,,,,,) = auction.getCycleInfo(cid);
        vm.warp(endTime - (1 hours) + 2);
        vm.prank(creator);
        auction.closeBidding(cid);
        vm.prank(creator);
        auction.declareWinner(cid);

        // try complete before endTime
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(AuctionEngine.CycleNotEnded.selector));
        auction.completeCycle(cid);

        // warp after endTime and complete
        vm.warp(endTime + 1);
        usdc.mint(address(escrow), 1000 * UNIT);
        vm.prank(creator);
        auction.completeCycle(cid);

        // second attempt should revert AlreadyCompleted
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(AuctionEngine.AlreadyCompleted.selector));
        auction.completeCycle(cid);
    }

    // --------------------------------------
    // view helpers sanity tests
    // --------------------------------------
    function testViewHelpersAndCounters() public {
        assertEq(auction.getCurrentPotCount(), 0);
        assertEq(auction.getCurrentCycleCount(), 0);
    }
}
