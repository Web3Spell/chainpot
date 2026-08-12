// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {IVRFCoordinatorV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";

interface IVRFConsumer {
    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external;
}

/// @notice Minimal mock that satisfies IVRFCoordinatorV2Plus.requestRandomWords(...) and lets a test
///         driver fulfill randomness on demand. Other interface methods are unused stubs.
contract MockVRFCoordinator {
    uint256 public lastRequestId;
    mapping(uint256 => address) public consumerOf;

    event RequestSent(uint256 indexed requestId, address indexed consumer);
    event RequestFulfilled(uint256 indexed requestId, uint256 randomWord);

    function requestRandomWords(VRFV2PlusClient.RandomWordsRequest calldata) external returns (uint256 requestId) {
        requestId = ++lastRequestId;
        consumerOf[requestId] = msg.sender;
        emit RequestSent(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 requestId, uint256 randomWord) external {
        address consumer = consumerOf[requestId];
        require(consumer != address(0), "no consumer");
        uint256[] memory words = new uint256[](1);
        words[0] = randomWord;
        IVRFConsumer(consumer).rawFulfillRandomWords(requestId, words);
        emit RequestFulfilled(requestId, randomWord);
    }
}
