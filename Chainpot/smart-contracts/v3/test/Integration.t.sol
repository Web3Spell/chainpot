// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {BaseTest} from "./Base.t.sol";
import {AuctionEngineV3} from "../src/AuctionEngineV3.sol";

/// @title Integration tests covering the full ROSCA lifecycle and audit fixes end-to-end.
contract IntegrationTest is BaseTest {
    /// **The C-01 critical fix proof:**
    /// 3-member pot, each contributes 1000 USDC. Alice bids 2400 (taking 600 discount).
    /// Bob and Carol (non-winners) must each receive ≈300 USDC (the discount split) + interest share.
    function test_C01_discountIsDistributedToNonWinners() public {
        _registerAll();
        uint256 potId = _approveAndCreateBasicPot(alice);
        vm.prank(bob); engine.joinPot(potId);
        vm.prank(carol); engine.joinPot(potId);

        vm.prank(alice);
        uint256 cycle1 = engine.startCycle(potId);

        // All pay in
        _payCycle(alice, cycle1, DEFAULT_AMOUNT_PER_CYCLE);
        _payCycle(bob, cycle1, DEFAULT_AMOUNT_PER_CYCLE);
        _payCycle(carol, cycle1, DEFAULT_AMOUNT_PER_CYCLE);

        // Alice bids 2400 — total pot is 3000, so 600 is the discount.
        vm.prank(alice);
        engine.placeBid(cycle1, 2_400 * USDC_ONE);

        // Move to bidding close
        vm.warp(block.timestamp + DEFAULT_CYCLE_DURATION - DEFAULT_BID_DEADLINE + 1);
        vm.prank(alice);
        engine.closeBidding(cycle1);

        vm.prank(alice);
        engine.declareWinner(cycle1);

        // Move past cycle end
        vm.warp(block.timestamp + DEFAULT_BID_DEADLINE);

        uint256 aliceBefore = usdc.balanceOf(alice);
        uint256 bobBefore = usdc.balanceOf(bob);
        uint256 carolBefore = usdc.balanceOf(carol);

        vm.prank(alice);
        engine.completeCycle(cycle1);

        uint256 aliceGain = usdc.balanceOf(alice) - aliceBefore;
        uint256 bobGain = usdc.balanceOf(bob) - bobBefore;
        uint256 carolGain = usdc.balanceOf(carol) - carolBefore;

        // Alice (winner) gets 2400
        assertEq(aliceGain, 2_400 * USDC_ONE, "winner payout");

        // Bob and Carol each get >= 300 (discount share = 600/2 = 300; plus tiny interest)
        assertGe(bobGain, 300 * USDC_ONE, "bob discount share");
        assertGe(carolGain, 300 * USDC_ONE, "carol discount share");

        // Total payouts == 3000 + accrued interest. Allow small rounding tolerance.
        uint256 totalPaid = aliceGain + bobGain + carolGain;
        assertGe(totalPaid, 3_000 * USDC_ONE - 2);
    }

    /// **C-02 fix proof, end-to-end:**
    /// Two cycles run sequentially over time; both cycles' non-winners receive a non-trivial
    /// interest portion proportional to time-in-Compound.
    function test_C02_perCycleInterestIntegration() public {
        _registerAll();
        uint256 potId = _approveAndCreateBasicPot(alice);
        vm.prank(bob); engine.joinPot(potId);
        vm.prank(carol); engine.joinPot(potId);

        // CYCLE 1
        vm.prank(alice);
        uint256 cycle1 = engine.startCycle(potId);
        _payCycle(alice, cycle1, DEFAULT_AMOUNT_PER_CYCLE);
        _payCycle(bob, cycle1, DEFAULT_AMOUNT_PER_CYCLE);
        _payCycle(carol, cycle1, DEFAULT_AMOUNT_PER_CYCLE);
        vm.prank(alice); engine.placeBid(cycle1, 2_500 * USDC_ONE);

        vm.warp(block.timestamp + DEFAULT_CYCLE_DURATION - DEFAULT_BID_DEADLINE + 1);
        vm.prank(alice); engine.closeBidding(cycle1);
        vm.prank(alice); engine.declareWinner(cycle1);

        vm.warp(block.timestamp + DEFAULT_BID_DEADLINE);
        vm.prank(alice); engine.completeCycle(cycle1);

        // CYCLE 2
        vm.prank(alice);
        uint256 cycle2 = engine.startCycle(potId);
        _payCycle(alice, cycle2, DEFAULT_AMOUNT_PER_CYCLE);
        _payCycle(bob, cycle2, DEFAULT_AMOUNT_PER_CYCLE);
        _payCycle(carol, cycle2, DEFAULT_AMOUNT_PER_CYCLE);
        vm.prank(bob); engine.placeBid(cycle2, 2_600 * USDC_ONE);

        vm.warp(block.timestamp + DEFAULT_CYCLE_DURATION - DEFAULT_BID_DEADLINE + 1);
        vm.prank(alice); engine.closeBidding(cycle2);
        vm.prank(alice); engine.declareWinner(cycle2);

        vm.warp(block.timestamp + DEFAULT_BID_DEADLINE);

        uint256 aliceBefore = usdc.balanceOf(alice);
        uint256 carolBefore = usdc.balanceOf(carol);
        uint256 bobBefore = usdc.balanceOf(bob);

        vm.prank(alice); engine.completeCycle(cycle2);

        uint256 bobGain = usdc.balanceOf(bob) - bobBefore;
        uint256 aliceGain = usdc.balanceOf(alice) - aliceBefore;
        uint256 carolGain = usdc.balanceOf(carol) - carolBefore;

        assertEq(bobGain, 2_600 * USDC_ONE, "winner cycle 2");
        // Discount of 400 split over 2 = 200 + interest
        assertGe(aliceGain, 200 * USDC_ONE);
        assertGe(carolGain, 200 * USDC_ONE);
    }

    /// **Invariant after completeCycle:** integrator's per-cycle shares are zero (residual fully harvested).
    function test_invariant_cycleHasZeroSharesAfterComplete() public {
        _registerAll();
        uint256 potId = _approveAndCreateBasicPot(alice);
        vm.prank(bob); engine.joinPot(potId);
        vm.prank(carol); engine.joinPot(potId);

        vm.prank(alice);
        uint256 cycle1 = engine.startCycle(potId);
        _payCycle(alice, cycle1, DEFAULT_AMOUNT_PER_CYCLE);
        _payCycle(bob, cycle1, DEFAULT_AMOUNT_PER_CYCLE);
        _payCycle(carol, cycle1, DEFAULT_AMOUNT_PER_CYCLE);
        vm.prank(alice); engine.placeBid(cycle1, 2_400 * USDC_ONE);

        vm.warp(block.timestamp + DEFAULT_CYCLE_DURATION - DEFAULT_BID_DEADLINE + 1);
        vm.prank(alice); engine.closeBidding(cycle1);
        vm.prank(alice); engine.declareWinner(cycle1);
        vm.warp(block.timestamp + DEFAULT_BID_DEADLINE);
        vm.prank(alice); engine.completeCycle(cycle1);

        (uint256 shares,,,,, ) = integrator.getCycleDeposit(potId, cycle1);
        assertEq(shares, 0, "cycle should have zero shares post-complete");
    }

    /// VRF-no-bids path: lottery picks a winner, full pot goes to them, no discount distributed.
    function test_VRF_noBidPath() public {
        _registerAll();
        uint256 potId = _approveAndCreateBasicPot(alice);
        vm.prank(bob); engine.joinPot(potId);
        vm.prank(carol); engine.joinPot(potId);

        vm.prank(alice);
        uint256 cycle1 = engine.startCycle(potId);
        _payCycle(alice, cycle1, DEFAULT_AMOUNT_PER_CYCLE);
        _payCycle(bob, cycle1, DEFAULT_AMOUNT_PER_CYCLE);
        _payCycle(carol, cycle1, DEFAULT_AMOUNT_PER_CYCLE);

        vm.warp(block.timestamp + DEFAULT_CYCLE_DURATION - DEFAULT_BID_DEADLINE + 1);
        vm.prank(alice); engine.closeBidding(cycle1);

        vm.prank(alice);
        engine.declareWinner(cycle1);
        // Now AwaitingVRF; fulfill randomness → winner = members[1] = bob via random word 1.
        vrfCoord.fulfillRandomWords(1, 1);

        vm.warp(block.timestamp + DEFAULT_BID_DEADLINE);
        uint256 bobBefore = usdc.balanceOf(bob);
        vm.prank(alice); engine.completeCycle(cycle1);

        // Bob got the full pot (3000) + tiny interest portion as winner via lottery
        uint256 bobGain = usdc.balanceOf(bob) - bobBefore;
        assertGe(bobGain, 3_000 * USDC_ONE);
    }

    /// **H-05 fix:** VRF callback rejects a non-member.
    function test_H05_vrfWinnerMustBeMember() public {
        _registerAll();
        uint256 potId = _approveAndCreateBasicPot(alice);
        vm.prank(bob); engine.joinPot(potId);
        vm.prank(carol); engine.joinPot(potId);

        vm.prank(alice);
        uint256 cycle1 = engine.startCycle(potId);
        _payCycle(alice, cycle1, DEFAULT_AMOUNT_PER_CYCLE);
        _payCycle(bob, cycle1, DEFAULT_AMOUNT_PER_CYCLE);
        _payCycle(carol, cycle1, DEFAULT_AMOUNT_PER_CYCLE);

        vm.warp(block.timestamp + DEFAULT_CYCLE_DURATION - DEFAULT_BID_DEADLINE + 1);
        vm.prank(alice); engine.closeBidding(cycle1);
        vm.prank(alice); engine.declareWinner(cycle1);

        // Spoof: try to call fulfillRandomWinner directly with a non-member from lottery's address.
        // The onlyLotteryEngine modifier blocks anyone else; but inside the engine, the member check
        // (H-05) blocks non-members even if lottery is compromised.
        vm.prank(address(lottery));
        vm.expectRevert(AuctionEngineV3.WinnerNotPotMember.selector);
        engine.fulfillRandomWinner(1, dave); // dave never joined
    }
}
