// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Compound V3 Interface (Comet)
interface IComet {
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function borrowBalanceOf(address account) external view returns (uint256);
    function getSupplyRate(uint256 utilization) external view returns (uint64);
    function getUtilization() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function totalBorrow() external view returns (uint256);
    function isLiquidatable(address account) external view returns (bool);
}

/// @title CompoundV3Integrator - USDC-only Compound V3 integration with proper tracking
/// @notice Manages USDC deposits to Compound V3 with per-pot, per-cycle tracking
contract CompoundV3Integrator is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Contract addresses for Base Sepolia
    address public constant COMET_USDC = 0x571621Ce60Cebb0c1D442B5afb38B1663C6Bf017; // Base Sepolia Comet USDC
    address public constant USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // Base Sepolia USDC

    IComet public immutable COMET;
    IERC20 public immutable USDC;

    address public escrow;

    /// @notice Track deposits per pot and cycle for accurate interest calculation
    struct CycleDeposit {
        uint256 principalDeposited;
        uint256 initialCompoundBalance; // Compound balance when deposited
        uint256 withdrawn;
        uint256 timestamp;
        bool active;
    }

    /// @notice Per-pot tracking
    struct PotDeposit {
        uint256 totalPrincipal;
        uint256 totalWithdrawn;
        mapping(uint256 => CycleDeposit) cycles; // cycleId => deposit info
    }

    mapping(uint256 => PotDeposit) private potDeposits; // potId => deposits

    // Global tracking
    uint256 public totalPrincipalSupplied;
    uint256 public totalWithdrawn;
    uint256 public lastUpdateTime;

    // Custom Errors
    error NotAuthorized();
    error InvalidAddress();
    error InvalidAmount();
    error InsufficientUSDCBalance();
    error InsufficientCompoundBalance();
    error InvalidPotId();
    error InvalidCycleId();
    error CycleNotActive();

    // Events
    event SuppliedToCompound(uint256 indexed potId, uint256 indexed cycleId, uint256 amount, uint256 timestamp);
    event WithdrawnFromCompound(uint256 indexed potId, uint256 indexed cycleId, uint256 amount, uint256 timestamp);
    event InterestAccrued(uint256 indexed potId, uint256 indexed cycleId, uint256 amount);
    event EscrowUpdated(address indexed newEscrow);
    event EmergencyWithdrawal(uint256 amount, address recipient);

    constructor() Ownable(msg.sender) {
        COMET = IComet(COMET_USDC);
        USDC = IERC20(USDC_ADDRESS);
        lastUpdateTime = block.timestamp;

        // Approve Comet to spend USDC
        USDC.approve(COMET_USDC, type(uint256).max);
    }

    modifier onlyAuthorized() {
        if (msg.sender != escrow && msg.sender != owner()) {
            revert NotAuthorized();
        }
        _;
    }

    // -------------------- Admin Functions --------------------

    function setEscrow(address _escrow) external onlyOwner {
        if (_escrow == address(0)) revert InvalidAddress();
        if (_escrow.code.length == 0) revert InvalidAddress(); // Must be a contract
        escrow = _escrow;
        emit EscrowUpdated(_escrow);
    }

    function adminApproveComet() external onlyOwner {
        // Approves the COMET contract to spend the max amount of USDC
        // on behalf of this PotContract.
        USDC.approve(address(COMET), type(uint256).max);
    }

    // -------------------- Core Functions --------------------

    /// @notice Supply USDC to Compound V3 for a specific pot and cycle
    /// @param potId The pot identifier
    /// @param cycleId The cycle identifier
    /// @param amount The USDC amount to supply (6 decimals)
    function supplyUSDCForPot(uint256 potId, uint256 cycleId, uint256 amount)
        external
        onlyAuthorized
        whenNotPaused
        nonReentrant
    {
        if (amount <= 0) revert InvalidAmount();
        if (potId == 0) revert InvalidPotId();
        if (cycleId == 0) revert InvalidCycleId();

        // Transfer USDC from caller (escrow)
        USDC.safeTransferFrom(msg.sender, address(this), amount);

        // Get current Compound balance before deposit
        uint256 balanceBefore = COMET.balanceOf(address(this));

        // Supply to Compound V3
        COMET.supply(USDC_ADDRESS, amount);

        // Verify supply succeeded - balance should increase by at least the amount supplied
        uint256 balanceAfter = COMET.balanceOf(address(this));
        if (balanceAfter < balanceBefore + amount) {
            revert InsufficientCompoundBalance(); // Supply verification failed
        }

        // Track the deposit
        PotDeposit storage pot = potDeposits[potId];
        CycleDeposit storage cycle = pot.cycles[cycleId];

        cycle.principalDeposited += amount;
        cycle.initialCompoundBalance = balanceBefore;
        cycle.timestamp = block.timestamp;
        cycle.active = true;

        pot.totalPrincipal += amount;
        totalPrincipalSupplied += amount;
        lastUpdateTime = block.timestamp;

        emit SuppliedToCompound(potId, cycleId, amount, block.timestamp);
    }

    /// @notice Withdraw USDC from Compound V3 for a specific pot/cycle
    /// @param potId The pot identifier
    /// @param cycleId The cycle identifier
    /// @param amount The USDC amount to withdraw
    function withdrawUSDCForPot(uint256 potId, uint256 cycleId, uint256 amount)
        external
        onlyAuthorized
        whenNotPaused
        nonReentrant
    {
        if (amount <= 0) revert InvalidAmount();
        if (potId == 0) revert InvalidPotId();
        if (cycleId == 0) revert InvalidCycleId();

        PotDeposit storage pot = potDeposits[potId];
        CycleDeposit storage cycle = pot.cycles[cycleId];

        if (!cycle.active) revert CycleNotActive();

        // Verify we have enough in Compound
        uint256 compoundBalanceBefore = COMET.balanceOf(address(this));
        if (compoundBalanceBefore < amount) revert InsufficientCompoundBalance();

        // Get USDC balance before withdrawal
        uint256 usdcBalanceBefore = USDC.balanceOf(address(this));

        // Withdraw from Compound V3
        COMET.withdraw(USDC_ADDRESS, amount);

        // Verify withdrawal succeeded - USDC balance should increase by the withdrawn amount
        uint256 usdcBalanceAfter = USDC.balanceOf(address(this));
        if (usdcBalanceAfter < usdcBalanceBefore + amount) {
            revert InsufficientUSDCBalance(); // Withdrawal verification failed
        }

        // Transfer to escrow
        USDC.safeTransfer(msg.sender, amount);

        // Update tracking
        cycle.withdrawn += amount;
        pot.totalWithdrawn += amount;
        totalWithdrawn += amount;
        lastUpdateTime = block.timestamp;

        emit WithdrawnFromCompound(potId, cycleId, amount, block.timestamp);
    }

    /// @notice Withdraw interest only for a specific pot/cycle
    /// @param potId The pot identifier
    /// @param cycleId The cycle identifier
    function withdrawInterestForPot(uint256 potId, uint256 cycleId)
        external
        onlyAuthorized
        whenNotPaused
        nonReentrant
        returns (uint256 interestAmount)
    {
        if (potId == 0) revert InvalidPotId();
        if (cycleId == 0) revert InvalidCycleId();

        // Calculate interest earned
        interestAmount = getPotCycleInterest(potId, cycleId);

        if (interestAmount == 0) {
            return 0;
        }

        // Get USDC balance before withdrawal
        uint256 usdcBalanceBefore = USDC.balanceOf(address(this));

        // Withdraw interest from Compound
        COMET.withdraw(USDC_ADDRESS, interestAmount);

        // Verify withdrawal succeeded
        uint256 usdcBalanceAfter = USDC.balanceOf(address(this));
        if (usdcBalanceAfter < usdcBalanceBefore + interestAmount) {
            revert InsufficientUSDCBalance(); // Interest withdrawal verification failed
        }

        // Transfer to escrow
        USDC.safeTransfer(msg.sender, interestAmount);

        // Update tracking (this is interest, not principal)
        totalWithdrawn += interestAmount;
        lastUpdateTime = block.timestamp;

        emit InterestAccrued(potId, cycleId, interestAmount);

        return interestAmount;
    }

    /// @notice Compound any earned interest back into the pool
    function compoundInterest() external onlyAuthorized whenNotPaused {
        uint256 currentBalance = COMET.balanceOf(address(this));
        uint256 netInterest = currentBalance > totalPrincipalSupplied ? currentBalance - totalPrincipalSupplied : 0;

        if (netInterest > 0) {
            // Interest is automatically compounded in Compound V3
            totalPrincipalSupplied += netInterest;
        }

        lastUpdateTime = block.timestamp;
    }

    // -------------------- View Functions --------------------

    /// @notice Get current USDC balance in Compound
    function getCompoundUSDCBalance() external view returns (uint256) {
        return COMET.balanceOf(address(this));
    }

    /// @notice Get interest earned for a specific pot/cycle
    /// @param potId The pot identifier
    /// @param cycleId The cycle identifier
    /// @return interestEarned The interest earned (in USDC, 6 decimals)
    function getPotCycleInterest(uint256 potId, uint256 cycleId) public view returns (uint256 interestEarned) {
        PotDeposit storage pot = potDeposits[potId];
        CycleDeposit storage cycle = pot.cycles[cycleId];

        if (!cycle.active || cycle.principalDeposited == 0) {
            return 0;
        }

        // Get current Compound balance
        uint256 currentCompoundBalance = COMET.balanceOf(address(this));

        // Calculate this cycle's share of total deposits
        uint256 cycleShare = (cycle.principalDeposited * 1e18) / totalPrincipalSupplied;

        // Calculate this cycle's current value in Compound
        uint256 cycleCurrentValue = (currentCompoundBalance * cycleShare) / 1e18;

        // Interest = current value - principal - already withdrawn
        if (cycleCurrentValue > cycle.principalDeposited) {
            interestEarned = cycleCurrentValue - cycle.principalDeposited - cycle.withdrawn;
        } else {
            interestEarned = 0;
        }

        return interestEarned;
    }

    /// @notice Get pot's total deposits and withdrawals
    function getPotStats(uint256 potId) external view returns (uint256 principal, uint256 withdrawn) {
        PotDeposit storage pot = potDeposits[potId];
        return (pot.totalPrincipal, pot.totalWithdrawn);
    }

    /// @notice Get cycle-specific deposit info
    function getCycleDeposit(uint256 potId, uint256 cycleId)
        external
        view
        returns (uint256 principalDeposited, uint256 withdrawn, uint256 timestamp, bool active)
    {
        CycleDeposit storage cycle = potDeposits[potId].cycles[cycleId];
        return (cycle.principalDeposited, cycle.withdrawn, cycle.timestamp, cycle.active);
    }

    /// @notice Get current supply APY from Compound V3
    function getCurrentSupplyAPY() external view returns (uint256) {
        uint256 utilization = COMET.getUtilization();
        uint64 supplyRate = COMET.getSupplyRate(utilization);

        // Convert from per-second rate to APY percentage
        // supplyRate is in 1e18 precision per second
        uint256 secondsPerYear = 365 days;
        return (uint256(supplyRate) * secondsPerYear * 100) / 1e18;
    }

    /// @notice Get market utilization
    function getMarketUtilization() external view returns (uint256) {
        return COMET.getUtilization();
    }

    /// @notice Get total market supply and borrow
    function getMarketStats() external view returns (uint256 totalSupply, uint256 totalBorrow) {
        return (COMET.totalSupply(), COMET.totalBorrow());
    }

    /// @notice Check if account is healthy (not liquidatable)
    function isAccountHealthy() external view returns (bool) {
        return !COMET.isLiquidatable(address(this));
    }

    /// @notice Get contract's USDC balance (not in Compound)
    function getUSDCBalance() external view returns (uint256) {
        return USDC.balanceOf(address(this));
    }

    /// @notice Get total principal supplied across all pots
    function getTotalPrincipalSupplied() external view returns (uint256) {
        return totalPrincipalSupplied;
    }

    /// @notice Get total withdrawn across all pots
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /// @notice Get total interest earned (approximate)
    function getTotalInterestEarned() external view returns (uint256) {
        uint256 currentBalance = COMET.balanceOf(address(this));
        if (currentBalance > totalPrincipalSupplied) {
            return currentBalance - totalPrincipalSupplied;
        }
        return 0;
    }

    // -------------------- Emergency Functions --------------------

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Emergency withdraw all funds from Compound
    function emergencyWithdrawAll() external onlyOwner whenPaused nonReentrant {
        uint256 balance = COMET.balanceOf(address(this));
        if (balance > 0) {
            COMET.withdraw(USDC_ADDRESS, balance);
            emit EmergencyWithdrawal(balance, owner());
        }
    }

    /// @notice Emergency withdraw specific USDC amount
    function emergencyWithdrawUSDC(uint256 amount) external onlyOwner whenPaused nonReentrant {
        if (amount <= 0) revert InvalidAmount();

        uint256 contractBalance = USDC.balanceOf(address(this));

        if (contractBalance < amount) {
            // Need to withdraw from Compound
            uint256 needed = amount - contractBalance;
            COMET.withdraw(USDC_ADDRESS, needed);
        }

        USDC.safeTransfer(owner(), amount);
        emit EmergencyWithdrawal(amount, owner());
    }

    /// @notice Rescue any stuck tokens (not USDC)
    function rescueTokens(address token, uint256 amount) external onlyOwner {
        if (token == USDC_ADDRESS) revert InvalidAddress();
        IERC20(token).safeTransfer(owner(), amount);
    }
}

// deployed address: 0x0F14B892D9e9aF87d4B877a0DaC35374D37b4ea4
//deployed address with approval fun: 0xbc67b4C9eEFd3330932D387CF50956774949A358
