// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/LotteryEngine.sol";
import "./mocks/MockVRFCoordinatorV2Plus.sol";

contract LotteryEngineTest is Test {
    LotteryEngine lottery;
    MockVRFCoordinatorV2Plus coordinator;

    address alice = address(3);
    address bob = address(4);
    address carol = address(5);
    address[] players;

    function setUp() external {
        coordinator = new MockVRFCoordinatorV2Plus();

        lottery = new LotteryEngine(
            address(coordinator),
            123, // fake subId
            bytes32(uint256(999)) // fake keyHash
        );
    }

    function _makePlayers() internal view returns (address[] memory) {
        address[] memory arr = new address[](3);
        arr[0] = alice;
        arr[1] = bob;
        arr[2] = carol;
        return arr;
    }
    // -------------------------------------------------------------
    // previewRandomWinner()
    // -------------------------------------------------------------

    function test_previewRandomWinner_returns_one_of_inputs() external {
        players = _makePlayers();

        address winner = lottery.previewRandomWinner(players);

        bool valid;
        for (uint256 i; i < players.length; i++) {
            if (winner == players[i]) valid = true;
        }
        assertTrue(valid);
    }

    function test_previewRandomWinner_reverts_on_empty() external {
        vm.expectRevert(LotteryEngine.NoParticipants.selector);
        lottery.previewRandomWinner(new address[](0));
    }
    // -------------------------------------------------------------
    // isRequestFulfilled()
    // -------------------------------------------------------------

    function test_isRequestFulfilled_false_initially_true_after() external {
        players = _makePlayers();
        uint256 id = lottery.requestRandomWinner(players);

        assertFalse(lottery.isRequestFulfilled(id));

        coordinator.fulfill(address(lottery), id, 77);

        assertTrue(lottery.isRequestFulfilled(id));
    }

    function test_cannot_request_with_empty_list() external {
        vm.expectRevert(LotteryEngine.NoParticipants.selector);
        lottery.requestRandomWinner(new address[](0));
    }

    function test_request_stores_requester() external {
        players = _makePlayers();

        vm.prank(bob);
        uint256 id = lottery.requestRandomWinner(players);

        (, address requester,,) = lottery.getRequest(id);

        assertEq(requester, bob);
    }

    function test_request_and_fulfill() external {
        // prepare players list
        players = new address[](3);
        players[0] = alice;
        players[1] = bob;
        players[2] = carol;

        uint256 requestId = lottery.requestRandomWinner(players);

        // fulfill with fixed randomness: 1 → winner = bob
        coordinator.fulfill(address(lottery), requestId, 1);

        (,, bool fulfilled, uint256 rand) = lottery.getRequest(requestId);

        assertTrue(fulfilled);
        assertEq(rand, 1);

        address winner = lottery.winners(requestId);
        assertEq(winner, bob);
    }
    // -------------------------------------------------------------
    // Admin: setVRFConfig()
    // -------------------------------------------------------------

    function test_setVRFConfig_updates_values() external {
        vm.prank(lottery.owner());
        lottery.setVRFConfig(444, bytes32("abc"), 777, 9);

        (uint256 sub, bytes32 key, uint32 gasLimit, uint16 confirmations, uint32 numWords) = lottery.getVRFConfig();

        assertEq(sub, 444);
        assertEq(key, bytes32("abc"));
        assertEq(gasLimit, 777);
        assertEq(confirmations, 9);
        assertEq(numWords, 1);
    }

    function test_setVRFConfig_reverts_bad_sub() external {
        vm.prank(lottery.owner());
        vm.expectRevert(LotteryEngine.InvalidSubscriptionId.selector);
        lottery.setVRFConfig(0, bytes32("abc"), 100, 3);
    }

    function test_setVRFConfig_reverts_bad_keyhash() external {
        vm.prank(lottery.owner());
        vm.expectRevert(LotteryEngine.InvalidKeyHash.selector);
        lottery.setVRFConfig(55, bytes32(0), 100, 3);
    }

    function test_reverts_emptyList() external {
        vm.expectRevert(LotteryEngine.NoParticipants.selector);
        lottery.requestRandomWinner(players);
    }
    // -------------------------------------------------------------
    // getWinner()
    // -------------------------------------------------------------

    function test_getWinner_before_fulfill_reverts() external {
        players = _makePlayers();
        uint256 id = lottery.requestRandomWinner(players);

        vm.expectRevert();
        lottery.getWinner(id);
    }

    function test_getWinner_after_fulfill() external {
        players = _makePlayers();
        uint256 id = lottery.requestRandomWinner(players);

        coordinator.fulfill(address(lottery), id, 100);

        assertEq(lottery.getWinner(id), players[100 % 3]);
    }

    function test_getWinner_invalid_id_reverts() external {
        vm.expectRevert();
        lottery.getWinner(55);
    }
    // -------------------------------------------------------------
    // fulfillRandomWords()
    // -------------------------------------------------------------

    function test_fulfill_nonexistent_request_reverts() external {
        // id that was never created
        vm.expectRevert();
        coordinator.fulfill(address(lottery), 999, 1);
    }

    function test_fulfill_twice_reverts() external {
        players = _makePlayers();
        uint256 id = lottery.requestRandomWinner(players);

        coordinator.fulfill(address(lottery), id, 10);

        vm.expectRevert();
        coordinator.fulfill(address(lottery), id, 11);
    }
}
