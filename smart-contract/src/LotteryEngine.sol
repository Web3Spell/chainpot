// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropy.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

/// @title LotteryEngine
/// @notice Provides random winner selection for ChainPot auctions using Pyth Network's Entropy
contract LotteryEngine is Ownable, IEntropyConsumer {
    
    IEntropy public immutable entropy;
    address public entropyProvider;
    
    uint256 private nonce;
    uint64 private sequenceNumber;
    
    // Mapping to store pending random requests
    mapping(uint64 => RandomRequest) public pendingRequests;
    
    struct RandomRequest {
        RequestType requestType;
        address[] participants;
        uint256 min;
        uint256 max;
        address requester;
        bool fulfilled;
    }
    
    enum RequestType {
        WINNER_SELECTION,
        RANDOM_NUMBER
    }
    
    event RandomWinnerSelected(address indexed winner, uint256 randomSeed, uint64 sequenceNumber);
    event RandomNumberGenerated(uint256 randomNumber, uint64 sequenceNumber);
    event RandomRequested(uint64 indexed sequenceNumber, RequestType requestType);
    event EntropyProviderUpdated(address indexed newProvider);
    
    constructor(address _entropy, address _entropyProvider) Ownable(msg.sender) {
        entropy = IEntropy(_entropy);
        entropyProvider = _entropyProvider;
        nonce = 1;
        sequenceNumber = 1;
    }
    
    /// @notice Update the entropy provider address
    /// @param _entropyProvider New entropy provider address
    function setEntropyProvider(address _entropyProvider) external onlyOwner {
        entropyProvider = _entropyProvider;
        emit EntropyProviderUpdated(_entropyProvider);
    }
    
    /// @notice Get the entropy contract address
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }
    
    /// @notice Select a random winner from an array of addresses
    /// @param participants Array of participant addresses
    /// @return sequenceNum The sequence number for this random request
    function selectRandomWinner(address[] memory participants) 
        external 
        payable
        returns (uint64 sequenceNum) 
    {
        require(participants.length > 0, "No participants");
        require(msg.value >= entropy.getFee(entropyProvider), "Insufficient fee");
        
        sequenceNum = sequenceNumber++;
        
        // Store the request details
        pendingRequests[sequenceNum] = RandomRequest({
            requestType: RequestType.WINNER_SELECTION,
            participants: participants,
            min: 0,
            max: 0,
            requester: msg.sender,
            fulfilled: false
        });
        
        // Generate user random number (can be any value)
        bytes32 userRandomNumber = keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            nonce++
        ));
        
        // Request randomness from Pyth
        entropy.requestWithCallback{value: msg.value}(
            entropyProvider,
            userRandomNumber
        );
        
        emit RandomRequested(sequenceNum, RequestType.WINNER_SELECTION);
        return sequenceNum;
    }
    
    /// @notice Generate a random number within a range
    /// @param min Minimum value (inclusive)
    /// @param max Maximum value (exclusive)
    /// @return sequenceNum The sequence number for this random request
    function getRandomNumber(uint256 min, uint256 max) 
        external 
        payable
        returns (uint64 sequenceNum) 
    {
        require(max > min, "Invalid range");
        require(msg.value >= entropy.getFee(entropyProvider), "Insufficient fee");
        
        sequenceNum = sequenceNumber++;
        
        // Store the request details
        address[] memory emptyArray;
        pendingRequests[sequenceNum] = RandomRequest({
            requestType: RequestType.RANDOM_NUMBER,
            participants: emptyArray,
            min: min,
            max: max,
            requester: msg.sender,
            fulfilled: false
        });
        
        // Generate user random number
        bytes32 userRandomNumber = keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            nonce++,
            min,
            max
        ));
        
        // Request randomness from Pyth
        entropy.requestWithCallback{value: msg.value}(
            entropyProvider,
            userRandomNumber
        );
        
        emit RandomRequested(sequenceNum, RequestType.RANDOM_NUMBER);
        return sequenceNum;
    }
    
    /// @notice Callback function called by Entropy contract with random number
    /// @param sequenceNum The sequence number of the request
    /// @param randomNumber The random number provided by Pyth
    function entropyCallback(
        uint64 sequenceNum,
        address, // provider (unused)
        bytes32 randomNumber
    ) internal override {
        RandomRequest storage request = pendingRequests[sequenceNum];
        require(!request.fulfilled, "Request already fulfilled");
        require(request.requester != address(0), "Invalid request");
        
        request.fulfilled = true;
        uint256 randomValue = uint256(randomNumber);
        
        if (request.requestType == RequestType.WINNER_SELECTION) {
            uint256 winnerIndex = randomValue % request.participants.length;
            address winner = request.participants[winnerIndex];
            emit RandomWinnerSelected(winner, randomValue, sequenceNum);
        } else if (request.requestType == RequestType.RANDOM_NUMBER) {
            uint256 result = request.min + (randomValue % (request.max - request.min));
            emit RandomNumberGenerated(result, sequenceNum);
        }
    }
    
    /// @notice View function to simulate random selection (doesn't modify state)
    /// @param participants Array of participant addresses
    /// @return Simulated winner address
    function previewRandomWinner(address[] memory participants) 
        external 
        view 
        returns (address) 
    {
        require(participants.length > 0, "No participants");
        
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.difficulty,
            block.number,
            msg.sender,
            nonce
        )));
        
        uint256 winnerIndex = randomSeed % participants.length;
        return participants[winnerIndex];
    }
    
    /// @notice Get the fee required for a random request
    /// @return fee The fee amount in wei
    function getRandomFee() external view returns (uint256 fee) {
        return entropy.getFee(entropyProvider);
    }
    
    /// @notice Get details of a random request
    /// @param sequenceNum The sequence number of the request
    /// @return request The request details
    function getRequest(uint64 sequenceNum) external view returns (RandomRequest memory request) {
        return pendingRequests[sequenceNum];
    }
    
    /// @notice Check if a request has been fulfilled
    /// @param sequenceNum The sequence number of the request
    /// @return fulfilled Whether the request has been fulfilled
    function isRequestFulfilled(uint64 sequenceNum) external view returns (bool fulfilled) {
        return pendingRequests[sequenceNum].fulfilled;
    }
    
    /// @notice Withdraw contract balance (owner only)
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /// @notice Fallback function to receive ETH
    receive() external payable {}
}
