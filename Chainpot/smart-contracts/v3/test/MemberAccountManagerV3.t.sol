// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {BaseTest} from "./Base.t.sol";
import {MemberAccountManagerV3} from "../src/MemberAccountManagerV3.sol";

contract MemberAccountManagerV3Test is BaseTest {
    function test_registerMember_self() public {
        vm.prank(alice);
        mam.registerMember();
        assertTrue(mam.isRegistered(alice));
        assertEq(mam.getReputationScore(alice), mam.INITIAL_REPUTATION());
    }

    function test_registerMember_revert_double() public {
        vm.startPrank(alice);
        mam.registerMember();
        vm.expectRevert(abi.encodeWithSelector(MemberAccountManagerV3.AlreadyRegistered.selector, alice));
        mam.registerMember();
        vm.stopPrank();
    }

    /// H-06 fix: cannot register someone else.
    function test_registerMember_revert_other() public {
        vm.prank(alice);
        vm.expectRevert(MemberAccountManagerV3.SelfRegistrationOnly.selector);
        mam.registerMember(bob);
        assertFalse(mam.isRegistered(bob));
    }

    function test_registerMember_self_via_addressArg() public {
        vm.prank(alice);
        mam.registerMember(alice);
        assertTrue(mam.isRegistered(alice));
    }

    function test_authorizedCaller_only() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(MemberAccountManagerV3.NotAuthorized.selector, alice));
        mam.updateParticipation(alice, 1, 1, 100, false);
    }

    function test_markAsDefaulter_decrementsReputation() public {
        _register(alice);
        // Owner is authorized
        uint256 before = mam.getReputationScore(alice);
        mam.markAsDefaulter(alice, 1, 1);
        assertEq(mam.getReputationScore(alice), before - mam.REPUTATION_DEFAULT_PENALTY());
    }

    function test_markAsDefaulter_floorsAtZero() public {
        _register(alice);
        // Drain reputation in multiple penalties
        for (uint256 i = 0; i < 10; i++) {
            mam.markAsDefaulter(alice, 1, 1);
        }
        assertEq(mam.getReputationScore(alice), 0);
    }
}
