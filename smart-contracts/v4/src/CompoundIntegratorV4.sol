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
    function claimTo(address comet, address src, address to, bool shouldAccrue) external;
}

interface IVaultTreasury {
    function treasury() external view returns (address);
}

/// @title CompoundIntegratorV4
/// @notice A single GLOBAL Compound III (Comet) position with ERC4626-style share accounting.
///         Only the Vault interacts with it; the Vault holds the per-cycle share ledger.
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

    /// @notice H-05: OZ virtual-shares exponent. 10**3 virtual shares & 1 virtual asset.
    uint8 public constant DECIMALS_OFFSET = 3;

    error NotVault();
    error InvalidAddress();
    error InvalidAmount();
    error ZeroShares();
    error CannotRescueBaseAsset();
    error InsufficientShares();
    error VaultAlreadySet();

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
        if (vault != address(0)) revert VaultAlreadySet();
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

    /// @dev L-01: live asset reading to prevent stale reads in view functions
    function _liveAssets() internal view returns (uint256) {
        return COMET.balanceOf(address(this));
    }

    function totalAssets() public view returns (uint256) {
        return _liveAssets();
    }

    function convertToShares(uint256 assets) public view returns (uint256) {
        return Math.mulDiv(assets, totalShares + _virtualShares(), _liveAssets() + 1);
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        return Math.mulDiv(shares, _liveAssets() + 1, totalShares + _virtualShares());
    }

    /// @notice Realize Comet interest. L-08: report live Comet balance directly without flooring.
    function accrue() public {
        uint256 live = COMET.balanceOf(address(this));
        realizedAssets = live;
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

        // Interactions — L-03: cap assets at live balance before withdraw
        uint256 live = COMET.balanceOf(address(this));
        if (assets > live) assets = live;

        COMET.withdraw(address(USDC), assets);
        USDC.safeTransfer(msg.sender, assets);

        emit Withdrawn(shares, assets);
    }

    // ---- Rewards (I-04: direct path to Vault treasury) ----

    function claimComp() external {
        if (address(cometRewards) == address(0)) return;
        address treasury = IVaultTreasury(vault).treasury();
        if (treasury == address(0)) revert InvalidAddress();
        cometRewards.claimTo(address(COMET), address(this), treasury, true);
        emit RewardsClaimed();
    }

    function sweepReward(address token) external onlyOwner {
        if (token == address(USDC) || token == address(COMET)) revert CannotRescueBaseAsset();
        address treasury = IVaultTreasury(vault).treasury();
        if (treasury == address(0)) revert InvalidAddress();
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal > 0) {
            IERC20(token).safeTransfer(treasury, bal);
        }
    }

    // ---- Reads ----

    /// @notice I-01: Renamed from getCurrentSupplyAPY1e18 to accurately state linear APR
    function getCurrentSupplyAPR1e18() external view returns (uint256) {
        uint256 utilization = COMET.getUtilization();
        uint64 supplyRate = COMET.getSupplyRate(utilization);
        return uint256(supplyRate) * 365 days;
    }

    function getCompoundUSDCBalance() external view returns (uint256) {
        return COMET.balanceOf(address(this));
    }

    // ---- Rescue (non-USDC / non-COMET only; L-04) ----

    function rescueTokens(address token, uint256 amount) external onlyOwner {
        if (token == address(USDC) || token == address(COMET)) revert CannotRescueBaseAsset();
        IERC20(token).safeTransfer(owner(), amount);
    }
}
