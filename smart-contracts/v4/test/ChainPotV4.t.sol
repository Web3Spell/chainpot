// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";

import {MemberRegistryV4} from "../src/MemberRegistryV4.sol";
import {LotteryEngineV4} from "../src/LotteryEngineV4.sol";
import {CompoundIntegratorV4} from "../src/CompoundIntegratorV4.sol";
import {VaultV4} from "../src/VaultV4.sol";
import {CircleEngineV4} from "../src/CircleEngineV4.sol";
import {AuctionEngineV4} from "../src/AuctionEngineV4.sol";
import {RoscaEngineBaseV4} from "../src/RoscaEngineBaseV4.sol";

import {MockUSDC} from "./mocks/MockUSDC.sol";
import {MockComet} from "./mocks/MockComet.sol";
import {MockVRFCoordinatorV2Plus} from "./mocks/MockVRFCoordinatorV2Plus.sol";

contract ChainPotV4Test is Test {
    MockUSDC usdc;
    MockComet comet;
    MockVRFCoordinatorV2Plus vrf;

    MemberRegistryV4 registry;
    LotteryEngineV4 lottery;
    CompoundIntegratorV4 integrator;
    VaultV4 vault;
    CircleEngineV4 circle;
    AuctionEngineV4 auction;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address carol = address(0xCa401);
    address dave = address(0xDA7E);
    address eve = address(0xE3E); // outsider, not in roster

    address[] roster;
    bytes32 root;
    mapping(address => bytes32[]) proofs;

    uint256 constant AMT = 100e6; // 100 USDC
    uint256 constant CYCLE = 7 days;
    uint256 constant PAY_WINDOW = 1 days;
    uint256 constant BID_WINDOW = 2 days;

    function setUp() public {
        usdc = new MockUSDC();
        comet = new MockComet();
        vrf = new MockVRFCoordinatorV2Plus();

        registry = new MemberRegistryV4();
        lottery = new LotteryEngineV4(address(vrf), 1, keccak256("kh"));
        integrator = new CompoundIntegratorV4(address(comet), address(usdc));
        vault = new VaultV4(address(usdc), address(integrator));
        circle = new CircleEngineV4(address(registry), address(vault), address(lottery));
        auction = new AuctionEngineV4(address(registry), address(vault), address(lottery));

        integrator.setVault(address(vault));
        vault.setEngine(address(circle), true);
        vault.setEngine(address(auction), true);
        registry.setAuthorizedCaller(address(circle), true);
        registry.setAuthorizedCaller(address(auction), true);
        lottery.setAuthorizedRequester(address(circle), true);
        lottery.setAuthorizedRequester(address(auction), true);

        roster.push(alice);
        roster.push(bob);
        roster.push(carol);
        roster.push(dave);
        _buildTree4();

        for (uint256 i = 0; i < roster.length; i++) {
            address m = roster[i];
            vm.prank(m);
            registry.registerMember();
            usdc.mint(m, 10_000e6);
            vm.prank(m);
            usdc.approve(address(vault), type(uint256).max);
        }
        vm.prank(eve);
        registry.registerMember();
    }

    // ---------- Merkle helpers ----------

    function _leaf(address a) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(a))));
    }

    function _hp(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a <= b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }

    function _buildTree4() internal {
        bytes32 l0 = _leaf(roster[0]);
        bytes32 l1 = _leaf(roster[1]);
        bytes32 l2 = _leaf(roster[2]);
        bytes32 l3 = _leaf(roster[3]);
        bytes32 n01 = _hp(l0, l1);
        bytes32 n23 = _hp(l2, l3);
        root = _hp(n01, n23);

        proofs[roster[0]].push(l1);
        proofs[roster[0]].push(n23);
        proofs[roster[1]].push(l0);
        proofs[roster[1]].push(n23);
        proofs[roster[2]].push(l3);
        proofs[roster[2]].push(n01);
        proofs[roster[3]].push(l2);
        proofs[roster[3]].push(n01);
    }

    // ---------- Shared flow helpers ----------

    function _createCircle(bool perCycleVRF) internal returns (uint256 potId) {
        vm.prank(alice);
        potId = circle.createPot(root, 4, AMT, CYCLE, PAY_WINDOW, perCycleVRF);
    }

    function _joinAll(CircleEngineOrAuction kind, uint256 potId) internal {
        for (uint256 i = 0; i < roster.length; i++) {
            address m = roster[i];
            vm.prank(m);
            if (kind == CircleEngineOrAuction.Circle) {
                circle.joinPot(potId, proofs[m]);
            } else {
                auction.joinPot(potId, proofs[m]);
            }
        }
    }

    enum CircleEngineOrAuction {
        Circle,
        Auction
    }

    function _payAllCircle(uint256 potId) internal {
        for (uint256 i = 0; i < roster.length; i++) {
            vm.prank(roster[i]);
            circle.payForCycle(potId);
        }
    }

    // ---------- C-01: invite gate ----------

    function test_C01_inviteGate_blocksUninvited() public {
        uint256 potId = _createCircle(false);
        bytes32[] memory empty = new bytes32[](2);
        vm.prank(eve);
        vm.expectRevert(RoscaEngineBaseV4.InvalidProof.selector);
        circle.joinPot(potId, empty);
    }

    function test_C01_invitedMemberCanJoin() public {
        uint256 potId = _createCircle(false);
        vm.prank(alice);
        circle.joinPot(potId, proofs[alice]);
        assertTrue(circle.isMember(potId, alice));
    }

    // ---------- M-05: fixed roster ----------

    function test_M05_createRejectsBadMemberCount() public {
        vm.prank(alice);
        vm.expectRevert(RoscaEngineBaseV4.InvalidParams.selector);
        circle.createPot(root, 1, AMT, CYCLE, PAY_WINDOW, false);
    }

    function test_M05_startRevertsIfRosterIncomplete() public {
        uint256 potId = _createCircle(false);
        vm.prank(alice);
        circle.joinPot(potId, proofs[alice]);
        vm.prank(alice);
        vm.expectRevert(RoscaEngineBaseV4.RosterIncomplete.selector);
        circle.startPot(potId);
    }

    // ---------- roster freeze ----------

    function test_rosterFrozenAfterStart() public {
        uint256 potId = _startedCircle(false);
        vm.prank(alice);
        vm.expectRevert(RoscaEngineBaseV4.PotNotOpen.selector);
        circle.updateMerkleRoot(potId, keccak256("new"));
    }

    function _startedCircle(bool perCycleVRF) internal returns (uint256 potId) {
        potId = _createCircle(perCycleVRF);
        _joinAll(CircleEngineOrAuction.Circle, potId);
        vm.prank(alice);
        circle.startPot(potId);
        if (!perCycleVRF) {
            // fulfill the shuffle seed (first VRF request -> id 1)
            vrf.fulfill(address(lottery), 1, uint256(keccak256("seed")));
        }
        return potId;
    }

    // ---------- M-06: payment deadline ----------

    function test_M06_payAfterDeadlineReverts() public {
        uint256 potId = _startedCircle(false);
        vm.prank(alice);
        circle.startCycle(potId);
        vm.warp(block.timestamp + PAY_WINDOW + 1);
        vm.prank(alice);
        vm.expectRevert(RoscaEngineBaseV4.PaymentWindowClosed.selector);
        circle.payForCycle(potId);
    }

    // ---------- C-01 / §4.2: default -> blacklist + excluded ----------

    function test_C01_nonPayerDefaultedAndBlacklisted() public {
        uint256 potId = _startedCircle(false);
        vm.prank(alice);
        circle.startCycle(potId);
        // alice, bob, carol pay; dave does not
        vm.prank(alice);
        circle.payForCycle(potId);
        vm.prank(bob);
        circle.payForCycle(potId);
        vm.prank(carol);
        circle.payForCycle(potId);

        vm.warp(block.timestamp + PAY_WINDOW + 1);
        circle.settleCycle(potId);

        assertTrue(circle.defaulted(potId, dave));
        assertTrue(registry.isBlacklisted(dave));
        assertEq(circle.eligibleCount(potId, 1), 3);
    }

    // ---------- happy path circle + conservation ----------

    function test_circle_fullPot_eachWinsOnce_conservation() public {
        uint256 potId = _startedCircle(false);
        uint256 totalCredited;

        for (uint256 cyc = 1; cyc <= 4; cyc++) {
            vm.prank(alice);
            circle.startCycle(potId);
            _payAllCircle(potId);
            // simulate 4 USDC interest accrued on this cycle's deposits
            comet.simulateInterest(address(integrator), 4e6);
            skip(PAY_WINDOW + 1);
            circle.drawWinner(potId);
            skip(1); // advance for next cycle
        }

        // every member won exactly once
        uint256 winners;
        for (uint256 i = 0; i < roster.length; i++) {
            if (circle.hasWonInPot(potId, roster[i])) winners++;
            totalCredited += vault.withdrawable(roster[i]);
        }
        assertEq(winners, 4, "each member wins once");

        // pot completed
        (,,,,, RoscaEngineBaseV4.PotStatus status,,,) = circle.getPot(potId);
        assertEq(uint256(status), uint256(RoscaEngineBaseV4.PotStatus.Completed));

        // conservation: all harvested funds are credited; backing drained; vault USDC backs credits
        assertEq(vault.backing(), 0, "backing drained");
        assertEq(vault.totalWithdrawableOutstanding(), totalCredited);

        // everyone claims; vault empties
        for (uint256 i = 0; i < roster.length; i++) {
            vm.prank(roster[i]);
            vault.claim();
        }
        assertEq(vault.totalWithdrawableOutstanding(), 0);
        assertEq(usdc.balanceOf(address(vault)), 0, "vault fully drained after claims");
    }

    // ---------- H-04: pull payments — blacklisted recipient cannot brick ----------

    function test_H04_blacklistedRecipientDoesNotBrick() public {
        uint256 potId = _startedCircle(false);
        vm.prank(alice);
        circle.startCycle(potId);
        _payAllCircle(potId);
        comet.simulateInterest(address(integrator), 4e6);
        // block bob at the USDC level (simulates USDC blacklist)
        usdc.setBlocked(bob, true);

        vm.warp(block.timestamp + PAY_WINDOW + 1);
        // finalization must NOT revert despite bob being USDC-blacklisted (pull, not push)
        circle.drawWinner(potId);

        (,,,,,, address winner,) = circle.getCycle(potId, 1);
        assertTrue(winner != address(0), "cycle finalized");

        // unblocked members can claim; bob's own claim reverts but never blocked the pot
        usdc.setBlocked(bob, true);
        if (winner != bob) {
            vm.prank(winner);
            vault.claim();
        }
        vm.prank(bob);
        vm.expectRevert(bytes("USDC: blacklisted"));
        vault.claim();
    }

    // ---------- invariant #11: blacklist gates joins, never claims ----------

    function test_blacklistGatesJoin_butAllowsClaim() public {
        uint256 potId = _startedCircle(false);
        vm.prank(alice);
        circle.startCycle(potId);
        _payAllCircle(potId);
        vm.warp(block.timestamp + PAY_WINDOW + 1);
        circle.drawWinner(potId);
        (,,,,,, address winner,) = circle.getCycle(potId, 1);

        // governance blacklists the winner
        registry.setBlacklist(winner, true);
        // they can still claim already-earned funds
        uint256 owed = vault.withdrawable(winner);
        assertGt(owed, 0);
        vm.prank(winner);
        vault.claim();
        assertEq(vault.withdrawable(winner), 0);
    }

    // ---------- C-02: VRF economic gate (perCycleVRF) ----------

    function test_C02_singleEligibleAssignsDirectNoVRF() public {
        uint256 potId = _startedCircle(true); // perCycleVRF
        vm.prank(alice);
        circle.startCycle(potId);
        // only alice pays; others default -> 1 eligible -> direct assign, NO vrf request
        vm.prank(alice);
        circle.payForCycle(potId);
        vm.warp(block.timestamp + PAY_WINDOW + 1);
        uint256 reqBefore = vrf.nextRequestId();
        circle.drawWinner(potId);
        assertEq(vrf.nextRequestId(), reqBefore, "no VRF spent for single eligible");
        assertTrue(circle.hasWonInPot(potId, alice));
    }

    function test_C02_twoEligibleUsesVRF() public {
        uint256 potId = _startedCircle(true);
        vm.prank(alice);
        circle.startCycle(potId);
        vm.prank(alice);
        circle.payForCycle(potId);
        vm.prank(bob);
        circle.payForCycle(potId);
        vm.warp(block.timestamp + PAY_WINDOW + 1);
        uint256 reqId = vrf.nextRequestId();
        circle.drawWinner(potId); // should request VRF
        vrf.fulfill(address(lottery), reqId, 0); // winner = eligible[0]
        // exactly one of the two eligible won
        assertTrue(circle.hasWonInPot(potId, alice) || circle.hasWonInPot(potId, bob));
    }

    // ---------- Auction: H-01, H-03, M-01, M-03 ----------

    function _startedAuction() internal returns (uint256 potId) {
        vm.prank(alice);
        potId = auction.createPot(root, 4, AMT, CYCLE, PAY_WINDOW, BID_WINDOW);
        _joinAll(CircleEngineOrAuction.Auction, potId);
        vm.prank(alice);
        auction.startPot(potId);
        vm.prank(alice);
        auction.startCycle(potId);
        for (uint256 i = 0; i < roster.length; i++) {
            vm.prank(roster[i]);
            auction.payForCycle(potId);
        }
    }

    function test_H03_overBidReverts() public {
        uint256 potId = _startedAuction();
        // totalCollected = 400 USDC; bidding >= that must revert
        vm.prank(alice);
        vm.expectRevert(AuctionEngineV4.BidTooHigh.selector);
        auction.placeBid(potId, 400e6);
    }

    function test_M03_minStepEnforced() public {
        uint256 potId = _startedAuction();
        vm.prank(alice);
        auction.placeBid(potId, 300e6);
        // bob must beat 300 by >= 2% (>= 6 USDC). 299 is too high.
        vm.prank(bob);
        vm.expectRevert(AuctionEngineV4.BidTooHigh.selector);
        auction.placeBid(potId, 299e6);
        // 294 is exactly 2% lower — accepted
        vm.prank(bob);
        auction.placeBid(potId, 294e6);
        assertEq(auction.lowestBidder(potId, 1), bob);
    }

    function test_M01_lowestBidderCannotRaise() public {
        uint256 potId = _startedAuction();
        vm.prank(alice);
        auction.placeBid(potId, 300e6);
        // alice (the standing lowest) tries to raise -> rejected (cannot beat own standing by step up)
        vm.prank(alice);
        vm.expectRevert(AuctionEngineV4.BidTooHigh.selector);
        auction.placeBid(potId, 320e6);
    }

    function test_H01_winnerCannotBidAgain() public {
        uint256 potId = _startedAuction();
        vm.prank(alice);
        auction.placeBid(potId, 250e6);
        vm.warp(block.timestamp + BID_WINDOW + 1);
        auction.declareWinner(potId); // alice wins cycle 1
        assertTrue(auction.hasWonInPot(potId, alice));

        // cycle 2
        vm.prank(bob);
        auction.startCycle(potId);
        for (uint256 i = 0; i < roster.length; i++) {
            vm.prank(roster[i]);
            auction.payForCycle(potId);
        }
        vm.prank(alice);
        vm.expectRevert(RoscaEngineBaseV4.AlreadyWonThisPot.selector);
        auction.placeBid(potId, 200e6);
    }

    // ---------- H-05: integrator revert-on-zero-shares / inflation guard ----------

    function test_H05_zeroSharesReverts() public {
        // standalone integrator with this test as the "vault"
        CompoundIntegratorV4 ig = new CompoundIntegratorV4(address(comet), address(usdc));
        ig.setVault(address(this));
        usdc.mint(address(this), 1_000_000e6);
        usdc.approve(address(ig), type(uint256).max);

        ig.supply(1); // 1 wei -> mints virtual-offset shares, fine
        // inflate realized assets massively via donation
        comet.simulateInterest(address(ig), 1_000_000e6);
        // a tiny deposit now rounds to zero shares -> must revert
        vm.expectRevert(CompoundIntegratorV4.ZeroShares.selector);
        ig.supply(1);
    }

    function test_H05_roundTripPreservesValue() public {
        CompoundIntegratorV4 ig = new CompoundIntegratorV4(address(comet), address(usdc));
        ig.setVault(address(this));
        usdc.mint(address(this), 1_000e6);
        usdc.approve(address(ig), type(uint256).max);

        uint256 shares = ig.supply(500e6);
        uint256 got = ig.withdraw(shares);
        assertApproxEqAbs(got, 500e6, 1);
    }

    // ---------- M-02: repeat bids gain no reputation ----------

    function test_M02_repeatBid_noRep() public {
        uint256 potId = _startedAuction();
        uint256 repBefore = registry.getReputationScore(alice);
        // alice's first bid: should gain +1 rep
        vm.prank(alice);
        auction.placeBid(potId, 300e6);
        uint256 repAfterFirst = registry.getReputationScore(alice);
        assertEq(repAfterFirst, repBefore + 1, "first bid earns rep");

        // bob outbids alice so alice can re-bid
        vm.prank(bob);
        auction.placeBid(potId, 290e6);

        // alice re-bids (lower than own previous 300): should gain NO additional rep
        vm.prank(alice);
        auction.placeBid(potId, 280e6);
        uint256 repAfterSecond = registry.getReputationScore(alice);
        assertEq(repAfterSecond, repAfterFirst, "repeat bid earns no extra rep");
    }

    // ---------- NEW-2: leavePot reverts when paused ----------

    function test_NEW2_leavePotRevertsWhenPaused() public {
        uint256 potId = _createCircle(false);
        vm.prank(alice);
        circle.joinPot(potId, proofs[alice]);
        assertTrue(circle.isMember(potId, alice));

        // owner pauses the circle engine
        circle.pause();

        // alice tries to leave while paused -> must revert
        vm.prank(alice);
        vm.expectRevert(); // Pausable: EnforcedPause
        circle.leavePot(potId);

        // unpause -> alice can leave
        circle.unpause();
        vm.prank(alice);
        circle.leavePot(potId);
        assertFalse(circle.isMember(potId, alice));
    }

    // ---------- NEW-3: VRF timeout retry before early-complete ----------

    function test_NEW3_vrfTimeout_retryBeforeEarlyComplete() public {
        uint256 potId = _startedCircle(true); // perCycleVRF
        vm.prank(alice);
        circle.startCycle(potId);
        // alice and bob pay -> 2 eligible -> VRF will be requested
        vm.prank(alice);
        circle.payForCycle(potId);
        vm.prank(bob);
        circle.payForCycle(potId);
        vm.warp(block.timestamp + PAY_WINDOW + 1);

        uint256 reqId1 = vrf.nextRequestId();
        circle.drawWinner(potId); // requests VRF (reqId1)

        // Simulate VRF timeout (1 day)
        vm.warp(block.timestamp + 1 days + 1);

        // First cancel -> should RETRY (re-request VRF), NOT kill the pot
        uint256 reqId2 = vrf.nextRequestId();
        circle.cancelStuckVRFCycle(potId);

        // Verify cycle is back in AwaitingVRF (the retry re-requested VRF)
        (,,,,,RoscaEngineBaseV4.CycleStatus status,,) = circle.getCycle(potId, 1);
        assertEq(uint256(status), uint256(RoscaEngineBaseV4.CycleStatus.AwaitingVRF), "retry re-requested VRF");

        // Now fulfill the retry VRF -> winner should be selected
        vrf.fulfill(address(lottery), reqId2, 42);
        assertTrue(
            circle.hasWonInPot(potId, alice) || circle.hasWonInPot(potId, bob),
            "retry VRF fulfilled -> winner selected"
        );

        // Pot should NOT be completed (normal cycle completion, not early-complete)
        (,,,,, RoscaEngineBaseV4.PotStatus potStatus,,,) = circle.getPot(potId);
        assertEq(uint256(potStatus), uint256(RoscaEngineBaseV4.PotStatus.Active), "pot still active after retry");
    }

    // ---------- Safety Module: treasury receives 20% of yield ----------

    function test_safetyModule_treasuryReceives20PercentYield() public {
        address treasuryAddr = address(0x77EA5);
        vault.setTreasury(treasuryAddr);

        uint256 potId = _startedCircle(false);
        vm.prank(alice);
        circle.startCycle(potId);
        _payAllCircle(potId);

        // Simulate 100 USDC of Compound interest on this cycle's 400 USDC deposits
        comet.simulateInterest(address(integrator), 100e6);

        vm.warp(block.timestamp + PAY_WINDOW + 1);
        circle.drawWinner(potId);

        // Treasury should have 20% of 100 USDC = 20 USDC
        uint256 treasuryBalance = vault.withdrawable(treasuryAddr);
        assertEq(treasuryBalance, 20e6, "treasury gets 20% of yield");
        assertEq(vault.treasuryAccrued(), 20e6, "treasuryAccrued tracks cumulative");

        // Members (winner + interest recipients) should split the remaining 480 USDC (400 principal + 80 interest)
        uint256 totalMemberCredits;
        for (uint256 i = 0; i < roster.length; i++) {
            totalMemberCredits += vault.withdrawable(roster[i]);
        }
        assertEq(totalMemberCredits, 480e6, "members get principal + 80% of yield");

        // Conservation: backing = 0, total withdrawable = 500 (480 members + 20 treasury)
        assertEq(vault.backing(), 0, "backing drained");
        assertEq(vault.totalWithdrawableOutstanding(), 500e6, "total = members + treasury");
    }

    function test_safetyModule_noYield_noTreasuryFee() public {
        address treasuryAddr = address(0x77EA5);
        vault.setTreasury(treasuryAddr);

        uint256 potId = _startedCircle(false);
        vm.prank(alice);
        circle.startCycle(potId);
        _payAllCircle(potId);

        // NO interest simulated -> yield = 0

        vm.warp(block.timestamp + PAY_WINDOW + 1);
        circle.drawWinner(potId);

        // Treasury should get NOTHING (no yield to skim)
        assertEq(vault.withdrawable(treasuryAddr), 0, "no yield -> no treasury fee");
        assertEq(vault.treasuryAccrued(), 0, "no accrual");
    }

    function test_safetyModule_treasuryClaims() public {
        address treasuryAddr = address(0x77EA5);
        vault.setTreasury(treasuryAddr);

        uint256 potId = _startedCircle(false);
        vm.prank(alice);
        circle.startCycle(potId);
        _payAllCircle(potId);
        comet.simulateInterest(address(integrator), 50e6);

        vm.warp(block.timestamp + PAY_WINDOW + 1);
        circle.drawWinner(potId);

        // Treasury should have 20% of 50 = 10 USDC
        uint256 owed = vault.withdrawable(treasuryAddr);
        assertEq(owed, 10e6, "treasury credited");

        // Treasury claims
        vm.prank(treasuryAddr);
        vault.claim();
        assertEq(vault.withdrawable(treasuryAddr), 0, "treasury claimed");
        assertEq(usdc.balanceOf(treasuryAddr), 10e6, "treasury received USDC");
    }
}
