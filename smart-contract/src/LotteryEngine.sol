// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title LotteryEngine
/// @notice Provides random winner selection for ChainPot auctions
contract LotteryEngine is Ownable {
    
    uint256 private nonce;
    
    event RandomWinnerSelected(address indexed winner, uint256 randomSeed);
    
    constructor() Ownable(msg.sender) {
        nonce = 1;
    }
    
    /// @notice Select a random winner from an array of addresses
    /// @param participants Array of participant addresses
    /// @return winner The randomly selected winner
    function selectRandomWinner(address[] memory participants) 
        external 
        returns (address winner) 
    {
        require(participants.length > 0, "No participants");
        
        // Generate pseudo-random number
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.difficulty,
            block.number,
            msg.sender,
            nonce++,
            blockhash(block.number - 1)
        )));
        
        uint256 winnerIndex = randomSeed % participants.length;
        winner = participants[winnerIndex];
        
        emit RandomWinnerSelected(winner, randomSeed);
        return winner;
    }
    
    /// @notice Generate a random number within a range
    /// @param min Minimum value (inclusive)
    /// @param max Maximum value (exclusive)
    /// @return Random number in range [min, max)
    function getRandomNumber(uint256 min, uint256 max) 
        external 
        returns (uint256) 
    {
        require(max > min, "Invalid range");
        
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.difficulty,
            block.number,
            msg.sender,
            nonce++
        )));
        
        return min + (randomSeed % (max - min));
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
}