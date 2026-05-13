// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockLotteryEngine {
    address public nextWinner;

    function setNextWinner(address w) external {
        nextWinner = w;
    }

    function requestRandomWinner(address[] memory) external returns (uint256) {
        return 1; // dummy request id
    }

    function previewRandomWinner(address[] memory) external view returns (address) {
        return nextWinner;
    }
}
