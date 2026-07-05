// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IMockUSDC {
    function transferFrom(address from, address to, uint256 amt) external returns (bool);
    function mint(address to, uint256 amt) external;
    function transfer(address to, uint256 amt) external returns (bool);
}

/// @notice Minimal Compound III (Comet) mock. `supply` pulls USDC from the caller; `withdraw` mints
///         USDC back to the caller. `simulateInterest` bumps an account's balance to model yield.
contract MockComet {
    mapping(address => uint256) public balances;
    uint256 public totalSupplyMock;
    uint64 public supplyRateMock;
    uint256 public utilizationMock;

    function supply(address asset, uint256 amount) external {
        require(asset != address(0), "bad-asset");
        IMockUSDC(asset).transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;
        totalSupplyMock += amount;
    }

    function withdraw(address asset, uint256 amount) external {
        if (balances[msg.sender] >= amount) {
            balances[msg.sender] -= amount;
        } else {
            amount = balances[msg.sender];
            balances[msg.sender] = 0;
        }
        IMockUSDC(asset).mint(msg.sender, amount);
        if (totalSupplyMock >= amount) totalSupplyMock -= amount;
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    /// @notice Test helper: credit `account` with `amt` of simulated interest.
    function simulateInterest(address account, uint256 amt) external {
        balances[account] += amt;
        totalSupplyMock += amt;
    }

    function getSupplyRate(uint256) external view returns (uint64) {
        return supplyRateMock;
    }

    function getUtilization() external view returns (uint256) {
        return utilizationMock;
    }

    function totalSupply() external view returns (uint256) {
        return totalSupplyMock;
    }

    function setSupplyRate(uint64 r) external {
        supplyRateMock = r;
    }

    function setUtilization(uint256 u) external {
        utilizationMock = u;
    }
}
