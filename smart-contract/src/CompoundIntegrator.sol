// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICompoundV3 {
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

contract CompoundIntegrator is Ownable(msg.sender) {
    ICompoundV3 public compoundV3;
    IERC20 public usdc;

    address public auctionEngine;

    constructor(address _compoundV3, address _usdc) {
        compoundV3 = ICompoundV3(_compoundV3);
        usdc = IERC20(_usdc);
    }

    modifier onlyAuctionEngine() {
        require(msg.sender == auctionEngine, "Not authorized");
        _;
    }

    function setAuctionEngine(address _auctionEngine) external onlyOwner {
        auctionEngine = _auctionEngine;
    }

    /// @notice Deposit USDC to Compound V3
    function depositToCompound(uint256 amount) external payable onlyAuctionEngine {
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        usdc.approve(address(compoundV3), amount);
        compoundV3.supply(address(usdc), amount);
    }

    /// @notice Withdraw from Compound V3
    function withdrawFromCompound(uint256 amount, address to) external onlyAuctionEngine {
        compoundV3.withdraw(address(usdc), amount);
        require(usdc.transfer(to, amount), "Withdrawal failed");
    }

    /// @notice View balance in Compound
    function getCompoundBalance() external view returns (uint256) {
        return compoundV3.balanceOf(address(this));
    }
}
