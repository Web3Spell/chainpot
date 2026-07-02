// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

interface IRandomnessReceiver {
    function fulfillRandomness(uint256 requestId, uint256 randomWord) external;
}

/// @title LotteryEngineV4
/// @notice Verifiable randomness via Chainlink VRF V2.5. Delivers the RAW random word to the
///         authorized requesting engine, which performs its own eligible-set filtering and
///         winner-selection / Fisher–Yates shuffle. Allowlist-gated so the subscription is undrainable.
/// @dev Remediations:
///      - C-02 (with the engines): only authorized engines may request; the engines additionally gate
///        each request behind a funded cycle + eligible.length >= 2 (see §4.4). The raw-word design
///        lets Program A do ONE request per pot (seed -> shuffle) instead of one per cycle.
///      - [I] participant mismatch: MAX_PARTICIPANTS == engines' MAX_MEMBERS == 100.
contract LotteryEngineV4 is VRFConsumerBaseV2Plus {
    uint256 public subscriptionId;
    bytes32 public keyHash;
    uint32 public callbackGasLimit = 500_000;
    uint16 public requestConfirmations = 3;
    uint32 public constant NUM_WORDS = 1;

    /// @notice Shared cap; equals the engines' MAX_MEMBERS ([I]).
    uint256 public constant MAX_PARTICIPANTS = 100;

    mapping(address => bool) public authorizedRequesters;

    struct Request {
        address requester;
        bool fulfilled;
        uint256 randomWord;
    }

    mapping(uint256 => Request) public requests;

    error UnauthorizedRequester();
    error InvalidSubscriptionId();
    error InvalidKeyHash();
    error InvalidAddress();
    error RequestNotFound(uint256 requestId);
    error AlreadyFulfilled(uint256 requestId);

    event RandomnessRequested(uint256 indexed requestId, address indexed requester);
    event RandomnessFulfilled(uint256 indexed requestId, address indexed requester, uint256 randomWord);
    event CallbackFailed(uint256 indexed requestId, address indexed requester);
    event VRFConfigUpdated(uint256 subscriptionId, bytes32 keyHash, uint32 callbackGasLimit, uint16 requestConfirmations);
    event AuthorizedRequesterUpdated(address indexed requester, bool authorized);

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

    /// @notice Request one verifiable random word. Allowlist-gated. The word is delivered back to the
    ///         caller via `IRandomnessReceiver.fulfillRandomness`.
    function requestRandomness() external returns (uint256 requestId) {
        if (!authorizedRequesters[msg.sender]) revert UnauthorizedRequester();

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

        requests[requestId] = Request({requester: msg.sender, fulfilled: false, randomWord: 0});
        emit RandomnessRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        Request storage req = requests[requestId];
        if (req.requester == address(0)) revert RequestNotFound(requestId);
        if (req.fulfilled) revert AlreadyFulfilled(requestId);

        req.fulfilled = true;
        req.randomWord = randomWords[0];

        emit RandomnessFulfilled(requestId, req.requester, randomWords[0]);

        // Deliver to the engine. A failing callback must not brick VRF fulfillment.
        try IRandomnessReceiver(req.requester).fulfillRandomness(requestId, randomWords[0]) {
            // ok
        } catch {
            emit CallbackFailed(requestId, req.requester);
        }
    }

    // ---- Reads ----

    function isFulfilled(uint256 requestId) external view returns (bool) {
        return requests[requestId].fulfilled;
    }
}
