// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {CompoundIntegratorV4} from "./CompoundIntegratorV4.sol";

/// @title VaultV4
/// @notice Holds member contributions, supplies them to Compound via the integrator, and pays out
///         via a GLOBAL pull ledger. Shared by both engines; every per-cycle mapping is namespaced
///         by the calling engine (`msg.sender`) so the two engines can never collide on IDs.
/// @dev Remediations:
///      - H-04: pull over push. Finalization CREDITS `withdrawable[recipient]`; `claim()` is the only
///        transfer. One USDC-blacklisted recipient can never brick finalization.
///      - Invariant #11: `claim()`/`claimFor()` are NOT gated by any blacklist — already-earned funds
///        are always withdrawable by their owner.
///      - [I] CEI: bookkeeping is written before external token movements.
///      - L-03: no emergency sweep. Only a timelocked, surplus-only rescue that can never touch
///        tracked obligations (`backing` + `totalWithdrawableOutstanding`).
///      - §2.1: `isEngine` multi-engine auth; funds namespaced `funds[engine][pot][cycle]`.
///      - Safety Module: 20% of Compound yield is routed to a protocol treasury (POL), providing
///        an insurance backstop that grows with TVL. Treasury claims via the same pull-payment system.
contract VaultV4 is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable USDC;
    CompoundIntegratorV4 public immutable integrator;

    uint256 public constant RESCUE_TIMELOCK = 2 days;

    /// @notice Safety Module: 20% of Compound yield goes to protocol treasury (POL).
    uint256 public constant TREASURY_FEE_BPS = 2000; // 20% of yield
    address public treasury;
    uint256 public treasuryAccrued; // cumulative USDC captured by treasury (for frontend "Insurance TVL")

    struct CycleFunds {
        uint256 totalCollected; // principal deposited for this cycle
        uint256 shares; // Comet shares held for this cycle
        bool finalized; // harvested exactly once
        mapping(address => uint256) contributions;
    }

    // engine => potId => cycleId => funds
    mapping(address => mapping(uint256 => mapping(uint256 => CycleFunds))) private funds;

    /// @notice Multi-engine authorization (§2.1).
    mapping(address => bool) public isEngine;

    /// @notice GLOBAL per-user pull ledger (H-04).
    mapping(address => uint256) public withdrawable;

    /// @notice Idle USDC harvested from Compound but not yet credited to recipients.
    uint256 public backing;
    /// @notice Sum of all `withdrawable[*]` not yet claimed.
    uint256 public totalWithdrawableOutstanding;

    uint256 public rescueReadyAt; // 0 = no pending rescue

    error NotEngine();
    error InvalidAddress();
    error InvalidAmount();
    error CycleFinalized();
    error InsufficientBacking();
    error NothingToClaim();
    error RescueNotReady();
    error NoSurplus();
    error TreasuryNotSet();

    event EngineUpdated(address indexed engine, bool authorized);
    event Deposited(address indexed engine, uint256 indexed potId, uint256 indexed cycleId, address member, uint256 amount, uint256 shares);
    event CycleHarvested(address indexed engine, uint256 indexed potId, uint256 indexed cycleId, uint256 assets);
    event TreasuryFeeCollected(address indexed engine, uint256 indexed potId, uint256 indexed cycleId, uint256 fee);
    event WithdrawableCredited(address indexed to, uint256 amount);
    event Claimed(address indexed user, uint256 amount);
    event RescueRequested(uint256 readyAt);
    event SurplusRescued(address indexed to, uint256 amount);
    event TreasuryUpdated(address indexed newTreasury);

    constructor(address _usdc, address _integrator) Ownable(msg.sender) {
        if (_usdc == address(0)) revert InvalidAddress();
        if (_integrator == address(0) || _integrator.code.length == 0) revert InvalidAddress();
        USDC = IERC20(_usdc);
        integrator = CompoundIntegratorV4(_integrator);
        IERC20(_usdc).forceApprove(_integrator, type(uint256).max);
    }

    modifier onlyEngine() {
        if (!isEngine[msg.sender]) revert NotEngine();
        _;
    }

    // ---- Admin ----

    function setEngine(address engine, bool authorized) external onlyOwner {
        if (engine == address(0)) revert InvalidAddress();
        isEngine[engine] = authorized;
        emit EngineUpdated(engine, authorized);
    }

    /// @notice Set the protocol treasury address for the Safety Module.
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert InvalidAddress();
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ---- Deposits (engine only) ----

    /// @notice Pull `amount` USDC from `member` for (potId, cycleId) and supply it to Compound.
    function depositForCycle(uint256 potId, uint256 cycleId, address member, uint256 amount)
        external
        onlyEngine
        whenNotPaused
        nonReentrant
    {
        if (amount == 0) revert InvalidAmount();
        if (member == address(0)) revert InvalidAddress();

        CycleFunds storage cf = funds[msg.sender][potId][cycleId];
        if (cf.finalized) revert CycleFinalized();

        // Effects ([I] CEI).
        cf.totalCollected += amount;
        cf.contributions[member] += amount;

        // Interactions: pull from member, then supply to Compound (integrator pulls from this Vault).
        USDC.safeTransferFrom(member, address(this), amount);
        uint256 shares = integrator.supply(amount);
        cf.shares += shares;

        emit Deposited(msg.sender, potId, cycleId, member, amount, shares);
    }

    // ---- Finalization (engine only) ----

    /// @notice Harvest a cycle's full value (principal + interest) out of Compound into the Vault.
    ///         Marks the cycle finalized. The Safety Module skims 20% of yield (never principal) for
    ///         the protocol treasury. The engine then credits recipients via `creditWithdrawable`.
    function harvestCycle(uint256 potId, uint256 cycleId)
        external
        onlyEngine
        nonReentrant
        returns (uint256 assets)
    {
        CycleFunds storage cf = funds[msg.sender][potId][cycleId];
        if (cf.finalized) revert CycleFinalized();
        cf.finalized = true;

        uint256 sh = cf.shares;
        uint256 principal = cf.totalCollected;
        cf.shares = 0;
        if (sh > 0) {
            assets = integrator.withdraw(sh);
        }

        // Safety Module: skim 20% of yield (interest only, never principal)
        uint256 treasuryCut;
        if (assets > principal && treasury != address(0)) {
            uint256 interest = assets - principal;
            treasuryCut = (interest * TREASURY_FEE_BPS) / 10_000;
            if (treasuryCut > 0) {
                // Credit treasury via the same pull-payment system
                withdrawable[treasury] += treasuryCut;
                totalWithdrawableOutstanding += treasuryCut;
                treasuryAccrued += treasuryCut;
                assets -= treasuryCut;
                emit TreasuryFeeCollected(msg.sender, potId, cycleId, treasuryCut);
            }
        }

        backing += assets;
        emit CycleHarvested(msg.sender, potId, cycleId, assets);
    }

    /// @notice Credit a recipient's pull balance from harvested backing (H-04).
    function creditWithdrawable(address to, uint256 amount) external onlyEngine {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (backing < amount) revert InsufficientBacking();
        backing -= amount;
        withdrawable[to] += amount;
        totalWithdrawableOutstanding += amount;
        emit WithdrawableCredited(to, amount);
    }

    // ---- Claims (ungated; invariant #11) ----

    function claim() external nonReentrant {
        _claim(msg.sender, msg.sender);
    }

    /// @notice Keeper helper: pushes a user's own balance TO that user. Never to a third party.
    function claimFor(address user) external nonReentrant {
        _claim(user, user);
    }

    function _claim(address user, address to) private {
        uint256 amount = withdrawable[user];
        if (amount == 0) revert NothingToClaim();
        withdrawable[user] = 0;
        totalWithdrawableOutstanding -= amount;
        USDC.safeTransfer(to, amount);
        emit Claimed(user, amount);
    }

    // ---- Surplus-only timelocked rescue (L-03) ----

    function requestRescue() external onlyOwner {
        rescueReadyAt = block.timestamp + RESCUE_TIMELOCK;
        emit RescueRequested(rescueReadyAt);
    }

    /// @notice Move only USDC beyond tracked obligations (accidental transfers). Never principal/credits.
    function rescueSurplus(address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert InvalidAddress();
        if (rescueReadyAt == 0 || block.timestamp < rescueReadyAt) revert RescueNotReady();
        rescueReadyAt = 0;
        uint256 tracked = backing + totalWithdrawableOutstanding;
        uint256 bal = USDC.balanceOf(address(this));
        if (bal <= tracked) revert NoSurplus();
        uint256 surplus = bal - tracked;
        USDC.safeTransfer(to, surplus);
        emit SurplusRescued(to, surplus);
    }

    // ---- Reads ----

    function getCycleFunds(address engine, uint256 potId, uint256 cycleId)
        external
        view
        returns (uint256 totalCollected, uint256 shares, bool finalized)
    {
        CycleFunds storage cf = funds[engine][potId][cycleId];
        return (cf.totalCollected, cf.shares, cf.finalized);
    }

    function getContribution(address engine, uint256 potId, uint256 cycleId, address member)
        external
        view
        returns (uint256)
    {
        return funds[engine][potId][cycleId].contributions[member];
    }

    /// @notice Total funds owed by the Vault: idle backing + outstanding credits + still-invested value.
    function totalObligations() external view returns (uint256) {
        return backing + totalWithdrawableOutstanding + integrator.totalAssets();
    }

    /// @notice Safety Module info for frontend display ("Insurance TVL").
    function getTreasuryInfo()
        external
        view
        returns (address treasuryAddr, uint256 totalAccrued, uint256 feeBps, uint256 currentBalance)
    {
        return (treasury, treasuryAccrued, TREASURY_FEE_BPS, treasury != address(0) ? withdrawable[treasury] : 0);
    }
}
