// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

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

/// @title CompoundIntegratorV4
/// @notice A single GLOBAL Compound III (Comet) position with ERC4626-style share accounting.
///         Only the Vault interacts with it; the Vault holds the per-cycle share ledger.
/// @dev Remediations:
///      - H-05: virtual-shares (decimal offset) + revert `ZeroShares()` (no 1:1 fallback). The
///        first-depositor / inflation path is unreachable.
///      - [I] raw balance: `totalAssets()` returns an INTERNALLY tracked figure (`realizedAssets`),
///        not a live `COMET.balanceOf`. `accrue()` snapshots `balanceOf` at the start of every
///        supply/withdraw, so share math within an op is stable and direct-donation manipulation is
///        dead (compounded by the virtual offset).
///      - [I] CEI: all state writes happen BEFORE the external token transfers / Comet calls.
///      - L-03: no `emergencyWithdrawAll`/broad sweep. Only `rescueTokens` for non-USDC dust.
contract CompoundIntegratorV4 is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IComet public immutable COMET;
    IERC20 public immutable USDC;
    ICometRewards public cometRewards; // optional

    address public vault;

    /// @notice Snapshotted total asset value of the position (principal + realized interest).
    uint256 public realizedAssets;
    /// @notice Total shares minted across all cycles (the Vault tracks the per-cycle breakdown).
    uint256 public totalShares;
    /// @notice Net principal contributed (informational / conservation floor).
    uint256 public internalPrincipal;

    /// @notice H-05: OZ virtual-shares exponent. 10**3 virtual shares & 1 virtual asset.
    uint8 public constant DECIMALS_OFFSET = 3;

    error NotVault();
    error InvalidAddress();
    error InvalidAmount();
    error ZeroShares();
    error CannotRescueBaseAsset();
    error InsufficientShares();

    event VaultUpdated(address indexed vault);
    event CometRewardsUpdated(address indexed rewards);
    event Accrued(uint256 realizedAssets);
    event Supplied(uint256 amount, uint256 sharesMinted);
    event Withdrawn(uint256 shares, uint256 assets);
    event RewardsClaimed();

    constructor(address _comet, address _usdc) Ownable(msg.sender) {
        if (_comet == address(0) || _usdc == address(0)) revert InvalidAddress();
        if (_comet.code.length == 0 || _usdc.code.length == 0) revert InvalidAddress();
        COMET = IComet(_comet);
        USDC = IERC20(_usdc);
        IERC20(_usdc).forceApprove(_comet, type(uint256).max);
    }

    modifier onlyVault() {
        if (msg.sender != vault) revert NotVault();
        _;
    }

    // ---- Admin ----

    function setVault(address _vault) external onlyOwner {
        if (_vault == address(0) || _vault.code.length == 0) revert InvalidAddress();
        vault = _vault;
        emit VaultUpdated(_vault);
    }

    function setCometRewards(address _rewards) external onlyOwner {
        cometRewards = ICometRewards(_rewards);
        emit CometRewardsUpdated(_rewards);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ---- Share math (OZ ERC4626 virtual-offset) ----

    function _virtualShares() private pure returns (uint256) {
        return 10 ** uint256(DECIMALS_OFFSET);
    }

    function totalAssets() public view returns (uint256) {
        return realizedAssets;
    }

    function convertToShares(uint256 assets) public view returns (uint256) {
        return Math.mulDiv(assets, totalShares + _virtualShares(), realizedAssets + 1);
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        return Math.mulDiv(shares, realizedAssets + 1, totalShares + _virtualShares());
    }

    /// @notice Realize Comet interest (and any donation) into the internal figure. Idempotent.
    function accrue() public {
        uint256 live = COMET.balanceOf(address(this));
        // Never let the internal figure drop below tracked principal due to a transient read.
        realizedAssets = live > internalPrincipal ? live : internalPrincipal;
        emit Accrued(realizedAssets);
    }

    // ---- Core (Vault only) ----

    /// @notice Supply `amount` USDC (pulled from the Vault) into Comet; mint and return shares.
    function supply(uint256 amount) external onlyVault whenNotPaused nonReentrant returns (uint256 shares) {
        if (amount == 0) revert InvalidAmount();

        accrue();
        shares = convertToShares(amount);
        if (shares == 0) revert ZeroShares(); // H-05

        // Effects before interactions ([I] CEI).
        totalShares += shares;
        internalPrincipal += amount;
        realizedAssets += amount;

        // Interactions.
        USDC.safeTransferFrom(msg.sender, address(this), amount);
        COMET.supply(address(USDC), amount);

        emit Supplied(amount, shares);
    }

    /// @notice Burn `shares` and send the corresponding USDC value to the Vault. Returns assets sent.
    function withdraw(uint256 shares) external onlyVault whenNotPaused nonReentrant returns (uint256 assets) {
        if (shares == 0) revert InvalidAmount();
        if (shares > totalShares) revert InsufficientShares();

        accrue();
        assets = convertToAssets(shares);

        // Effects before interactions ([I] CEI).
        totalShares -= shares;
        realizedAssets = realizedAssets > assets ? realizedAssets - assets : 0;
        internalPrincipal = internalPrincipal > assets ? internalPrincipal - assets : 0;

        // Interactions — withdraw from Comet and forward the actually-received amount.
        uint256 balBefore = USDC.balanceOf(address(this));
        COMET.withdraw(address(USDC), assets);
        uint256 received = USDC.balanceOf(address(this)) - balBefore;
        if (received < assets) assets = received; // tolerate Comet's 1-wei rounding
        USDC.safeTransfer(msg.sender, assets);

        emit Withdrawn(shares, assets);
    }

    // ---- Rewards (optional) ----

    function claimComp() external onlyOwner {
        if (address(cometRewards) == address(0)) return;
        cometRewards.claim(address(COMET), address(this), true);
        emit RewardsClaimed();
    }

    // ---- Reads ----

    function getCurrentSupplyAPY1e18() external view returns (uint256) {
        uint256 utilization = COMET.getUtilization();
        uint64 supplyRate = COMET.getSupplyRate(utilization);
        return uint256(supplyRate) * 365 days;
    }

    function getCompoundUSDCBalance() external view returns (uint256) {
        return COMET.balanceOf(address(this));
    }

    // ---- Rescue (non-USDC only; L-03) ----

    function rescueTokens(address token, uint256 amount) external onlyOwner {
        if (token == address(USDC)) revert CannotRescueBaseAsset();
        IERC20(token).safeTransfer(owner(), amount);
    }
}
