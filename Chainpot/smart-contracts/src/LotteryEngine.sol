// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/// @notice Interface for AuctionEngine callback when VRF is fulfilled
interface IAuctionEngineCallback {
    function fulfillRandomWinner(uint256 requestId, address winner) external;
}

/// @title LotteryEngine
/// @notice Provides random winner selection for ChainPot auctions using Chainlink VRF
/// @dev Implements Chainlink VRF V2.5 for verifiable randomness
contract LotteryEngine is VRFConsumerBaseV2Plus {
    // Chainlink VRF Configuration for Base Sepolia
    uint256 public subscriptionId;
    bytes32 public keyHash;
    uint32 public callbackGasLimit = 200000;
    uint16 public requestConfirmations = 3;
    uint32 public numWords = 1;

    // Request tracking
    mapping(uint256 => RandomRequest) public requests;
    mapping(uint256 => address) public winners; // requestId => winner address
    mapping(uint256 => uint256) public requestIdToCycleId; // requestId => cycleId (for AuctionEngine integration)

    struct RandomRequest {
        address[] participants;
        address requester;
        bool fulfilled;
        uint256 randomWord;
        uint256 cycleId; // Cycle ID from AuctionEngine (if applicable)
    }

    // Custom Errors
    error NoParticipants();
    error RequestNotFound(uint256 requestId);
    error RequestAlreadyFulfilled(uint256 requestId);
    error InvalidSubscriptionId();
    error InvalidKeyHash();

    // Events
    event RandomWinnerRequested(uint256 indexed requestId, uint256 numParticipants);
    event RandomWinnerSelected(uint256 indexed requestId, address indexed winner, uint256 randomWord);
    event VRFConfigUpdated(uint256 subscriptionId, bytes32 keyHash);

    /// @notice Constructor for Chainlink VRF integration
    /// @param _vrfCoordinator Chainlink VRF Coordinator address for Base Sepolia
    /// @param _subscriptionId Your Chainlink VRF subscription ID
    /// @param _keyHash The gas lane key hash
    constructor(address _vrfCoordinator, uint256 _subscriptionId, bytes32 _keyHash)
        VRFConsumerBaseV2Plus(_vrfCoordinator)
    {
        if (_subscriptionId == 0) revert InvalidSubscriptionId();
        if (_keyHash == bytes32(0)) revert InvalidKeyHash();

        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
    }

    // -------------------- Admin Functions --------------------

    /// @notice Update VRF configuration
    function setVRFConfig(
        uint256 _subscriptionId,
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations
    ) external onlyOwner {
        if (_subscriptionId == 0) revert InvalidSubscriptionId();
        if (_keyHash == bytes32(0)) revert InvalidKeyHash();

        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;

        emit VRFConfigUpdated(_subscriptionId, _keyHash);
    }

    // -------------------- Core Functions --------------------

    /// @notice Request a random winner from the list of participants
    /// @param participants Array of participant addresses
    /// @return requestId The VRF request ID
    function requestRandomWinner(address[] memory participants) external returns (uint256 requestId) {
        if (participants.length == 0) revert NoParticipants();

        // Request random words from Chainlink VRF
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: numWords,
                extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
            })
        );

        // Store request details
        requests[requestId] = RandomRequest({
            participants: participants,
            requester: msg.sender,
            fulfilled: false,
            randomWord: 0,
            cycleId: 0 // Will be set by AuctionEngine if needed
        });

        emit RandomWinnerRequested(requestId, participants.length);
        return requestId;
    }

    /// @notice Callback function used by VRF Coordinator
    /// @param requestId The ID of the VRF request
    /// @param randomWords Array of random values from Chainlink VRF
    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        RandomRequest storage request = requests[requestId];

        if (request.requester == address(0)) revert RequestNotFound(requestId);
        if (request.fulfilled) revert RequestAlreadyFulfilled(requestId);

        // Mark as fulfilled
        request.fulfilled = true;
        request.randomWord = randomWords[0];

        // Select winner
        uint256 winnerIndex = randomWords[0] % request.participants.length;
        address winner = request.participants[winnerIndex];
        winners[requestId] = winner;

        emit RandomWinnerSelected(requestId, winner, randomWords[0]);

        // If this is a request from AuctionEngine, call back to set the winner
        // Check if requester implements the callback interface
        if (request.requester.code.length > 0) {
            try IAuctionEngineCallback(request.requester).fulfillRandomWinner(requestId, winner) {
            // Callback succeeded
            }
                catch {
                // Callback failed - winner is still stored and can be retrieved manually
                // This allows manual recovery via checkAndSetVRFWinner in AuctionEngine
            }
        }
    }

    // -------------------- View Functions --------------------

    /// @notice Get the winner for a fulfilled request
    /// @param requestId The VRF request ID
    /// @return winner The selected winner address
    function getWinner(uint256 requestId) external view returns (address winner) {
        if (requests[requestId].requester == address(0)) revert RequestNotFound(requestId);
        if (!requests[requestId].fulfilled) revert RequestAlreadyFulfilled(requestId);
        return winners[requestId];
    }

    /// @notice Check if a request has been fulfilled
    /// @param requestId The VRF request ID
    /// @return fulfilled Whether the request has been fulfilled
    function isRequestFulfilled(uint256 requestId) external view returns (bool fulfilled) {
        return requests[requestId].fulfilled;
    }

    /// @notice Get request details
    /// @param requestId The VRF request ID
    function getRequest(uint256 requestId)
        external
        view
        returns (address[] memory participants, address requester, bool fulfilled, uint256 randomWord)
    {
        RandomRequest storage request = requests[requestId];
        return (request.participants, request.requester, request.fulfilled, request.randomWord);
    }

    /// @notice Preview random winner selection (for testing only - NOT SECURE)
    /// @param participants Array of participant addresses
    /// @return Simulated winner address
    function previewRandomWinner(address[] memory participants) external view returns (address) {
        if (participants.length == 0) revert NoParticipants();

        // Use pseudo-random for preview only (NOT SECURE - for testing only)
        uint256 pseudoRandom =
            uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, block.number, msg.sender)));

        uint256 winnerIndex = pseudoRandom % participants.length;
        return participants[winnerIndex];
    }

    /// @notice Get current VRF configuration
    function getVRFConfig()
        external
        view
        returns (
            uint256 _subscriptionId,
            bytes32 _keyHash,
            uint32 _callbackGasLimit,
            uint16 _requestConfirmations,
            uint32 _numWords
        )
    {
        return (subscriptionId, keyHash, callbackGasLimit, requestConfirmations, numWords);
    }
}

// VRF Co-ordinator 0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE
//s subscriptionID 95752933549638834563839661591035044483666769954218493417379908663541208911115
// KeyHash 0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71
// deployed address on base sepolia : 0x79b507aDC6aBE9B81Dd4BA3340514e455693423b
