// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {BaseTest} from "./Base.t.sol";
import {AuctionEngineV3} from "../src/AuctionEngineV3.sol";

contract AuctionEngineV3Test is BaseTest {
    function test_createPot_basic() public {
        _register(alice);
        vm.prank(alice);
        uint256 potId = engine.createPot(
            "P", 100 * USDC_ONE, 7 days, 2, AuctionEngineV3.CycleFrequency.Weekly, 1 days, 2, 3
        );
        assertEq(potId, 1);
        assertEq(engine.getPotMemberCount(potId), 1);
    }

    function test_createPot_revert_emptyName() public {
        _register(alice);
        vm.prank(alice);
        vm.expectRevert(AuctionEngineV3.EmptyName.selector);
        engine.createPot("", 100 * USDC_ONE, 7 days, 2, AuctionEngineV3.CycleFrequency.Weekly, 1 days, 2, 3);
    }

    function test_createPot_revert_unregistered() public {
        vm.prank(alice);
        vm.expectRevert(AuctionEngineV3.NotRegistered.selector);
        engine.createPot("P", 100 * USDC_ONE, 7 days, 2, AuctionEngineV3.CycleFrequency.Weekly, 1 days, 2, 3);
    }

    function test_joinPot_andLeave() public {
        _registerAll();
        uint256 potId = _approveAndCreateBasicPot(alice);

        vm.prank(bob);
        engine.joinPot(potId);
        assertEq(engine.getPotMemberCount(potId), 2);

        vm.prank(bob);
        engine.leavePot(potId);
        assertEq(engine.getPotMemberCount(potId), 1);
        assertFalse(engine.isPotMember(potId, bob));
    }

    function test_creator_cannotLeave() public {
        _registerAll();
        uint256 potId = _approveAndCreateBasicPot(alice);
        vm.prank(alice);
        vm.expectRevert(AuctionEngineV3.CreatorCannotLeave.selector);
        engine.leavePot(potId);
    }

    function test_startCycle_revert_notEnoughMembers() public {
        _register(alice);
        vm.prank(alice);
        uint256 potId = engine.createPot(
            "P", 100 * USDC_ONE, 7 days, 2, AuctionEngineV3.CycleFrequency.Weekly, 1 days, 3, 5
        );
        vm.prank(alice);
        vm.expectRevert(AuctionEngineV3.NotEnoughMembers.selector);
        engine.startCycle(potId);
    }

    /// H-01 fix: cannot start a second cycle while previous is active.
    function test_startCycle_revert_previousNotComplete() public {
        _registerAll();
        uint256 potId = _approveAndCreateBasicPot(alice);
        vm.prank(bob); engine.joinPot(potId);
        vm.prank(carol); engine.joinPot(potId);

        vm.prank(alice);
        engine.startCycle(potId);

        vm.prank(alice);
        vm.expectRevert(AuctionEngineV3.PreviousCycleNotComplete.selector);
        engine.startCycle(potId);
    }

    /// H-01 fix: hasPaidForCycle is keyed on cycleId, so paying cycle 1 doesn't block cycle 2.
    function test_payForCycle_isCycleScoped() public {
        _registerAll();
        uint256 potId = _approveAndCreateBasicPot(alice);
        vm.prank(bob); engine.joinPot(potId);
        vm.prank(carol); engine.joinPot(potId);

        vm.prank(alice);
        uint256 cycle1 = engine.startCycle(potId);

        _payCycle(alice, cycle1, DEFAULT_AMOUNT_PER_CYCLE);
        _payCycle(bob, cycle1, DEFAULT_AMOUNT_PER_CYCLE);
        _payCycle(carol, cycle1, DEFAULT_AMOUNT_PER_CYCLE);

        // alice cannot double-pay same cycle
        vm.startPrank(alice);
        usdc.approve(address(escrow), DEFAULT_AMOUNT_PER_CYCLE);
        vm.expectRevert(AuctionEngineV3.AlreadyPaidForCycle.selector);
        engine.payForCycle(cycle1);
        vm.stopPrank();
    }

    function test_placeBid_revert_notPaid() public {
        _registerAll();
        uint256 potId = _approveAndCreateBasicPot(alice);
        vm.prank(bob); engine.joinPot(potId);
        vm.prank(carol); engine.joinPot(potId);

        vm.prank(alice);
        uint256 cycle1 = engine.startCycle(potId);

        vm.prank(alice);
        vm.expectRevert(AuctionEngineV3.NotPaidForCycle.selector);
        engine.placeBid(cycle1, 900 * USDC_ONE);
    }

    function test_closeBidding_creatorAfterDeadline() public {
        _registerAll();
        uint256 potId = _approveAndCreateBasicPot(alice);
        vm.prank(bob); engine.joinPot(potId);
        vm.prank(carol); engine.joinPot(potId);

        vm.prank(alice);
        uint256 cycle1 = engine.startCycle(potId);
        _payCycle(alice, cycle1, DEFAULT_AMOUNT_PER_CYCLE);
        _payCycle(bob, cycle1, DEFAULT_AMOUNT_PER_CYCLE);
        _payCycle(carol, cycle1, DEFAULT_AMOUNT_PER_CYCLE);

        // Cannot close before deadline
        vm.prank(alice);
        vm.expectRevert(AuctionEngineV3.TooEarlyToClose.selector);
        engine.closeBidding(cycle1);

        // Move past bidding-closed time (cycle.endTime - bidDepositDeadline)
        vm.warp(block.timestamp + DEFAULT_CYCLE_DURATION - DEFAULT_BID_DEADLINE + 1);
        vm.prank(alice);
        engine.closeBidding(cycle1);
    }

    /// H-03 fix: a member can close bidding after the grace period if creator is unresponsive.
    function test_closeBidding_memberAfterGrace() public {
        _registerAll();
        uint256 potId = _approveAndCreateBasicPot(alice);
        vm.prank(bob); engine.joinPot(potId);
        vm.prank(carol); engine.joinPot(potId);

        vm.prank(alice);
        uint256 cycle1 = engine.startCycle(potId);
        _payCycle(alice, cycle1, DEFAULT_AMOUNT_PER_CYCLE);
        _payCycle(bob, cycle1, DEFAULT_AMOUNT_PER_CYCLE);
        _payCycle(carol, cycle1, DEFAULT_AMOUNT_PER_CYCLE);

        uint256 biddingClosesAt = block.timestamp + DEFAULT_CYCLE_DURATION - DEFAULT_BID_DEADLINE;
        // Bob tries before grace
        vm.warp(biddingClosesAt + 1);
        vm.prank(bob);
        vm.expectRevert(AuctionEngineV3.NotAuthorizedOrTooEarly.selector);
        engine.closeBidding(cycle1);

        // After grace
        vm.warp(biddingClosesAt + engine.CREATOR_GRACE_PERIOD());
        vm.prank(bob);
        engine.closeBidding(cycle1);
    }
}
