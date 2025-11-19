// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

contract MockVRFCoordinatorV2Plus {
    uint256 public nextRequestId = 1;

    event RandomWordsRequested(uint256 requestId);
    event RandomWordsFulfilled(uint256 requestId, uint256[] randomWords);

    function requestRandomWords(
        VRFV2PlusClient.RandomWordsRequest calldata /* req */
    )
        external
        returns (uint256 requestId)
    {
        requestId = nextRequestId++;
        emit RandomWordsRequested(requestId);
    }

    // test helper
    function fulfill(address consumer, uint256 requestId, uint256 rand) external {
        uint256[] memory words = new uint256[](1);
        words[0] = rand;

        VRFConsumerBaseV2Plus(consumer).rawFulfillRandomWords(requestId, words);
        emit RandomWordsFulfilled(requestId, words);
    }
}
