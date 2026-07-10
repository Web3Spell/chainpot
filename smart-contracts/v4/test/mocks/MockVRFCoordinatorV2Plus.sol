// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/// @notice Minimal VRF V2.5 coordinator mock. `requestRandomWords` returns an incrementing id;
///         `fulfill` drives the consumer's `rawFulfillRandomWords` (which gates on msg.sender).
contract MockVRFCoordinatorV2Plus {
    uint256 public nextRequestId = 1;

    event RandomWordsRequested(uint256 requestId);

    function requestRandomWords(VRFV2PlusClient.RandomWordsRequest calldata) external returns (uint256 requestId) {
        requestId = nextRequestId++;
        emit RandomWordsRequested(requestId);
    }

    function fulfill(address consumer, uint256 requestId, uint256 rand) external {
        uint256[] memory words = new uint256[](1);
        words[0] = rand;
        VRFConsumerBaseV2Plus(consumer).rawFulfillRandomWords(requestId, words);
    }

    /// @notice (F-01 regression) Fulfill under a hard gas budget, exactly like the real coordinator
    ///         enforces `callbackGasLimit`. Returns whether the callback succeeded.
    function fulfillWithGas(address consumer, uint256 requestId, uint256 rand, uint256 gasLimit)
        external
        returns (bool ok)
    {
        uint256[] memory words = new uint256[](1);
        words[0] = rand;
        (ok,) = consumer.call{gas: gasLimit}(
            abi.encodeWithSignature("rawFulfillRandomWords(uint256,uint256[])", requestId, words)
        );
    }
}
