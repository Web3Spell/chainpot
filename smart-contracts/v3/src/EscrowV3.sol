// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {CompoundIntegratorV3} from "./CompoundIntegratorV3.sol";

/// @title EscrowV3
/// @notice Holds member contributions, supplies them to Compound via the integrator,
///         pays winners, and harvests the cycle remainder (discount + interest) for non-winners.
/// @dev Fixes C-01 (discount distribution) and tightens accounting.
contract EscrowV3 is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable USDC;
    CompoundIntegratorV3 public compoundIntegrator;
    address public auctionEngine;

    struct CycleFunds {
        uint256 totalDeposited;
        uint256 winnerPaid;
        uint256 remainderHarvested;
        uint256 remainderDistributed;
        bool cycleCompleted;
        mapping(address => uint256) memberContributions;
    }

    struct PotFunds {
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        mapping(uint256 => CycleFunds) cycles;
    }

    mapping(uint256 => PotFunds) private potFunds;

    uint256 public totalUSDCDeposited;
    uint256 public totalUSDCWithdrawn;

    error InvalidAddress();
    error InvalidAmount();
    error InvalidPotId();
    error InvalidCycleId();
    error UnauthorizedCaller();
    error InsufficientCycleBalance();
    error CycleAlreadyCompleted();
    error RemainderNotHarvested();
    error InsufficientRemainder();
    error AmountExceedsBalance();

    event Deposited(uint256 indexed potId, uint256 indexed cycleId, address indexed member, uint256 amount);
    event WinnerPaid(uint256 indexed potId, uint256 indexed cycleId, address indexed winner, uint256 amount);
    event RemainderHarvested(uint256 indexed potId, uint256 indexed cycleId, uint256 amount);
    event RemainderDistributed(uint256 indexed potId, uint256 indexed cycleId, address indexed recipient, uint256 amount);
    event CycleCompleted(uint256 indexed potId, uint256 indexed cycleId);
    event AuctionEngineUpdated(address indexed oldEngine, address indexed newEngine);
    event CompoundIntegratorUpdated(address indexed oldIntegrator, address indexed newIntegrator);
    event EmergencyWithdrawal(address indexed to, uint256 amount);

    constructor(address _usdc, address _compoundIntegrator) Ownable(msg.sender) {
        if (_usdc == address(0)) revert InvalidAddress();
        if (_compoundIntegrator == address(0) || _compoundIntegrator.code.length == 0) revert InvalidAddress();

        USDC = IERC20(_usdc);
        compoundIntegrator = CompoundIntegratorV3(_compoundIntegrator);

        // Pre-approve integrator to pull USDC from this escrow.
        IERC20(_usdc).forceApprove(_compoundIntegrator, type(uint256).max);
    }

    modifier onlyAuctionEngine() {
        if (msg.sender != auctionEngine) revert UnauthorizedCaller();
        _;
    }

    // ---- Admin ----

    function setAuctionEngine(address _auctionEngine) external onlyOwner {
        if (_auctionEngine == address(0) || _auctionEngine.code.length == 0) revert InvalidAddress();
        address old = auctionEngine;
        auctionEngine = _auctionEngine;
        emit AuctionEngineUpdated(old, _auctionEngine);
    }

    function setCompoundIntegrator(address _compoundIntegrator) external onlyOwner {
        if (_compoundIntegrator == address(0) || _compoundIntegrator.code.length == 0) revert InvalidAddress();
        address old = address(compoundIntegrator);
        compoundIntegrator = CompoundIntegratorV3(_compoundIntegrator);
        IERC20(address(USDC)).forceApprove(_compoundIntegrator, type(uint256).max);
        emit CompoundIntegratorUpdated(old, _compoundIntegrator);
    }

    // ---- Deposits ----

    /// @notice Deposit USDC for a cycle directly from the member (no double-hop through AuctionEngine).
    /// @dev Caller must be AuctionEngine; member must have approved Escrow for `amount` USDC.
    function depositFromMember(uint256 potId, uint256 cycleId, address member, uint256 amount)
        external
        onlyAuctionEngine
        whenNotPaused
        nonReentrant
    {
        if (amount == 0) revert InvalidAmount();
        if (member == address(0)) revert InvalidAddress();
        if (potId == 0) revert InvalidPotId();
        if (cycleId == 0) revert InvalidCycleId();

        // Pull directly from the member's wallet.
        USDC.safeTransferFrom(member, address(this), amount);

        PotFunds storage pot = potFunds[potId];
        CycleFunds storage cycle = pot.cycles[cycleId];

        cycle.totalDeposited += amount;
        cycle.memberContributions[member] += amount;
        pot.totalDeposited += amount;
        totalUSDCDeposited += amount;

        // Forward to Compound via integrator.
        compoundIntegrator.supplyUSDCForPot(potId, cycleId, amount);

        emit Deposited(potId, cycleId, member, amount);
    }

    // ---- Payouts ----

    function releaseFundsToWinner(uint256 potId, uint256 cycleId, address winner, uint256 amount)
        external
        onlyAuctionEngine
        whenNotPaused
        nonReentrant
    {
        if (amount == 0) revert InvalidAmount();
        if (winner == address(0)) revert InvalidAddress();

        PotFunds storage pot = potFunds[potId];
        CycleFunds storage cycle = pot.cycles[cycleId];

        if (cycle.totalDeposited < amount) revert InsufficientCycleBalance();

        // Withdraw from Compound — comes back to this contract.
        uint256 balBefore = USDC.balanceOf(address(this));
        compoundIntegrator.withdrawUSDCForPot(potId, cycleId, amount);
        uint256 received = USDC.balanceOf(address(this)) - balBefore;
        if (received + 1 < amount) revert InsufficientCycleBalance();

        USDC.safeTransfer(winner, amount);

        cycle.winnerPaid += amount;
        pot.totalWithdrawn += amount;
        totalUSDCWithdrawn += amount;

        emit WinnerPaid(potId, cycleId, winner, amount);
    }

    /// @notice Harvest the cycle's remainder (residual principal = discount + accrued interest).
    /// @dev Called once per cycle, after the winner has been paid. Returns the harvested amount,
    ///      held in this contract for distribution via `distributeRemainderTo`.
    function harvestRemainder(uint256 potId, uint256 cycleId)
        external
        onlyAuctionEngine
        whenNotPaused
        nonReentrant
        returns (uint256 amount)
    {
        PotFunds storage pot = potFunds[potId];
        CycleFunds storage cycle = pot.cycles[cycleId];
        if (cycle.cycleCompleted) revert CycleAlreadyCompleted();

        uint256 balBefore = USDC.balanceOf(address(this));
        amount = compoundIntegrator.withdrawCycleRemainder(potId, cycleId);
        uint256 received = USDC.balanceOf(address(this)) - balBefore;
        // Use what we actually received, in case of rounding.
        amount = received;

        cycle.remainderHarvested += amount;
        pot.totalWithdrawn += amount;
        totalUSDCWithdrawn += amount;

        emit RemainderHarvested(potId, cycleId, amount);
        return amount;
    }

    /// @notice Distribute a portion of the harvested remainder to a non-winner.
    function distributeRemainderTo(uint256 potId, uint256 cycleId, address recipient, uint256 amount)
        external
        onlyAuctionEngine
        whenNotPaused
        nonReentrant
    {
        if (recipient == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        PotFunds storage pot = potFunds[potId];
        CycleFunds storage cycle = pot.cycles[cycleId];

        uint256 unspent = cycle.remainderHarvested - cycle.remainderDistributed;
        if (unspent < amount) revert InsufficientRemainder();

        cycle.remainderDistributed += amount;

        USDC.safeTransfer(recipient, amount);
        emit RemainderDistributed(potId, cycleId, recipient, amount);
    }

    function markCycleCompleted(uint256 potId, uint256 cycleId)
        external
        onlyAuctionEngine
        whenNotPaused
    {
        CycleFunds storage cycle = potFunds[potId].cycles[cycleId];
        if (cycle.cycleCompleted) revert CycleAlreadyCompleted();
        cycle.cycleCompleted = true;
        emit CycleCompleted(potId, cycleId);
    }

    // ---- Reads ----

    function getCycleFunds(uint256 potId, uint256 cycleId)
        external
        view
        returns (
            uint256 totalDeposited,
            uint256 winnerPaid,
            uint256 remainderHarvested,
            uint256 remainderDistributed,
            bool cycleCompleted
        )
    {
        CycleFunds storage c = potFunds[potId].cycles[cycleId];
        return (c.totalDeposited, c.winnerPaid, c.remainderHarvested, c.remainderDistributed, c.cycleCompleted);
    }

    function getMemberContribution(uint256 potId, uint256 cycleId, address member) external view returns (uint256) {
        return potFunds[potId].cycles[cycleId].memberContributions[member];
    }

    function getPotFunds(uint256 potId) external view returns (uint256 totalDeposited, uint256 totalWithdrawn) {
        PotFunds storage p = potFunds[potId];
        return (p.totalDeposited, p.totalWithdrawn);
    }

    function getCycleInterestEstimate(uint256 potId, uint256 cycleId) external view returns (uint256) {
        return compoundIntegrator.getCycleInterest(potId, cycleId);
    }

    // ---- Emergency ----

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdrawUSDC(uint256 amount, address to) external onlyOwner whenPaused nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (to == address(0)) revert InvalidAddress();
        uint256 bal = USDC.balanceOf(address(this));
        if (bal < amount) revert AmountExceedsBalance();
        USDC.safeTransfer(to, amount);
        emit EmergencyWithdrawal(to, amount);
    }
}
