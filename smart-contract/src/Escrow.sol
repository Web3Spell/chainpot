// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {CompoundV3Integrator} from "./CompoundV3Integrator.sol";

/// @title Escrow - Manages all funds with proper tracking per pot/cycle
/// @notice Holds member contributions, deposits to Compound, tracks interest
contract Escrow is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable USDC;
    CompoundV3Integrator public compoundIntegrator;
    address public auctionEngine;

    /// @notice Deposit information for accounting
    struct DepositInfo {
        uint256 amount;
        uint256 potId;
        uint256 cycleId;
        address depositor;
        uint256 timestamp;
        bool isActive;
    }

    /// @notice Per-cycle fund tracking
    struct CycleFunds {
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        uint256 interestEarned;
        uint256 principalInCompound;
        bool cycleCompleted;
        mapping(address => uint256) memberContributions;
    }

    /// @notice Per-pot fund tracking
    struct PotFunds {
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        uint256 totalInterestEarned;
        uint256 activeCycles;
        mapping(uint256 => CycleFunds) cycles; // cycleId => funds
    }

    uint256 public depositCounter = 1;
    
    mapping(uint256 => DepositInfo) public deposits;
    mapping(uint256 => uint256[]) public cycleDeposits; // cycleId => deposit IDs
    mapping(address => uint256[]) public userDeposits; // user => deposit IDs
    mapping(uint256 => PotFunds) private potFunds; // potId => pot funds

    // Global tracking
    uint256 public totalUSDCDeposited;
    uint256 public totalUSDCWithdrawn;
    uint256 public totalInCompound;

    // Custom Errors
    error InvalidAddress();
    error InvalidAmount();
    error InvalidPotId();
    error InvalidCycleId();
    error InvalidDepositId(uint256 depositId);
    error DepositDoesNotExist(uint256 depositId);
    error UnauthorizedCaller(address caller);
    error InsufficientBalance(uint256 requested, uint256 available);
    error InsufficientCycleBalance(uint256 potId, uint256 cycleId);
    error CycleAlreadyCompleted(uint256 potId, uint256 cycleId);
    error NoInterestAvailable();
    error InvalidUSDCAddress();

    // Events
    event FundsDeposited(
        uint256 indexed depositId,
        uint256 indexed potId,
        uint256 indexed cycleId,
        address depositor,
        uint256 amount
    );
    event FundsDepositedToCompound(uint256 indexed potId, uint256 indexed cycleId, uint256 amount);
    event FundsWithdrawn(uint256 indexed potId, uint256 indexed cycleId, address indexed recipient, uint256 amount);
    event WinnerPaid(uint256 indexed potId, uint256 indexed cycleId, address indexed winner, uint256 amount);
    event InterestWithdrawn(uint256 indexed potId, uint256 indexed cycleId, address indexed recipient, uint256 amount);
    event InterestDistributed(uint256 indexed cycleId, uint256 totalInterest);
    event AuctionEngineUpdated(address indexed oldEngine, address indexed newEngine);
    event CompoundIntegratorUpdated(address indexed oldIntegrator, address indexed newIntegrator);
    event CycleCompleted(uint256 indexed potId, uint256 indexed cycleId);

    constructor(address _usdc, address _compoundIntegrator) Ownable(msg.sender) {
        if (_usdc == address(0)) revert InvalidUSDCAddress();
        if (_compoundIntegrator == address(0)) revert InvalidAddress();

        USDC = IERC20(_usdc);
        compoundIntegrator = CompoundV3Integrator(_compoundIntegrator);
    }



    modifier onlyAuctionEngine() {
        if (msg.sender != auctionEngine) revert UnauthorizedCaller(msg.sender);
        _;
    }

    // -------------------- Admin Functions --------------------

    function setAuctionEngine(address _auctionEngine) external onlyOwner {
        if (_auctionEngine == address(0)) revert InvalidAddress();

        address oldEngine = auctionEngine;
        auctionEngine = _auctionEngine;

        emit AuctionEngineUpdated(oldEngine, _auctionEngine);
    }

    function setCompoundIntegrator(address _compoundIntegrator) external onlyOwner {
        if (_compoundIntegrator == address(0)) revert InvalidAddress();

        address oldIntegrator = address(compoundIntegrator);
        compoundIntegrator = CompoundV3Integrator(_compoundIntegrator);

        emit CompoundIntegratorUpdated(oldIntegrator, _compoundIntegrator);
    }

    // -------------------- Core Functions --------------------

    /// @notice Deposit USDC for a specific pot and cycle, then supply to Compound
    /// @param potId The pot identifier
    /// @param cycleId The cycle identifier
    /// @param member The member making the deposit
    /// @param amount The USDC amount (6 decimals)
    function depositUSDC(
        uint256 potId,
        uint256 cycleId,
        address member,
        uint256 amount
    ) external onlyAuctionEngine whenNotPaused nonReentrant {
        if (amount <= 0) revert InvalidAmount();
        if (member == address(0)) revert InvalidAddress();
        if (potId <= 0) revert InvalidPotId();
        if (cycleId <= 0) revert InvalidCycleId();

        // Transfer USDC from AuctionEngine to this contract
        USDC.safeTransferFrom(msg.sender, address(this), amount);

        // Track the deposit
        uint256 depositId = depositCounter++;
        deposits[depositId] = DepositInfo({
            amount: amount,
            potId: potId,
            cycleId: cycleId,
            depositor: member,
            timestamp: block.timestamp,
            isActive: true
        });

        cycleDeposits[cycleId].push(depositId);
        userDeposits[member].push(depositId);

        // Update pot and cycle tracking
        PotFunds storage pot = potFunds[potId];
        CycleFunds storage cycle = pot.cycles[cycleId];

        pot.totalDeposited += amount;
        cycle.totalDeposited += amount;
        cycle.memberContributions[member] += amount;
        cycle.principalInCompound += amount;

        totalUSDCDeposited += amount;
        totalInCompound += amount;

        // Approve and supply to Compound
        USDC.approve(address(compoundIntegrator), amount);
        compoundIntegrator.supplyUSDCForPot(potId, cycleId, amount);

        emit FundsDeposited(depositId, potId, cycleId, member, amount);
        emit FundsDepositedToCompound(potId, cycleId, amount);
    }

    /// @notice Release funds to the winner of the cycle
    /// @param potId The pot identifier
    /// @param cycleId The cycle identifier
    /// @param winner The winner's address
    /// @param amount The winning bid amount
    function releaseFundsToWinner(
        uint256 potId,
        uint256 cycleId,
        address winner,
        uint256 amount
    ) external onlyAuctionEngine whenNotPaused nonReentrant {
        if (amount <= 0) revert InvalidAmount();
        if (winner == address(0)) revert InvalidAddress();

        PotFunds storage pot = potFunds[potId];
        CycleFunds storage cycle = pot.cycles[cycleId];

        // Verify sufficient balance
        if (cycle.principalInCompound < amount) {
            revert InsufficientCycleBalance(potId, cycleId);
        }

        // Withdraw from Compound
        compoundIntegrator.withdrawUSDCForPot(potId, cycleId, amount);

        // Transfer to winner
        USDC.safeTransfer(winner, amount);

        // Update tracking
        cycle.totalWithdrawn += amount;
        cycle.principalInCompound -= amount;
        pot.totalWithdrawn += amount;
        totalUSDCWithdrawn += amount;
        totalInCompound -= amount;

        emit WinnerPaid(potId, cycleId, winner, amount);
    }

    /// @notice Withdraw interest earned for a specific pot cycle
    /// @param potId The pot identifier
    /// @param cycleId The cycle identifier
    /// @return interestAmount The total interest earned for this cycle
    function withdrawPotInterest(
        uint256 potId,
        uint256 cycleId
    ) external onlyAuctionEngine whenNotPaused nonReentrant returns (uint256 interestAmount) {
        PotFunds storage pot = potFunds[potId];
        CycleFunds storage cycle = pot.cycles[cycleId];

        // Get interest from Compound for this pot/cycle
        interestAmount = compoundIntegrator.getPotCycleInterest(potId, cycleId);

        if (interestAmount == 0) {
            return 0; // No interest to withdraw
        }

        // Withdraw interest from Compound (leaves principal)
        compoundIntegrator.withdrawInterestForPot(potId, cycleId);

        // Update tracking
        cycle.interestEarned += interestAmount;
        pot.totalInterestEarned += interestAmount;

        return interestAmount;
    }

    /// @notice Distribute interest to a specific member
    /// @param potId The pot identifier
    /// @param cycleId The cycle identifier
    /// @param recipient The recipient address
    /// @param amount The interest amount to distribute
    function withdrawInterest(
        uint256 potId,
        uint256 cycleId,
        address recipient,
        uint256 amount
    ) external onlyAuctionEngine whenNotPaused nonReentrant {
        if (amount <= 0) revert InvalidAmount();
        if (recipient == address(0)) revert InvalidAddress();

        PotFunds storage pot = potFunds[potId];
        CycleFunds storage cycle = pot.cycles[cycleId];

        // Verify sufficient interest
        if (cycle.interestEarned < amount) {
            revert NoInterestAvailable();
        }

        // Transfer USDC interest to recipient
        USDC.safeTransfer(recipient, amount);

        // Update tracking
        cycle.interestEarned -= amount;
        cycle.totalWithdrawn += amount;
        pot.totalWithdrawn += amount;
        totalUSDCWithdrawn += amount;

        emit InterestWithdrawn(potId, cycleId, recipient, amount);
    }

    /// @notice Mark a cycle as completed
    /// @param potId The pot identifier
    /// @param cycleId The cycle identifier
    function markCycleCompleted(
        uint256 potId,
        uint256 cycleId
    ) external onlyAuctionEngine {
        PotFunds storage pot = potFunds[potId];
        CycleFunds storage cycle = pot.cycles[cycleId];

        if (cycle.cycleCompleted) revert CycleAlreadyCompleted(potId, cycleId);

        cycle.cycleCompleted = true;
        
        emit CycleCompleted(potId, cycleId);
    }

    // -------------------- View Functions --------------------

    /// @notice Get the total USDC balance in Compound
    function getEscrowBalance() external view returns (uint256) {
        return compoundIntegrator.getCompoundUSDCBalance();
    }

    /// @notice Get pot-specific funds information
    /// @param potId The pot identifier
    /// @return totalDeposited Total USDC deposited for this pot
    /// @return totalWithdrawn Total USDC withdrawn for this pot
    /// @return totalInterestEarned Total interest earned for this pot
    function getPotFunds(uint256 potId)
        external
        view
        returns (uint256 totalDeposited, uint256 totalWithdrawn, uint256 totalInterestEarned)
    {
        PotFunds storage pot = potFunds[potId];
        return (pot.totalDeposited, pot.totalWithdrawn, pot.totalInterestEarned);
    }

    /// @notice Get cycle-specific funds information
    /// @param potId The pot identifier
    /// @param cycleId The cycle identifier
    function getCycleFunds(uint256 potId, uint256 cycleId)
        external
        view
        returns (
            uint256 totalDeposited,
            uint256 totalWithdrawn,
            uint256 interestEarned,
            uint256 principalInCompound,
            bool cycleCompleted
        )
    {
        CycleFunds storage cycle = potFunds[potId].cycles[cycleId];
        return (
            cycle.totalDeposited,
            cycle.totalWithdrawn,
            cycle.interestEarned,
            cycle.principalInCompound,
            cycle.cycleCompleted
        );
    }

    /// @notice Get member's contribution for a specific cycle
    function getMemberCycleContribution(
        uint256 potId,
        uint256 cycleId,
        address member
    ) external view returns (uint256) {
        return potFunds[potId].cycles[cycleId].memberContributions[member];
    }

    /// @notice Get all deposits for a cycle
    function getDepositsForCycle(uint256 cycleId) external view returns (uint256[] memory) {
        return cycleDeposits[cycleId];
    }

    /// @notice Get all deposits for a user
    function getDepositsForUser(address user) external view returns (uint256[] memory) {
        return userDeposits[user];
    }

    /// @notice Get individual deposit info
    function getDepositInfo(uint256 depositId) external view returns (DepositInfo memory) {
        if (depositId <= 0 || depositId >= depositCounter) revert InvalidDepositId(depositId);
        if (deposits[depositId].depositor == address(0)) revert DepositDoesNotExist(depositId);
        return deposits[depositId];
    }

    /// @notice Get current deposit counter
    function getCurrentDepositId() external view returns (uint256) {
        return depositCounter - 1;
    }

    /// @notice Get global statistics
    function getGlobalStats()
        external
        view
        returns (uint256 totalDeposited, uint256 totalWithdrawn, uint256 currentInCompound)
    {
        return (totalUSDCDeposited, totalUSDCWithdrawn, totalInCompound);
    }

    // -------------------- Emergency Functions --------------------

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Emergency withdrawal (owner only, when paused)
    function emergencyWithdrawUSDC(uint256 amount, address to) external onlyOwner whenPaused nonReentrant {
        if (amount <= 0) revert InvalidAmount();
        if (to == address(0)) revert InvalidAddress();

        // Try to withdraw from contract balance first
        uint256 contractBalance = USDC.balanceOf(address(this));
        
        if (contractBalance >= amount) {
            USDC.safeTransfer(to, amount);
        } else {
            // Need to withdraw from Compound
            uint256 needed = amount - contractBalance;
            compoundIntegrator.emergencyWithdrawUSDC(needed);
            USDC.safeTransfer(to, amount);
        }
    }

    /// @notice Emergency withdraw all from Compound
    function emergencyWithdrawAllFromCompound() external onlyOwner whenPaused {
        compoundIntegrator.emergencyWithdrawAll();
    }

    function preApproveCompound() external onlyOwner {
        USDC.approve(address(compoundIntegrator), type(uint256).max);
    }
}

// _usdc address: 0x036cbd53842c5426634e7929541ec2318f3dcf7e
// Escrow deployed address: 0x98F3371268aE0D740adc4FEFCF6E9F13a69E8A7d
// approval fun: 0x9A7f955da6a03e3621385aeC566754ccd0adE11f
// 0x9de8a523828136141405465efAaF7c6220C760DD
