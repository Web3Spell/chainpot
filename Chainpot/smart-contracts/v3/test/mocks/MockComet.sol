// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMintable {
    function mint(address to, uint256 amount) external;
}

/// @notice Lightweight Comet mock that simulates linear interest accrual.
/// @dev presentValue(account) = principal[account] * cumulativeIndex / userIndex[account]
///      Index increments by `supplyRate * elapsed / 1e18` whenever any state-changing op runs.
contract MockComet {
    IERC20 public immutable BASE;

    uint256 public constant INDEX_SCALE = 1e18;
    uint256 public cumulativeIndex = 1e18; // starts at 1.0
    uint256 public lastAccrualTime;
    /// @notice supply rate per second (1e18 = 100% per second). E.g. 1e9 ≈ 3.15% APY.
    uint256 public supplyRatePerSecond;

    mapping(address => uint256) public principalUSDC;
    mapping(address => uint256) public userIndex;

    constructor(address _base, uint256 _supplyRatePerSecond) {
        BASE = IERC20(_base);
        supplyRatePerSecond = _supplyRatePerSecond;
        lastAccrualTime = block.timestamp;
    }

    function setSupplyRate(uint256 newRate) external {
        _accrue();
        supplyRatePerSecond = newRate;
    }

    function _accrue() internal {
        uint256 elapsed = block.timestamp - lastAccrualTime;
        if (elapsed > 0 && supplyRatePerSecond > 0) {
            uint256 increment = (cumulativeIndex * supplyRatePerSecond * elapsed) / 1e18;
            cumulativeIndex += increment;
        }
        lastAccrualTime = block.timestamp;
    }

    function _currentIndex() internal view returns (uint256) {
        uint256 elapsed = block.timestamp - lastAccrualTime;
        if (elapsed == 0 || supplyRatePerSecond == 0) return cumulativeIndex;
        uint256 increment = (cumulativeIndex * supplyRatePerSecond * elapsed) / 1e18;
        return cumulativeIndex + increment;
    }

    function supply(address asset, uint256 amount) external {
        require(asset == address(BASE), "wrong asset");
        _accrue();

        // Promote existing balance up to the current index, then add the new principal.
        if (userIndex[msg.sender] != 0 && principalUSDC[msg.sender] > 0) {
            principalUSDC[msg.sender] = (principalUSDC[msg.sender] * cumulativeIndex) / userIndex[msg.sender];
        }
        userIndex[msg.sender] = cumulativeIndex;
        principalUSDC[msg.sender] += amount;

        BASE.transferFrom(msg.sender, address(this), amount);
    }

    function withdraw(address asset, uint256 amount) external {
        require(asset == address(BASE), "wrong asset");
        _accrue();

        // Promote balance up to current index.
        if (userIndex[msg.sender] != 0 && principalUSDC[msg.sender] > 0) {
            principalUSDC[msg.sender] = (principalUSDC[msg.sender] * cumulativeIndex) / userIndex[msg.sender];
        }
        userIndex[msg.sender] = cumulativeIndex;

        require(principalUSDC[msg.sender] >= amount, "insufficient");
        principalUSDC[msg.sender] -= amount;

        // If our underlying-token balance is short of the accrued amount, mint the gap.
        // Real Comet pays interest from borrower reserves; this mock simulates that.
        uint256 selfBal = BASE.balanceOf(address(this));
        if (selfBal < amount) {
            IMintable(address(BASE)).mint(address(this), amount - selfBal);
        }
        BASE.transfer(msg.sender, amount);
    }

    function balanceOf(address account) external view returns (uint256) {
        if (userIndex[account] == 0 || principalUSDC[account] == 0) return 0;
        uint256 idx = _currentIndex();
        return (principalUSDC[account] * idx) / userIndex[account];
    }

    function getSupplyRate(uint256) external view returns (uint64) {
        return uint64(supplyRatePerSecond);
    }

    function getUtilization() external pure returns (uint256) {
        return 5e17; // 50%
    }

    function totalSupply() external pure returns (uint256) {
        return 0;
    }
}
