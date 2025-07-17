// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract LotteryEngine is Ownable(msg.sender) {
    address public auctionEngine;

    modifier onlyAuctionEngine() {
        require(msg.sender == auctionEngine, "Only Auction Engine allowed");
        _;
    }

    constructor(address _auctionEngine) {
        auctionEngine = _auctionEngine;
    }

    function setAuctionEngine(address _auctionEngine) external onlyOwner {
        auctionEngine = _auctionEngine;
    }

    /// @notice Randomly picks a winner from participants (fallback if no bids)
    function selectRandomWinner(address[] memory participants) external view onlyAuctionEngine returns (address) {
        require(participants.length > 0, "No participants");
        uint256 randomIndex = uint256(
            keccak256(
                abi.encodePacked(block.timestamp, block.difficulty, participants.length)
            )
        ) % participants.length;

        return participants[randomIndex];
    }
}
