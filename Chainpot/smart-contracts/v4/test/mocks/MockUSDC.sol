// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Minimal 6-decimal USDC mock with an optional transfer blacklist (for the H-04 test).
contract MockUSDC {
    string public name = "MockUSDC";
    string public symbol = "mUSDC";
    uint8 public decimals = 6;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public blocked; // simulates USDC's transfer blacklist

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

    function setBlocked(address who, bool v) external {
        blocked[who] = v;
    }

    function mint(address to, uint256 amt) external {
        balanceOf[to] += amt;
        emit Transfer(address(0), to, amt);
    }

    function approve(address spender, uint256 amt) external returns (bool) {
        allowance[msg.sender][spender] = amt;
        emit Approval(msg.sender, spender, amt);
        return true;
    }

    function transfer(address to, uint256 amt) external returns (bool) {
        _transfer(msg.sender, to, amt);
        return true;
    }

    function transferFrom(address from, address to, uint256 amt) external returns (bool) {
        if (from != msg.sender) {
            uint256 allowed = allowance[from][msg.sender];
            require(allowed >= amt, "insufficient-allowance");
            if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amt;
        }
        _transfer(from, to, amt);
        return true;
    }

    function _transfer(address from, address to, uint256 amt) private {
        require(!blocked[to] && !blocked[from], "USDC: blacklisted");
        require(balanceOf[from] >= amt, "insufficient-balance");
        balanceOf[from] -= amt;
        balanceOf[to] += amt;
        emit Transfer(from, to, amt);
    }
}
