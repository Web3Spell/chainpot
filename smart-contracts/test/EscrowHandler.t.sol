// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {Escrow} from "../src/Escrow.sol";
import {MockCompoundV3Integrator} from "./mocks/MockCompundV3Integrator.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

/// @notice State machine handler for invariant tests
contract EscrowHandler is Test {
    Escrow internal escrow;
    MockUSDC internal usdc;
    MockCompoundV3Integrator internal compound;

    address internal auction;
    address internal owner;

    // running sums for invariants
    uint256 public totalDeposited;
    uint256 public totalReleased;

    constructor(Escrow _escrow, MockUSDC _usdc, MockCompoundV3Integrator _compound, address _auction, address _owner) {
        escrow = _escrow;
        usdc = _usdc;
        compound = _compound;
        auction = _auction;
        owner = _owner;
    }

    /// ----------------------------------------------------------
    ///  FUZZ ACTION: random deposit
    /// ----------------------------------------------------------
    function deposit(uint256 potId, uint256 cycleId, uint256 amount) public {
        potId = bound(potId, 1, 20);
        cycleId = bound(cycleId, 1, 20);
        amount = bound(amount, 1e6, 5_000e6);

        // mint to auction for transfers
        usdc.mint(auction, amount);

        vm.startPrank(auction);
        usdc.approve(address(escrow), amount);

        escrow.depositUSDC(potId, cycleId, msg.sender, amount);

        vm.stopPrank();

        totalDeposited += amount;
    }

    /// ----------------------------------------------------------
    ///  FUZZ ACTION: random release to random winner
    /// ----------------------------------------------------------
    function release(uint256 potId, uint256 cycleId, uint256 amount) public {
        potId = bound(potId, 1, 20);
        cycleId = bound(cycleId, 1, 20);
        amount = bound(amount, 1e6, 2_000e6);

        address winner = address(uint160(uint256(keccak256(abi.encodePacked(msg.sender, potId, cycleId)))));

        vm.prank(auction);

        // ignore failures (valid for invariant model)
        try escrow.releaseFundsToWinner(potId, cycleId, winner, amount) {
            totalReleased += amount;
        } catch {}
    }

    /// ----------------------------------------------------------
    ///  FUZZ ACTION: fetch interest (no-op for model)
    /// ----------------------------------------------------------
    function harvestInterest(uint256 potId, uint256 cycleId, uint256 amount) public {
        potId = bound(potId, 1, 20);
        cycleId = bound(cycleId, 1, 20);
        amount = bound(amount, 1e6, 500e6);

        // set interest into mock integrator
        compound.setInterest(potId, cycleId, amount);

        vm.prank(auction);
        try escrow.withdrawPotInterest(potId, cycleId) {} catch {}
    }
}
