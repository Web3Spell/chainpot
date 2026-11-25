// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {VRFProviderV4} from "../src/VRFProviderV4.sol";

/// @notice Throwaway helper to smoke-test Chainlink VRF through the production VRFProviderV4.
///         Not part of the audited protocol: the Safe authorizes it as a requester for one test,
///         then revokes it. It holds no funds and only its deployer can trigger a request.
contract VRFSmokeReceiver {
    VRFProviderV4 public immutable provider;
    address public immutable operator;

    uint256 public lastRequestId;
    uint256 public lastWord;
    uint256 public fulfilledAt;

    event Requested(uint256 requestId);
    event Received(uint256 requestId, uint256 word);

    constructor(VRFProviderV4 _provider) {
        provider = _provider;
        operator = msg.sender;
    }

    function request() external returns (uint256 id) {
        require(msg.sender == operator, "operator only");
        id = provider.requestRandomness();
        lastRequestId = id;
        emit Requested(id);
    }

    function fulfillRandomness(uint256 requestId, uint256 randomWord) external {
        require(msg.sender == address(provider), "provider only");
        lastWord = randomWord;
        fulfilledAt = block.timestamp;
        emit Received(requestId, randomWord);
    }
}
