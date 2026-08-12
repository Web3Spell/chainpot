// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockCompoundV3Integrator {
    mapping(uint256 => mapping(uint256 => uint256)) public potCycleBalance; // principal only
    mapping(uint256 => mapping(uint256 => uint256)) public interest; // pretend interest
    mapping(uint256 => mapping(uint256 => uint256)) public balances;
    bool private _allWithdrawn;
    IERC20 public usdc;

    mapping(uint256 => mapping(uint256 => uint256)) public potCycleInterest;

    function setUSDC(address _usdc) external {
        usdc = IERC20(_usdc);
    }

    // Simulate depositing into Compound
    function deposit(uint256 potId, uint256 cycleId, uint256 amount) external {
        balances[potId][cycleId] += amount;
    }

    // Simulate withdrawing to Escrow
    function withdraw(uint256 potId, uint256 cycleId, uint256 amount) external returns (uint256) {
        uint256 bal = balances[potId][cycleId];
        if (amount > bal) {
            amount = bal; // mock behavior: return whatever is left
        }
        balances[potId][cycleId] -= amount;
        return amount;
    }

    // Called by escrow.withdrawPotInterest()
    function withdrawInterest(uint256 potId, uint256 cycleId) external returns (uint256) {
        uint256 amt = interest[potId][cycleId];
        interest[potId][cycleId] = 0;
        return amt;
    }

    // Emergency withdraw all
    function withdrawAll() external {
        _allWithdrawn = true;
    }

    function allWithdrawnCalled() external view returns (bool) {
        return _allWithdrawn;
    }

    function supplyUSDCForPot(uint256 potId, uint256 cycleId, uint256 amount) external {
        // pull tokens from caller (Escrow)
        bool ok = usdc.transferFrom(msg.sender, address(this), amount);
        require(ok, "transferFrom failed");

        potCycleBalance[potId][cycleId] += amount;
    }

    function getPotCycleInterest(uint256 potId, uint256 cycleId) external view returns (uint256) {
        return interest[potId][cycleId];
    }

    // Testing helpers

    function getCompoundUSDCBalance() external pure returns (uint256) {
        return 0; // not used in basic tests
    }

    function emergencyWithdrawUSDC(uint256) external {}
    function emergencyWithdrawAll() external {}
    // --- Mock Behavior: mimic real Compound flow ---

    function withdrawUSDCForPot(uint256 potId, uint256 cycleId, uint256 amount) external {
        require(potCycleBalance[potId][cycleId] >= amount, "not enough");

        potCycleBalance[potId][cycleId] -= amount;

        // return tokens to Escrow
        bool ok = usdc.transfer(msg.sender, amount);
        require(ok, "transfer failed");
    }

    function withdrawInterestForPot(uint256 potId, uint256 cycleId) external returns (uint256 interest) {
        interest = potCycleInterest[potId][cycleId];
        potCycleInterest[potId][cycleId] = 0;

        bool ok = usdc.transfer(msg.sender, interest);
        require(ok, "transfer failed");
    }

    // helper for tests
    function setInterest(uint256 potId, uint256 cycleId, uint256 amount) external {
        potCycleInterest[potId][cycleId] = amount;
    }
}
