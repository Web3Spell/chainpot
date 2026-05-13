// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

interface IAuctionEngineCallback {
    function fulfillRandomWinner(uint256 requestId, address winner) external;
}

/// @title LotteryEngineV3
/// @notice Verifiable random winner selection via Chainlink VRF V2.5.
/// @dev Fixes C-03: requestRandomWinner is allowlist-gated so VRF subscription cannot be drained.
contract LotteryEngineV3 is VRFConsumerBaseV2Plus {
    uint256 public subscriptionId;
    bytes32 public keyHash;
    uint32 public callbackGasLimit = 500_000; // bumped from 200k for safety
    uint16 public requestConfirmations = 3;
    uint32 public constant NUM_WORDS = 1;

    uint256 public constant MAX_PARTICIPANTS = 200;

    mapping(address => bool) public authorizedRequesters;

    struct RandomRequest {
        address[] participants;
        address requester;
        bool fulfilled;
        uint256 randomWord;
    }

    mapping(uint256 => RandomRequest) public requests;
    mapping(uint256 => address) public winners;

    error NoParticipants();
    error TooManyParticipants();
    error RequestNotFound(uint256 requestId);
    error AlreadyFulfilled(uint256 requestId);
    error NotFulfilled(uint256 requestId);
    error InvalidSubscriptionId();
    error InvalidKeyHash();
    error UnauthorizedRequester();
    error InvalidAddress();

    event RandomWinnerRequested(uint256 indexed requestId, address indexed requester, uint256 numParticipants);
    event RandomWinnerSelected(uint256 indexed requestId, address indexed winner, uint256 randomWord);
    event VRFConfigUpdated(uint256 subscriptionId, bytes32 keyHash, uint32 callbackGasLimit, uint16 requestConfirmations);
    event AuthorizedRequesterUpdated(address indexed requester, bool authorized);
    event CallbackFailed(uint256 indexed requestId, address indexed requester);

    constructor(address _vrfCoordinator, uint256 _subscriptionId, bytes32 _keyHash)
        VRFConsumerBaseV2Plus(_vrfCoordinator)
    {
        if (_subscriptionId == 0) revert InvalidSubscriptionId();
        if (_keyHash == bytes32(0)) revert InvalidKeyHash();
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
    }

    // ---- Admin ----

    function setVRFConfig(uint256 _subscriptionId, bytes32 _keyHash, uint32 _callbackGasLimit, uint16 _requestConfirmations)
        external
        onlyOwner
    {
        if (_subscriptionId == 0) revert InvalidSubscriptionId();
        if (_keyHash == bytes32(0)) revert InvalidKeyHash();
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        emit VRFConfigUpdated(_subscriptionId, _keyHash, _callbackGasLimit, _requestConfirmations);
    }

    function setAuthorizedRequester(address requester, bool authorized) external onlyOwner {
        if (requester == address(0)) revert InvalidAddress();
        authorizedRequesters[requester] = authorized;
        emit AuthorizedRequesterUpdated(requester, authorized);
    }

    // ---- Core ----

    /// @notice Request a verifiable random winner. Allowlist-gated (C-03).
    function requestRandomWinner(address[] calldata participants) external returns (uint256 requestId) {
        if (!authorizedRequesters[msg.sender]) revert UnauthorizedRequester();
        if (participants.length == 0) revert NoParticipants();
        if (participants.length > MAX_PARTICIPANTS) revert TooManyParticipants();

        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
            })
        );

        RandomRequest storage req = requests[requestId];
        req.requester = msg.sender;
        for (uint256 i = 0; i < participants.length; i++) {
            req.participants.push(participants[i]);
        }

        emit RandomWinnerRequested(requestId, msg.sender, participants.length);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        RandomRequest storage request = requests[requestId];
        if (request.requester == address(0)) revert RequestNotFound(requestId);
        if (request.fulfilled) revert AlreadyFulfilled(requestId);

        request.fulfilled = true;
        request.randomWord = randomWords[0];

        uint256 winnerIndex = randomWords[0] % request.participants.length;
        address winner = request.participants[winnerIndex];
        winners[requestId] = winner;

        emit RandomWinnerSelected(requestId, winner, randomWords[0]);

        if (request.requester.code.length > 0) {
            try IAuctionEngineCallback(request.requester).fulfillRandomWinner(requestId, winner) {
                // ok
            } catch {
                emit CallbackFailed(requestId, request.requester);
            }
        }
    }

    // ---- Reads ----

    function getWinner(uint256 requestId) external view returns (address) {
        if (requests[requestId].requester == address(0)) revert RequestNotFound(requestId);
        if (!requests[requestId].fulfilled) revert NotFulfilled(requestId);
        return winners[requestId];
    }

    function isRequestFulfilled(uint256 requestId) external view returns (bool) {
        return requests[requestId].fulfilled;
    }

    function getRequest(uint256 requestId)
        external
        view
        returns (address[] memory participants, address requester, bool fulfilled, uint256 randomWord)
    {
        RandomRequest storage r = requests[requestId];
        return (r.participants, r.requester, r.fulfilled, r.randomWord);
    }
}
