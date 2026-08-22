// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";

import {MemberRegistryV4} from "../src/MemberRegistryV4.sol";
import {VRFProviderV4} from "../src/VRFProviderV4.sol";
import {CompoundIntegratorV4} from "../src/CompoundIntegratorV4.sol";
import {VaultV4} from "../src/VaultV4.sol";
import {CircleEngineV4} from "../src/CircleEngineV4.sol";
import {AuctionEngineV4} from "../src/AuctionEngineV4.sol";
import {RoscaEngineBaseV4} from "../src/RoscaEngineBaseV4.sol";

import {MockUSDC} from "./mocks/MockUSDC.sol";
import {MockComet} from "./mocks/MockComet.sol";
import {MockVRFCoordinatorV2Plus} from "./mocks/MockVRFCoordinatorV2Plus.sol";

contract ChainPotV4Test is Test {
    VaultV4 vault;
    CompoundIntegratorV4 integrator;
    MemberRegistryV4 registry;
    CircleEngineV4 circle;
    AuctionEngineV4 auction;
    VRFProviderV4 lottery;
    MockComet comet;
    MockVRFCoordinatorV2Plus vrf;
    MockUSDC usdc;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address carol = address(0xCa401);
    address dave = address(0xDA7E);
    address eve = address(0xE3E); // outsider, not in roster
    address treasuryAddr = address(0x77EA5);

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

        integrator = new CompoundIntegratorV4(address(comet), address(usdc));
        vault = new VaultV4(address(usdc), address(integrator), treasuryAddr); // F-13

        registry = new MemberRegistryV4();
        lottery = new VRFProviderV4(address(vrf), 1, keccak256("kh"));
        circle = new CircleEngineV4(address(registry), address(vault), address(lottery));
        auction = new AuctionEngineV4(address(registry), address(vault), address(lottery));

        integrator.setVault(address(vault)); // F-03: one-time
        vault.setEngine(address(circle), true);
        vault.setEngine(address(auction), true);
        vault.lockEngineSetup(); // F-03
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

    /// @dev Generic commutative Merkle tree (odd nodes promoted) — proofs verify with OZ MerkleProof.
    function _buildTreeGeneric(address[] memory addrs)
        internal
        pure
        returns (bytes32 rootOut, bytes32[][] memory proofsOut)
    {
        uint256 n = addrs.length;
        bytes32[] memory level = new bytes32[](n);
        for (uint256 i = 0; i < n; i++) {
            level[i] = _leaf(addrs[i]);
        }
        uint256 depth;
        for (uint256 m = n; m > 1; m = (m + 1) / 2) {
            depth++;
        }
        proofsOut = new bytes32[][](n);
        uint256[] memory pos = new uint256[](n);
        uint256[] memory plen = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            proofsOut[i] = new bytes32[](depth);
            pos[i] = i;
        }
        while (level.length > 1) {
            uint256 m = level.length;
            bytes32[] memory next = new bytes32[]((m + 1) / 2);
            for (uint256 i = 0; i < m; i += 2) {
                next[i / 2] = (i + 1 < m) ? _hp(level[i], level[i + 1]) : level[i];
            }
            for (uint256 k = 0; k < n; k++) {
                uint256 p = pos[k];
                uint256 sib = p ^ 1;
                if (sib < m) proofsOut[k][plen[k]++] = level[sib];
                pos[k] = p / 2;
            }
            level = next;
        }
        rootOut = level[0];
        for (uint256 k = 0; k < n; k++) {
            bytes32[] memory pr = proofsOut[k];
            uint256 l = plen[k];
            assembly {
                mstore(pr, l)
            }
        }
    }

    // ---------- Shared flow helpers ----------

    function _createCircle() internal returns (uint256 potId) {
        vm.prank(alice);
        potId = circle.createPot(root, 4, AMT, CYCLE, PAY_WINDOW);
    }

    function _createCircle(bool) internal returns (uint256 potId) {
        return _createCircle();
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

    function _startedCircle() internal returns (uint256 potId) {
        potId = _createCircle();
        _joinAll(CircleEngineOrAuction.Circle, potId);
        vm.prank(alice);
        circle.startPot(potId);
        return potId;
    }

    function _startedCircle(bool) internal returns (uint256 potId) {
        return _startedCircle();
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
        circle.createPot(root, 1, AMT, CYCLE, PAY_WINDOW);
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

    // ---------- C-01 / F-05: default -> slash + pot exclusion; blacklist only on REPEAT default ----------

    function test_C01_F05_defaultSlashesAndExcludes_blacklistOnlyOnRepeat() public {
        uint256 repBefore = registry.getReputationScore(dave);

        // Pot 1: dave defaults
        uint256 potId = _startedCircle(false);
        vm.prank(alice);
        circle.startCycle(potId);
        vm.prank(alice);
        circle.payForCycle(potId);
        vm.prank(bob);
        circle.payForCycle(potId);
        vm.prank(carol);
        circle.payForCycle(potId);

        vm.warp(block.timestamp + PAY_WINDOW + 1);
        circle.settleCycle(potId);

        assertTrue(circle.defaulted(potId, dave), "dave defaulted in pot 1");
        assertEq(circle.eligibleCount(potId, 1), 3, "dave excluded from eligibility");
        assertEq(registry.defaultCount(dave), 1, "one default recorded");
        assertLt(registry.getReputationScore(dave), repBefore, "reputation slashed");
        // F-05: a single missed payment is a POT-level event, not a permanent protocol-wide ban
        assertFalse(registry.isBlacklisted(dave), "single default does NOT blacklist");
        assertTrue(registry.canJoin(dave), "dave can still join new pots after one default");

        // Pot 2: dave defaults AGAIN -> repeat offender -> global blacklist
        uint256 pot2 = _createCircle(false);
        _joinAll(CircleEngineOrAuction.Circle, pot2);
        vm.prank(alice);
        circle.startPot(pot2);

        vm.prank(alice);
        circle.startCycle(pot2);
        vm.prank(alice);
        circle.payForCycle(pot2);
        vm.prank(bob);
        circle.payForCycle(pot2);
        vm.prank(carol);
        circle.payForCycle(pot2);
        vm.warp(block.timestamp + PAY_WINDOW + 1);
        circle.settleCycle(pot2);

        assertEq(registry.defaultCount(dave), 2, "second default recorded");
        assertTrue(registry.isBlacklisted(dave), "repeat defaulter IS blacklisted");
        assertFalse(registry.canJoin(dave), "blacklist gates joins");
    }

    // ---------- happy path circle + conservation ----------

    function test_circle_fullPot_eachWinsOnce_conservation() public {
        uint256 potId = _startedCircle(false);

        for (uint256 cyc = 1; cyc <= 4; cyc++) {
            circle.startCycle(potId);
            _payAllCircle(potId);
            // simulate 4 USDC interest accrued on this cycle's deposits
            comet.simulateInterest(address(integrator), 4e6);
            skip(PAY_WINDOW + 1);
            uint256 rid = vrf.nextRequestId();
            circle.drawWinner(potId);
            if (circle.eligibleCount(potId, cyc) >= 2) {
                vrf.fulfill(address(lottery), rid, cyc);
                circle.finalizeDraw(potId);
            }
            assertEq(vault.backing(), 0, "F-06 invariant: backing fully drained every finalization");
            skip(CYCLE); // F-08: respect the enforced cadence
        }

        // every member won exactly once
        uint256 winners;
        uint256 totalCredited;
        for (uint256 i = 0; i < roster.length; i++) {
            if (circle.hasWonInPot(potId, roster[i])) winners++;
            totalCredited += vault.withdrawable(roster[i]);
        }
        assertEq(winners, 4, "each member wins once");

        // pot completed
        (,,,,, RoscaEngineBaseV4.PotStatus status,,,) = circle.getPot(potId);
        assertEq(uint256(status), uint256(RoscaEngineBaseV4.PotStatus.Completed));

        // conservation: everything harvested is claimable by members + treasury; nothing strands
        assertEq(vault.backing(), 0, "backing drained");
        assertEq(vault.totalWithdrawableOutstanding(), totalCredited + vault.withdrawable(treasuryAddr));

        // everyone claims (incl. treasury); vault empties to the last wei
        for (uint256 i = 0; i < roster.length; i++) {
            vm.prank(roster[i]);
            vault.claim();
        }
        vm.prank(treasuryAddr);
        vault.claim();
        assertEq(vault.totalWithdrawableOutstanding(), 0);
        assertEq(usdc.balanceOf(address(vault)), 0, "vault fully drained after claims");
    }

    // ---------- H-04: pull payments — blacklisted recipient cannot brick ----------

    function test_H04_blacklistedRecipientDoesNotBrick() public {
        uint256 potId = _startedCircle(false);
        circle.startCycle(potId);
        _payAllCircle(potId);
        comet.simulateInterest(address(integrator), 4e6);
        // block bob at the USDC level (simulates USDC blacklist)
        usdc.setBlocked(bob, true);

        vm.warp(block.timestamp + PAY_WINDOW + 1);
        // finalization must NOT revert despite bob being USDC-blacklisted (pull, not push)
        uint256 rid = vrf.nextRequestId();
        circle.drawWinner(potId);
        vrf.fulfill(address(lottery), rid, 1);
        circle.finalizeDraw(potId);

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
        circle.startCycle(potId);
        _payAllCircle(potId);
        vm.warp(block.timestamp + PAY_WINDOW + 1);
        uint256 rid = vrf.nextRequestId();
        circle.drawWinner(potId);
        vrf.fulfill(address(lottery), rid, 1);
        circle.finalizeDraw(potId);
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
        circle.startCycle(potId);
        vm.prank(alice);
        circle.payForCycle(potId);
        vm.prank(bob);
        circle.payForCycle(potId);
        vm.warp(block.timestamp + PAY_WINDOW + 1);
        uint256 reqId = vrf.nextRequestId();
        circle.drawWinner(potId); // should request VRF
        vrf.fulfill(address(lottery), reqId, 0); // stores the word (F-01)
        circle.finalizeDraw(potId); // settles with full gas (F-01)
        // exactly one of the two eligible won
        assertTrue(circle.hasWonInPot(potId, alice) || circle.hasWonInPot(potId, bob));
    }

    // ---------- F-01: store-then-finalize VRF ----------

    function test_F01_wordStored_thenPermissionlessFinalize() public {
        uint256 potId = _startedCircle(true);
        circle.startCycle(potId);
        vm.prank(alice);
        circle.payForCycle(potId);
        vm.prank(bob);
        circle.payForCycle(potId);
        vm.warp(block.timestamp + PAY_WINDOW + 1);

        uint256 reqId = vrf.nextRequestId();
        circle.drawWinner(potId); // requests VRF

        // finalize before the word arrives -> must revert
        vm.expectRevert(RoscaEngineBaseV4.RandomnessNotReady.selector);
        circle.finalizeDraw(potId);
        assertFalse(circle.drawReady(potId));

        // delivery stores the word but does NOT settle
        vrf.fulfill(address(lottery), reqId, 7);
        (,,,,, RoscaEngineBaseV4.CycleStatus st,,) = circle.getCycle(potId, 1);
        assertEq(uint256(st), uint256(RoscaEngineBaseV4.CycleStatus.AwaitingVRF), "callback only stores");
        assertTrue(circle.drawReady(potId));

        // anyone settles with full gas
        vm.prank(eve);
        circle.finalizeDraw(potId);
        (,,,,, st,, ) = circle.getCycle(potId, 1);
        assertEq(uint256(st), uint256(RoscaEngineBaseV4.CycleStatus.Completed));
        assertTrue(circle.hasWonInPot(potId, alice) || circle.hasWonInPot(potId, bob));
    }

    // ---------- F-01/F-02 regression at scale: 100 members under a 500k callback budget ----------

    function _bigRoster(uint256 n) internal returns (address[] memory addrs, bytes32[][] memory prfs, bytes32 rt) {
        addrs = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            address m = address(uint160(0x100000 + i));
            addrs[i] = m;
            vm.prank(m);
            registry.registerMember();
            usdc.mint(m, 10_000e6);
            vm.prank(m);
            usdc.approve(address(vault), type(uint256).max);
        }
        (rt, prfs) = _buildTreeGeneric(addrs);
    }

    function test_F01_largeCircle_perCycleVRF_survives500kCallback() public {
        uint256 N = 100;
        (address[] memory addrs, bytes32[][] memory prfs, bytes32 rt) = _bigRoster(N);

        vm.prank(alice);
        uint256 potId = circle.createPot(rt, N, AMT, CYCLE, PAY_WINDOW);
        for (uint256 i = 0; i < N; i++) {
            vm.prank(addrs[i]);
            circle.joinPot(potId, prfs[i]);
        }
        vm.prank(alice);
        circle.startPot(potId);
        circle.startCycle(potId);
        for (uint256 i = 0; i < N; i++) {
            vm.prank(addrs[i]);
            circle.payForCycle(potId);
        }
        comet.simulateInterest(address(integrator), 10e6);
        vm.warp(block.timestamp + PAY_WINDOW + 1);

        uint256 reqId = vrf.nextRequestId();
        circle.drawWinner(potId); // 100 eligible -> VRF

        // Pre-fix: harvest + 100 credits ran INSIDE this 500k budget and always OOG'd.
        bool ok = vrf.fulfillWithGas(address(lottery), reqId, 424242, 500_000);
        assertTrue(ok, "word delivery fits the 500k callback budget");
        assertTrue(circle.drawReady(potId));

        circle.finalizeDraw(potId); // settle with full gas
        (,,,,,, address winner,) = circle.getCycle(potId, 1);
        assertTrue(winner != address(0), "100-member VRF draw finalizes");
        assertEq(vault.backing(), 0);
    }

    // ---------- F-03: custody hardening ----------

    function test_F03_integratorVaultBindingIsOneTime() public {
        vm.expectRevert(CompoundIntegratorV4.VaultAlreadySet.selector);
        integrator.setVault(address(this)); // owner can no longer re-point custody
    }

    function test_F03_engineAdditionsTimelockedAfterLock() public {
        address newEngine = address(0xEA61E);

        // instant addition is locked
        vm.expectRevert(VaultV4.EngineSetupIsLocked.selector);
        vault.setEngine(newEngine, true);

        // must go through the observable 2-day timelock
        vault.proposeEngine(newEngine);
        vm.expectRevert(VaultV4.EngineNotReady.selector);
        vault.executeEngine(newEngine);

        vm.warp(block.timestamp + 2 days + 1);
        vault.executeEngine(newEngine);
        assertTrue(vault.isEngine(newEngine));

        // removals stay instant (defensive)
        vault.setEngine(newEngine, false);
        assertFalse(vault.isEngine(newEngine));
    }

    // ---------- F-04: pause extends deadlines; no pause-induced defaults ----------

    function test_F04_pauseExtendsPaymentDeadline() public {
        uint256 potId = _startedCircle(false);
        circle.startCycle(potId);
        vm.prank(alice);
        circle.payForCycle(potId);

        // Emergency pause for 3 days, straddling the original 1-day deadline
        circle.pause();
        vm.warp(block.timestamp + 3 days);
        circle.unpause();

        // bob would have been defaulted pre-fix; now the deadline is extended by the pause time
        vm.prank(bob);
        circle.payForCycle(potId);
        vm.prank(carol);
        circle.payForCycle(potId);
        vm.prank(dave);
        circle.payForCycle(potId);

        // settlement respects the EFFECTIVE deadline too
        vm.expectRevert(RoscaEngineBaseV4.PaymentWindowOpen.selector);
        circle.settleCycle(potId);

        vm.warp(block.timestamp + PAY_WINDOW + 1);
        circle.settleCycle(potId);
        assertEq(circle.eligibleCount(potId, 1), 4, "nobody defaulted because of the pause");
    }

    // ---------- F-05: minimum payment window ----------

    function test_F05_minPaymentWindowEnforced() public {
        vm.prank(alice);
        vm.expectRevert(RoscaEngineBaseV4.InvalidParams.selector);
        circle.createPot(root, 4, AMT, CYCLE, 1 hours); // hostile 1-hour window rejected
    }

    // ---------- F-06: residual value can never strand in backing ----------

    function test_F06_emptyRecipients_residualRoutedToTreasury() public {
        // 2-member auction pot; bob defaults, alice is the sole eligible winner.
        address[] memory two = new address[](2);
        two[0] = alice;
        two[1] = bob;
        (bytes32 rt, bytes32[][] memory prfs) = _buildTreeGeneric(two);

        vm.prank(alice);
        uint256 potId = auction.createPot(rt, 2, AMT, CYCLE, PAY_WINDOW, BID_WINDOW);
        vm.prank(alice);
        auction.joinPot(potId, prfs[0]);
        vm.prank(bob);
        auction.joinPot(potId, prfs[1]);
        vm.prank(alice);
        auction.startPot(potId);
        auction.startCycle(potId);

        vm.prank(alice);
        auction.payForCycle(potId); // bob never pays -> defaults
        comet.simulateInterest(address(integrator), 10e6); // yield on the cycle

        vm.warp(block.timestamp + BID_WINDOW + 1);
        auction.declareWinner(potId); // 1 eligible -> direct win; recipients (non-winner) = EMPTY

        // Winner got the pot PLUS the residual interest (recipients set was empty), and the
        // treasury kept its yield fee. Pre-fix the 8 USDC residual stayed in `backing` forever,
        // unclaimable by anyone and explicitly excluded from rescueSurplus.
        assertEq(vault.backing(), 0, "nothing strands in backing");
        assertApproxEqAbs(vault.withdrawable(alice), AMT + 8e6, 2, "winner: pot + residual interest");
        assertApproxEqAbs(vault.withdrawable(treasuryAddr), 2e6, 2, "treasury: 20% yield fee");
        assertApproxEqAbs(
            vault.withdrawable(alice) + vault.withdrawable(treasuryAddr), AMT + 10e6, 2, "every wei claimable"
        );
    }

    // ---------- F-07: joined-pots cap is concurrent, not lifetime ----------

    function test_F07_releaseSlotAfterCompletion() public {
        // Complete a pot early: nobody pays cycle 1 -> 0 eligible -> pot completes.
        uint256 potId = _startedCircle(true);
        circle.startCycle(potId);
        vm.warp(block.timestamp + PAY_WINDOW + 1);
        circle.drawWinner(potId); // no payers -> early complete

        (,,,,, RoscaEngineBaseV4.PotStatus status,,,) = circle.getPot(potId);
        assertEq(uint256(status), uint256(RoscaEngineBaseV4.PotStatus.Completed));

        assertEq(circle.joinedPotsCount(alice), 1);
        circle.releaseSlot(potId, alice); // permissionless
        assertEq(circle.joinedPotsCount(alice), 0, "slot freed after completion");

        vm.expectRevert(RoscaEngineBaseV4.AlreadyReleased.selector);
        circle.releaseSlot(potId, alice);
    }

    // ---------- F-08: cycleDuration is a real cadence ----------

    function test_F08_cycleCadenceEnforced() public {
        uint256 potId = _startedCircle(false);
        circle.startCycle(potId);
        // NOTE: read the anchor from contract state — via-IR may re-materialize a
        // `block.timestamp` local at use sites, which breaks across vm.warp.
        (uint256 c1Start,,,,,,,) = circle.getCycle(potId, 1);
        _payAllCircle(potId);
        vm.warp(block.timestamp + PAY_WINDOW + 1);
        uint256 rid = vrf.nextRequestId();
        circle.drawWinner(potId); // cycle 1 completed at ~start + 1 day
        vrf.fulfill(address(lottery), rid, 1);
        circle.finalizeDraw(potId);

        // pre-fix a keeper could fire cycle 2 immediately, compressing a "weekly" pot into days
        vm.expectRevert(RoscaEngineBaseV4.CycleTooEarly.selector);
        circle.startCycle(potId);

        vm.warp(c1Start + CYCLE);
        circle.startCycle(potId); // on schedule
        (uint256 startTime,,,,,,,) = circle.getCycle(potId, 2);
        assertEq(startTime, c1Start + CYCLE);
    }

    // ---------- F-09 / NEW-3: VRF timeout -> retry -> deterministic fallback (pot survives) ----------

    function test_NEW3_vrfTimeout_retryBeforeFallback() public {
        uint256 potId = _startedCircle(true); // perCycleVRF
        circle.startCycle(potId);
        vm.prank(alice);
        circle.payForCycle(potId);
        vm.prank(bob);
        circle.payForCycle(potId);
        vm.warp(block.timestamp + PAY_WINDOW + 1);

        circle.drawWinner(potId); // requests VRF (never fulfilled)

        // Simulate VRF timeout (1 day + buffer)
        vm.warp(block.timestamp + 1 days + 100);

        // First cancel -> should RETRY (re-request VRF), NOT kill the pot
        uint256 reqId2 = vrf.nextRequestId();
        circle.cancelStuckVRFCycle(potId);

        (,,,,, RoscaEngineBaseV4.CycleStatus status,,) = circle.getCycle(potId, 1);
        assertEq(uint256(status), uint256(RoscaEngineBaseV4.CycleStatus.AwaitingVRF), "retry re-requested VRF");

        // Now fulfill the retry VRF and finalize -> winner selected
        vrf.fulfill(address(lottery), reqId2, 42);
        circle.finalizeDraw(potId);
        assertTrue(
            circle.hasWonInPot(potId, alice) || circle.hasWonInPot(potId, bob),
            "retry VRF fulfilled -> winner selected"
        );

        // Pot should NOT be completed (normal cycle completion, not early-complete)
        (,,,,, RoscaEngineBaseV4.PotStatus potStatus,,,) = circle.getPot(potId);
        assertEq(uint256(potStatus), uint256(RoscaEngineBaseV4.PotStatus.Active), "pot still active after retry");
    }

    function test_F09_retriesExhausted_fallbackWinner_notPotDeath() public {
        uint256 potId = _startedCircle(true);
        circle.startCycle(potId);
        vm.prank(alice);
        circle.payForCycle(potId);
        vm.prank(bob);
        circle.payForCycle(potId);
        vm.warp(block.timestamp + PAY_WINDOW + 1);
        circle.drawWinner(potId); // VRF request #1 — Chainlink is "down", nothing ever fulfills

        // exhaust both retries
        vm.warp(block.timestamp + 1 days + 1);
        circle.cancelStuckVRFCycle(potId); // retry 1
        vm.warp(block.timestamp + 1 days + 1);
        circle.cancelStuckVRFCycle(potId); // retry 2
        vm.warp(block.timestamp + 1 days + 1);
        circle.cancelStuckVRFCycle(potId); // exhausted -> deterministic fallback

        // Pre-fix: the pot early-completed (refund + death) despite two eligible members.
        // Now: one of them wins the cycle and the pot LIVES ON.
        assertTrue(circle.hasWonInPot(potId, alice) || circle.hasWonInPot(potId, bob), "fallback winner selected");
        (,,,,, RoscaEngineBaseV4.PotStatus potStatus,,,) = circle.getPot(potId);
        assertEq(uint256(potStatus), uint256(RoscaEngineBaseV4.PotStatus.Active), "pot survives VRF outage");
    }

    // ---------- Auction: H-01, H-03, M-01, M-03, F-10 ----------

    function _startedAuction() internal returns (uint256 potId) {
        vm.prank(alice);
        potId = auction.createPot(root, 4, AMT, CYCLE, PAY_WINDOW, BID_WINDOW);
        _joinAll(CircleEngineOrAuction.Auction, potId);
        vm.prank(alice);
        auction.startPot(potId);
        auction.startCycle(potId);
        for (uint256 i = 0; i < roster.length; i++) {
            vm.prank(roster[i]);
            auction.payForCycle(potId);
        }
        // F-10: bidding opens only after the payment window closes
        vm.warp(block.timestamp + PAY_WINDOW + 1);
    }

    function test_F10_bidDuringPaymentWindowReverts() public {
        vm.prank(alice);
        uint256 potId = auction.createPot(root, 4, AMT, CYCLE, PAY_WINDOW, BID_WINDOW);
        _joinAll(CircleEngineOrAuction.Auction, potId);
        vm.prank(alice);
        auction.startPot(potId);
        auction.startCycle(potId);
        vm.prank(alice);
        auction.payForCycle(potId);

        // pre-fix a bid here was checked against a PARTIALLY-collected ceiling
        vm.prank(alice);
        vm.expectRevert(AuctionEngineV4.BiddingNotOpen.selector);
        auction.placeBid(potId, 50e6);
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
        uint256 c1Start = block.timestamp - PAY_WINDOW - 1;
        vm.prank(alice);
        auction.placeBid(potId, 250e6);
        vm.warp(block.timestamp + BID_WINDOW + 1);
        auction.declareWinner(potId); // alice wins cycle 1
        assertTrue(auction.hasWonInPot(potId, alice));

        // cycle 2 (F-08: respect cadence)
        vm.warp(c1Start + CYCLE + 1);
        vm.prank(bob);
        auction.startCycle(potId);
        for (uint256 i = 0; i < roster.length; i++) {
            vm.prank(roster[i]);
            auction.payForCycle(potId);
        }
        vm.warp(block.timestamp + PAY_WINDOW + 1);
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

    // ---------- F-11 / L-09: proportional withdrawal & asset conservation ----------

    function test_F11_internalPrincipalProportionalOnWithdraw() public {
        CompoundIntegratorV4 ig = new CompoundIntegratorV4(address(comet), address(usdc));
        ig.setVault(address(this));
        usdc.mint(address(this), 10_000e6);
        usdc.approve(address(ig), type(uint256).max);

        uint256 s1 = ig.supply(1_000e6);
        uint256 s2 = ig.supply(1_000e6);
        comet.simulateInterest(address(ig), 500e6); // +25% yield

        uint256 out1 = ig.withdraw(s1);
        assertApproxEqAbs(out1, 1_250e6, 2, "first withdraw gets pro-rata assets + interest");
        assertApproxEqAbs(ig.totalAssets(), 1_250e6, 2, "remaining assets conserved");
        assertEq(ig.totalShares(), s2, "remaining shares matches s2");
    }

    // ---------- I-04: sweepReward is onlyOwner restricted ----------

    function test_I04_sweepReward_onlyOwner() public {
        CompoundIntegratorV4 ig = new CompoundIntegratorV4(address(comet), address(usdc));
        ig.setVault(address(vault));
        MockUSDC extraToken = new MockUSDC();
        extraToken.mint(address(ig), 100e6);

        // Non-owner should revert
        vm.prank(eve);
        vm.expectRevert();
        ig.sweepReward(address(extraToken));

        // Owner can sweep
        ig.sweepReward(address(extraToken));
        assertEq(extraToken.balanceOf(vault.treasury()), 100e6);
    }

    // ---------- L-02: time-weighted yield distribution ----------

    function test_L02_timeWeightedYieldDistribution() public {
        uint256 potId = _startedCircle();
        circle.startCycle(potId);

        // Alice pays early
        vm.prank(alice);
        circle.payForCycle(potId);

        // Yield accrues while only Alice is deposited
        comet.simulateInterest(address(integrator), 100e6);

        // Bob pays later (higher share price -> fewer shares minted)
        vm.prank(bob);
        circle.payForCycle(potId);

        // More yield accrues
        comet.simulateInterest(address(integrator), 100e6);

        // Carol and Dave pay
        vm.prank(carol);
        circle.payForCycle(potId);
        vm.prank(dave);
        circle.payForCycle(potId);

        vm.warp(block.timestamp + PAY_WINDOW + 1);
        uint256 reqId = vrf.nextRequestId();
        circle.drawWinner(potId);
        vrf.fulfill(address(lottery), reqId, 0); // alice wins
        circle.finalizeDraw(potId);

        // Alice should have received more yield than Bob, who received more yield than Carol/Dave
        uint256 aliceShares = vault.getMemberShares(address(circle), potId, 1, alice);
        uint256 bobShares = vault.getMemberShares(address(circle), potId, 1, bob);
        uint256 carolShares = vault.getMemberShares(address(circle), potId, 1, carol);

        assertTrue(aliceShares > bobShares, "early payer got more shares");
        assertTrue(bobShares > carolShares, "mid payer got more shares than late payer");
    }

    function test_L02_zeroYield_noRevert_and_exactConservation() public {
        uint256 potId = _startedCircle();
        circle.startCycle(potId);

        _payAllCircle(potId);
        // NO interest simulated -> totalGrossYield == 0

        vm.warp(block.timestamp + PAY_WINDOW + 1);
        uint256 reqId = vrf.nextRequestId();
        circle.drawWinner(potId);
        vrf.fulfill(address(lottery), reqId, 0); // alice wins
        circle.finalizeDraw(potId);

        // Alice receives exactly 4 * AMT = 400e6
        assertEq(vault.withdrawable(alice), 4 * AMT, "winner gets exact principal pot");
        assertEq(vault.backing(), 0, "no funds stranded in backing on zero yield");
    }

    function test_L02_zeroYield_refund_noRevert() public {
        uint256 potId = _startedCircle();
        circle.startCycle(potId);

        // Cycle 1: All pay, Alice wins
        _payAllCircle(potId);
        vm.warp(block.timestamp + PAY_WINDOW + 1);
        uint256 reqId = vrf.nextRequestId();
        circle.drawWinner(potId);
        vrf.fulfill(address(lottery), reqId, 0); // Alice wins
        circle.finalizeDraw(potId);

        // Cycle 2: Wait until cycle 1 duration elapses (F-08 cadence)
        vm.warp(block.timestamp + CYCLE);
        circle.startCycle(potId);
        vm.prank(alice);
        circle.payForCycle(potId);
        vm.warp(block.timestamp + PAY_WINDOW + 1);

        // 0 eligible (Alice already won, others didn't pay) -> early completion refund
        circle.drawWinner(potId);

        // Alice is credited her 400e6 win from C1 + 100e6 refund from C2 = 500e6
        assertEq(vault.withdrawable(alice), 500e6, "refund credited without revert");
        assertEq(vault.backing(), 0, "no funds stranded in backing on zero-yield refund");
    }

    function test_L02_auctionDiscount_with_zeroYield() public {
        uint256 potId = _startedAuction();
        // Alice bids 300e6 (out of 400e6 collected, discount is 100e6)
        vm.prank(alice);
        auction.placeBid(potId, 300e6);

        vm.warp(block.timestamp + BID_WINDOW + 1);
        // NO interest simulated -> totalGrossYield == 0, discount == 100e6
        auction.declareWinner(potId);

        // Alice won 300e6
        assertEq(vault.withdrawable(alice), 300e6, "winner gets bid amount");

        // Remaining 3 members (bob, carol, dave) receive 100e6 / 3 each + remainder
        uint256 bBal = vault.withdrawable(bob);
        uint256 cBal = vault.withdrawable(carol);
        uint256 dBal = vault.withdrawable(dave);

        assertEq(bBal + cBal + dBal, 100e6, "discount exactly distributed to non-winners with zero yield");
        assertEq(vault.backing(), 0, "no backing stranded");
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

    // ---------- UX: pay with permit (single tx even when the permit is unusable) ----------

    function test_payForCycleWithPermit_gracefulWithoutPermitSupport() public {
        uint256 potId = _startedCircle(false);
        circle.startCycle(potId);
        // MockUSDC has no permit(); the try/catch must swallow it and use the existing allowance.
        vm.prank(alice);
        circle.payForCycleWithPermit(potId, block.timestamp + 1 hours, 27, bytes32(0), bytes32(0));
        assertTrue(circle.paidForCycle(potId, 1, alice));
    }

    // ---------- Certora Audit Remediation Tests ----------

    function test_audit_H01_startPotNoUnfundedVRF() public {
        uint256 reqsBefore = vrf.nextRequestId();
        uint256 potId = _createCircle(false);
        _joinAll(CircleEngineOrAuction.Circle, potId);
        vm.prank(alice);
        circle.startPot(potId);
        assertEq(vrf.nextRequestId(), reqsBefore, "H-01: startPot does not trigger unfunded VRF request");
    }

    function test_audit_L04_rescueTokensBlocksComet() public {
        vm.expectRevert(CompoundIntegratorV4.CannotRescueBaseAsset.selector);
        integrator.rescueTokens(address(comet), 100);
    }

    function test_audit_I01_getCurrentSupplyAPR1e18() public view {
        uint256 apr = integrator.getCurrentSupplyAPR1e18();
        assertEq(apr, 0);
    }

    function test_audit_I02_uninitializedPotStatusIsNone() public view {
        (,,,,, RoscaEngineBaseV4.PotStatus status,,,) = circle.getPot(99999);
        assertEq(uint256(status), uint256(RoscaEngineBaseV4.PotStatus.None), "I-02: non-existent pot reports PotStatus.None");
    }

    function test_audit_I05_updateMerkleRootRevertsUnchanged() public {
        uint256 potId = _createCircle(false);
        (, bytes32 currentRoot,,,,,,,) = circle.getPot(potId);

        vm.prank(alice);
        vm.expectRevert(RoscaEngineBaseV4.InvalidParams.selector);
        circle.updateMerkleRoot(potId, currentRoot);
    }

    function test_audit_I06_minBiddingPhaseEnforced() public {
        (,, bytes32 rt) = _bigRoster(4);
        vm.prank(alice);
        // biddingWindow = PAY_WINDOW + 10 seconds (< MIN_BIDDING_PHASE 1 hour) -> reverts
        vm.expectRevert(RoscaEngineBaseV4.InvalidParams.selector);
        auction.createPot(rt, 4, AMT, CYCLE, PAY_WINDOW, PAY_WINDOW + 10);
    }
}
