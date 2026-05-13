// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IComet {
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function getSupplyRate(uint256 utilization) external view returns (uint64);
    function getUtilization() external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

interface ICometRewards {
    function claim(address comet, address src, bool shouldAccrue) external;
}

/// @title CompoundIntegratorV3
/// @notice Vault-style (ERC4626 math) Compound III adapter with per-cycle share accounting.
/// @dev Fixes C-02/C-04 from audit. Each supply mints shares; each withdrawal burns proportional shares.
///      Interest is computed as (cycleShares * totalAssets / totalShares) - remainingPrincipal - withdrawnInterest.
contract CompoundIntegratorV3 is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IComet public immutable COMET;
    IERC20 public immutable USDC;
    ICometRewards public cometRewards; // optional

    address public escrow;

    struct CycleDeposit {
        uint256 shares;
        uint256 principalDeposited;
        uint256 withdrawnPrincipal;
        uint256 withdrawnInterest;
        uint256 timestamp;
        bool active;
    }

    struct PotDeposit {
        uint256 totalShares;
        uint256 totalPrincipal;
        mapping(uint256 => CycleDeposit) cycles;
    }

    mapping(uint256 => PotDeposit) private potDeposits;

    /// @notice Global share supply across all pots/cycles.
    uint256 public totalShares;
    /// @notice Sum of principal currently deposited (decremented on withdrawal).
    uint256 public totalPrincipal;
    uint256 public lastUpdateTime;

    error NotAuthorized();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidPotId();
    error InvalidCycleId();
    error CycleNotActive();
    error InsufficientCycleValue();
    error CometSupplyFailed();
    error CometWithdrawFailed();
    error CannotRescueBaseAsset();

    event SuppliedToCompound(uint256 indexed potId, uint256 indexed cycleId, uint256 amount, uint256 sharesMinted);
    event WithdrawnPrincipal(uint256 indexed potId, uint256 indexed cycleId, uint256 amount, uint256 sharesBurned);
    event WithdrawnInterest(uint256 indexed potId, uint256 indexed cycleId, uint256 amount, uint256 sharesBurned);
    event WithdrawnRemainder(uint256 indexed potId, uint256 indexed cycleId, uint256 amount, uint256 sharesBurned);
    event EscrowUpdated(address indexed newEscrow);
    event CometRewardsUpdated(address indexed newRewards);
    event RewardsClaimed(address indexed to);
    event EmergencyWithdrawal(uint256 amount, address recipient);

    constructor(address _comet, address _usdc) Ownable(msg.sender) {
        if (_comet == address(0) || _usdc == address(0)) revert InvalidAddress();
        if (_comet.code.length == 0 || _usdc.code.length == 0) revert InvalidAddress();
        COMET = IComet(_comet);
        USDC = IERC20(_usdc);
        lastUpdateTime = block.timestamp;
        IERC20(_usdc).forceApprove(_comet, type(uint256).max);
    }

    modifier onlyAuthorized() {
        if (msg.sender != escrow && msg.sender != owner()) revert NotAuthorized();
        _;
    }

    // ---- Admin ----

    function setEscrow(address _escrow) external onlyOwner {
        if (_escrow == address(0) || _escrow.code.length == 0) revert InvalidAddress();
        escrow = _escrow;
        emit EscrowUpdated(_escrow);
    }

    function setCometRewards(address _rewards) external onlyOwner {
        cometRewards = ICometRewards(_rewards);
        emit CometRewardsUpdated(_rewards);
    }

    // ---- Core ----

    /// @notice Total value (principal + accrued interest) of this integrator's Compound deposit.
    function totalAssets() public view returns (uint256) {
        return COMET.balanceOf(address(this));
    }

    /// @notice Convert a share amount to its current USDC value.
    function convertToAssets(uint256 shares) public view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares * totalAssets()) / totalShares;
    }

    /// @notice Convert a USDC amount to shares at the current price-per-share.
    function convertToShares(uint256 assets) public view returns (uint256) {
        uint256 _totalAssets = totalAssets();
        if (totalShares == 0 || _totalAssets == 0) return assets; // 1:1 initial
        return (assets * totalShares) / _totalAssets;
    }

    /// @notice Supply USDC to Compound for a specific pot/cycle. Mints shares.
    function supplyUSDCForPot(uint256 potId, uint256 cycleId, uint256 amount)
        external
        onlyAuthorized
        whenNotPaused
        nonReentrant
    {
        if (amount == 0) revert InvalidAmount();
        if (potId == 0) revert InvalidPotId();
        if (cycleId == 0) revert InvalidCycleId();

        USDC.safeTransferFrom(msg.sender, address(this), amount);

        // Compute shares BEFORE supply increases totalAssets.
        uint256 shares = convertToShares(amount);
        if (shares == 0) shares = amount; // safety floor for first/edge case

        uint256 balanceBefore = COMET.balanceOf(address(this));
        COMET.supply(address(USDC), amount);
        uint256 balanceAfter = COMET.balanceOf(address(this));
        // Allow 1 wei tolerance for Comet's interest-rounding.
        if (balanceAfter + 1 < balanceBefore + amount) revert CometSupplyFailed();

        PotDeposit storage pot = potDeposits[potId];
        CycleDeposit storage cycle = pot.cycles[cycleId];
        cycle.shares += shares;
        cycle.principalDeposited += amount;
        if (!cycle.active) {
            cycle.active = true;
            cycle.timestamp = block.timestamp;
        }

        pot.totalShares += shares;
        pot.totalPrincipal += amount;
        totalShares += shares;
        totalPrincipal += amount;
        lastUpdateTime = block.timestamp;

        emit SuppliedToCompound(potId, cycleId, amount, shares);
    }

    /// @notice Withdraw exactly `amount` USDC for a winner payout. Burns proportional shares.
    function withdrawUSDCForPot(uint256 potId, uint256 cycleId, uint256 amount)
        external
        onlyAuthorized
        whenNotPaused
        nonReentrant
    {
        if (amount == 0) revert InvalidAmount();

        PotDeposit storage pot = potDeposits[potId];
        CycleDeposit storage cycle = pot.cycles[cycleId];
        if (!cycle.active) revert CycleNotActive();

        uint256 cycleValue = convertToAssets(cycle.shares);
        if (cycleValue < amount) revert InsufficientCycleValue();

        uint256 sharesToBurn = (amount * cycle.shares) / cycleValue;

        uint256 usdcBefore = USDC.balanceOf(address(this));
        COMET.withdraw(address(USDC), amount);
        uint256 usdcAfter = USDC.balanceOf(address(this));
        if (usdcAfter + 1 < usdcBefore + amount) revert CometWithdrawFailed();

        USDC.safeTransfer(msg.sender, amount);

        cycle.shares -= sharesToBurn;
        cycle.withdrawnPrincipal += amount;

        pot.totalShares -= sharesToBurn;
        if (pot.totalPrincipal >= amount) pot.totalPrincipal -= amount;
        totalShares -= sharesToBurn;
        if (totalPrincipal >= amount) totalPrincipal -= amount;
        lastUpdateTime = block.timestamp;

        emit WithdrawnPrincipal(potId, cycleId, amount, sharesToBurn);
    }

    /// @notice Withdraw the cycle's entire remaining value (residual principal + accrued interest).
    /// @dev Used after winner payout to harvest the auction discount + interest for non-winners.
    function withdrawCycleRemainder(uint256 potId, uint256 cycleId)
        external
        onlyAuthorized
        whenNotPaused
        nonReentrant
        returns (uint256 remainderAmount)
    {
        PotDeposit storage pot = potDeposits[potId];
        CycleDeposit storage cycle = pot.cycles[cycleId];
        if (!cycle.active) revert CycleNotActive();

        if (cycle.shares == 0) return 0;

        uint256 cycleValue = convertToAssets(cycle.shares);
        if (cycleValue == 0) {
            // shares with no value — burn them and return 0
            pot.totalShares -= cycle.shares;
            totalShares -= cycle.shares;
            cycle.shares = 0;
            return 0;
        }

        uint256 sharesToBurn = cycle.shares;
        remainderAmount = cycleValue;

        uint256 usdcBefore = USDC.balanceOf(address(this));
        COMET.withdraw(address(USDC), remainderAmount);
        uint256 usdcAfter = USDC.balanceOf(address(this));
        // Comet may round down by a wei; accept slightly less.
        uint256 actuallyReceived = usdcAfter - usdcBefore;
        if (actuallyReceived + 1 < remainderAmount) revert CometWithdrawFailed();
        remainderAmount = actuallyReceived;

        USDC.safeTransfer(msg.sender, remainderAmount);

        // Split remainder into "remainingPrincipal" and "interest" for accounting.
        uint256 remainingPrincipal = cycle.principalDeposited - cycle.withdrawnPrincipal;
        if (remainderAmount > remainingPrincipal) {
            cycle.withdrawnPrincipal += remainingPrincipal;
            cycle.withdrawnInterest += (remainderAmount - remainingPrincipal);
        } else {
            cycle.withdrawnPrincipal += remainderAmount;
        }

        cycle.shares = 0;
        pot.totalShares -= sharesToBurn;
        totalShares -= sharesToBurn;
        if (pot.totalPrincipal >= remainingPrincipal) pot.totalPrincipal -= remainingPrincipal;
        if (totalPrincipal >= remainingPrincipal) totalPrincipal -= remainingPrincipal;
        lastUpdateTime = block.timestamp;

        emit WithdrawnRemainder(potId, cycleId, remainderAmount, sharesToBurn);
        return remainderAmount;
    }

    // ---- Reads ----

    function getCycleValue(uint256 potId, uint256 cycleId) external view returns (uint256) {
        return convertToAssets(potDeposits[potId].cycles[cycleId].shares);
    }

    function getCycleInterest(uint256 potId, uint256 cycleId) external view returns (uint256) {
        CycleDeposit storage cycle = potDeposits[potId].cycles[cycleId];
        if (!cycle.active) return 0;
        uint256 cycleValue = convertToAssets(cycle.shares);
        uint256 remainingPrincipal = cycle.principalDeposited - cycle.withdrawnPrincipal;
        if (cycleValue <= remainingPrincipal) return 0;
        uint256 unrealized = cycleValue - remainingPrincipal;
        // unrealized is the not-yet-withdrawn interest only
        return unrealized;
    }

    function getCycleDeposit(uint256 potId, uint256 cycleId)
        external
        view
        returns (
            uint256 shares,
            uint256 principalDeposited,
            uint256 withdrawnPrincipal,
            uint256 withdrawnInterest,
            uint256 timestamp,
            bool active
        )
    {
        CycleDeposit storage c = potDeposits[potId].cycles[cycleId];
        return (c.shares, c.principalDeposited, c.withdrawnPrincipal, c.withdrawnInterest, c.timestamp, c.active);
    }

    function getPotStats(uint256 potId)
        external
        view
        returns (uint256 totalSharesPot, uint256 totalPrincipalPot)
    {
        PotDeposit storage p = potDeposits[potId];
        return (p.totalShares, p.totalPrincipal);
    }

    function getCurrentSupplyAPY1e18() external view returns (uint256 apy1e18) {
        uint256 utilization = COMET.getUtilization();
        uint64 supplyRate = COMET.getSupplyRate(utilization);
        return uint256(supplyRate) * 365 days;
    }

    function getCompoundUSDCBalance() external view returns (uint256) {
        return COMET.balanceOf(address(this));
    }

    // ---- Rewards (M-02) ----

    function claimComp() external onlyOwner {
        if (address(cometRewards) == address(0)) return;
        cometRewards.claim(address(COMET), address(this), true);
        emit RewardsClaimed(address(this));
    }

    // ---- Emergency ----

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdrawAll() external onlyOwner whenPaused nonReentrant {
        uint256 balance = COMET.balanceOf(address(this));
        if (balance > 0) {
            COMET.withdraw(address(USDC), balance);
            USDC.safeTransfer(owner(), balance);
            emit EmergencyWithdrawal(balance, owner());
        }
    }

    function emergencyWithdrawUSDC(uint256 amount) external onlyOwner whenPaused nonReentrant {
        if (amount == 0) revert InvalidAmount();
        uint256 contractBalance = USDC.balanceOf(address(this));
        if (contractBalance < amount) {
            COMET.withdraw(address(USDC), amount - contractBalance);
        }
        USDC.safeTransfer(owner(), amount);
        emit EmergencyWithdrawal(amount, owner());
    }

    function rescueTokens(address token, uint256 amount) external onlyOwner {
        if (token == address(USDC)) revert CannotRescueBaseAsset();
        IERC20(token).safeTransfer(owner(), amount);
    }
}
