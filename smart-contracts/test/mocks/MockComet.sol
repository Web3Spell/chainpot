// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMockUSDC {
    function transferFrom(address from, address to, uint256 amt) external returns (bool);
    function mint(address to, uint256 amt) external;
    function transfer(address to, uint256 amt) external returns (bool);
}

/// Minimal Comet mock that listens to `supply`/`withdraw` calls from integrator.
/// - `supply`: comet will pull USDC from caller (requires allowance set previously)
/// - `withdraw`: comet will mint USDC to caller (simulates sending token to integrator)
contract MockComet {
    mapping(address => uint256) public balances;
    uint256 public totalSupplyMock;
    uint256 public totalBorrowMock;
    uint256 public utilizationMock;
    uint64 public supplyRateMock;
    bool private _liquidatable;
    address public usdcAddr;

    function setUSDC(address _usdc) external {
        usdcAddr = _usdc;
    }

    function supply(address asset, uint256 amount) external {
        require(asset != address(0), "bad-asset");
        // pulls USDC from integrator (msg.sender)
        IMockUSDC(asset).transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;
        totalSupplyMock += amount;
    }

    function withdraw(address asset, uint256 amount) external {
        // decrease internal comet balance for caller if available (if not, just mint)
        if (balances[msg.sender] >= amount) {
            balances[msg.sender] -= amount;
        } else {
            // allow withdraw even if comet didn't track it for more flexible testing
            if (balances[msg.sender] > 0) {
                amount = balances[msg.sender];
                balances[msg.sender] = 0;
            }
        }
        // mint USDC to caller to simulate transfer back from Comet
        IMockUSDC(asset).mint(msg.sender, amount);
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function borrowBalanceOf(address) external pure returns (uint256) {
        return 0;
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

    function totalBorrow() external view returns (uint256) {
        return totalBorrowMock;
    }

    function isLiquidatable(address) external view returns (bool) {
        return _liquidatable;
    }

    // testing helpers
    function setSupplyRate(uint64 r) external {
        supplyRateMock = r;
    }

    function setUtilization(uint256 u) external {
        utilizationMock = u;
    }

    function setLiquidatable(bool v) external {
        _liquidatable = v;
    }
}
