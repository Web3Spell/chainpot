// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {BaseTest} from "./Base.t.sol";
import {LotteryEngineV3} from "../src/LotteryEngineV3.sol";

contract LotteryEngineV3Test is BaseTest {
    /// C-03 fix: only authorized requesters may initiate VRF.
    function test_requestRandomWinner_revert_unauthorized() public {
        address[] memory participants = new address[](2);
        participants[0] = alice;
        participants[1] = bob;
        vm.prank(eve);
        vm.expectRevert(LotteryEngineV3.UnauthorizedRequester.selector);
        lottery.requestRandomWinner(participants);
    }

    function test_setAuthorizedRequester_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        lottery.setAuthorizedRequester(eve, true);
    }

    function test_requestRandomWinner_revert_emptyParticipants() public {
        // Authorize this test contract
        lottery.setAuthorizedRequester(address(this), true);
        address[] memory participants = new address[](0);
        vm.expectRevert(LotteryEngineV3.NoParticipants.selector);
        lottery.requestRandomWinner(participants);
    }

    function test_requestRandomWinner_revert_tooManyParticipants() public {
        lottery.setAuthorizedRequester(address(this), true);
        address[] memory participants = new address[](201);
        for (uint256 i = 0; i < 201; i++) participants[i] = address(uint160(i + 1));
        vm.expectRevert(LotteryEngineV3.TooManyParticipants.selector);
        lottery.requestRandomWinner(participants);
    }

    function test_requestAndFulfill_setsWinner() public {
        lottery.setAuthorizedRequester(address(this), true);
        address[] memory participants = new address[](3);
        participants[0] = alice;
        participants[1] = bob;
        participants[2] = carol;

        uint256 reqId = lottery.requestRandomWinner(participants);
        assertEq(reqId, 1);

        // Fulfill with random word that maps to bob (index 1)
        uint256 word = 1;
        vrfCoord.fulfillRandomWords(reqId, word);

        assertTrue(lottery.isRequestFulfilled(reqId));
        assertEq(lottery.getWinner(reqId), bob);
    }
}
