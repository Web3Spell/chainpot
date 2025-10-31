// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {CompoundV3Integrator as CompoundIntegrator} from "./CompoundIntegrator.sol";

contract Escrow is Ownable, ReentrancyGuard {
    IERC20 public usdc;
    CompoundIntegrator public compoundIntegrator;
    address public auctionEngine;

    struct DepositInfo {
        uint256 amount;
        uint256 potId;
        uint256 cycleId;
        address depositor;
        uint256 timestamp;
        bool isActive;
    }

    uint256 public depositCounter = 1;
    mapping(uint256 => DepositInfo) public deposits;
    mapping(uint256 => uint256[]) public cycleDeposits; // cycleId => deposit IDs
    mapping(address => uint256[]) public userDeposits; // user => deposit IDs
    mapping(uint256 => uint256) public potBalances; // potId => total balance

    // ===== Custom Errors =====
    error InvalidAddress();
    error InvalidAmount();
    error InvalidPotId();
    error InvalidCycleId();
    error InvalidDepositId(uint256 depositId);
    error DepositDoesNotExist(uint256 depositId);
    error UnauthorizedCaller(address caller);
    error InsufficientBalance(uint256 requested, uint256 available);
    error MismatchedArrays();
    error EmptyArray();
    error IncorrectTotalPayment();
    error DirectPaymentNotAllowed(address sender);
    error FunctionNotFound();
    error MismatchedInputArray();

    // Events
    event FundsDeposited(
        uint256 indexed depositId, uint256 indexed potId, uint256 indexed cycleId, address depositor, uint256 amount
    );
    event FundsWithdrawn(address indexed recipient, uint256 amount);
    event WinnerPaid(uint256 indexed cycleId, address indexed winner, uint256 amount);
    event InterestDistributed(uint256 indexed cycleId, uint256 totalInterest);
    event AuctionEngineUpdated(address indexed oldEngine, address indexed newEngine);
    event CompoundIntegratorUpdated(address indexed oldIntegrator, address indexed newIntegrator);

    constructor(address _usdc, address payable _compoundIntegrator) Ownable(msg.sender) {
        if (_usdc == address(0)) revert InvalidAddress();
        if (_compoundIntegrator == address(0)) revert InvalidAddress();

        usdc = IERC20(_usdc);
        compoundIntegrator = CompoundIntegrator(_compoundIntegrator);
    }

    modifier onlyAuctionEngine() {
        if (msg.sender != auctionEngine) revert UnauthorizedCaller(msg.sender);
        _;
    }

    modifier validDepositId(uint256 depositId) {
        _validDepositId(depositId);
        _;
    }

    function _validDepositId(uint256 depositId) internal view {
        if (depositId <= 0 || depositId >= depositCounter) revert InvalidDepositId(depositId);
        if (deposits[depositId].depositor == address(0)) revert DepositDoesNotExist(depositId);
    }

    // -------------------- Admin Functions --------------------

    function setAuctionEngine(address _auctionEngine) external onlyOwner {
        if (_auctionEngine == address(0)) revert InvalidAddress();

        address oldEngine = auctionEngine;
        auctionEngine = _auctionEngine;

        // Update compound integrator if it exists
        if (address(compoundIntegrator) != address(0)) {
            compoundIntegrator.setAuctionEngine(_auctionEngine);
        }

        emit AuctionEngineUpdated(oldEngine, _auctionEngine);
    }

    function setCompoundIntegrator(address payable _compoundIntegrator) external onlyOwner {
        if (_compoundIntegrator == address(0)) revert InvalidAddress();

        address oldIntegrator = address(compoundIntegrator);
        compoundIntegrator = CompoundIntegrator(_compoundIntegrator);

        emit CompoundIntegratorUpdated(oldIntegrator, _compoundIntegrator);
    }

    // -------------------- Core Functions --------------------

    /// @notice Deposit funds for a specific pot and cycle (called from AuctionEngine)
    function deposit(uint256 potId, uint256 cycleId, address member) external payable onlyAuctionEngine nonReentrant {
        if (msg.value <= 0) revert InvalidAmount();
        if (member == address(0)) revert InvalidAddress();
        if (potId <= 0) revert InvalidPotId();
        if (cycleId <= 0) revert InvalidCycleId();

        // Forward to Compound via integrator
        compoundIntegrator.depositToCompound{value: msg.value}();

        // Track deposit info
        uint256 depositId = depositCounter++;
        deposits[depositId] = DepositInfo({
            amount: msg.value,
            potId: potId,
            cycleId: cycleId,
            depositor: member,
            timestamp: block.timestamp,
            isActive: true
        });

        // Update mappings
        cycleDeposits[cycleId].push(depositId);
        userDeposits[member].push(depositId);
        potBalances[potId] += msg.value;

        emit FundsDeposited(depositId, potId, cycleId, member, msg.value);
    }

    /// @notice Withdraw funds (principal or rewards) back to specified address
    function withdrawFunds(uint256 amount, address to) external onlyAuctionEngine nonReentrant {
        if (amount <= 0) revert InvalidAmount();
        if (to == address(0)) revert InvalidAddress();

        // Check if we have enough balance in compound
        uint256 availableBalance = compoundIntegrator.getCompoundBalance();
        if (availableBalance < amount) revert InsufficientBalance(amount, availableBalance);

        compoundIntegrator.withdrawFromCompound(amount, to);

        emit FundsWithdrawn(to, amount);
    }

    /// @notice Release funds to the winner of the cycle (usually lowest bidder)
    function releaseFundsToWinner(uint256 amount, address payable winner) external onlyAuctionEngine nonReentrant {
        if (amount <= 0) revert InvalidAmount();
        if (winner == address(0)) revert InvalidAddress();

        // Verify we have sufficient balance
        uint256 availableBalance = compoundIntegrator.getCompoundBalance();
        if (availableBalance < amount) revert InsufficientBalance(amount, availableBalance);

        compoundIntegrator.withdrawFromCompound(amount, winner);

        emit WinnerPaid(0, winner, amount); // cycleId can be passed if needed
    }

    /// @notice Release interest/profit share to contributors
    function releaseInterestToContributors(
        uint256[] calldata depositIds,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyAuctionEngine nonReentrant {
        if (depositIds.length != recipients.length || recipients.length != amounts.length) revert MismatchedInputArray();
        if (depositIds.length == 0) revert EmptyArray();

        uint256 totalAmount = 0;

        // Validate inputs and calculate total
        for (uint256 i = 0; i < depositIds.length; i++) {
            if (recipients[i] == address(0)) revert InvalidAddress();
            if (amounts[i] <= 0) revert InvalidAmount();
            totalAmount += amounts[i];
        }

        // Check available balance
        uint256 availableBalance = compoundIntegrator.getCompoundBalance();
        if (availableBalance < totalAmount) revert InsufficientBalance(totalAmount, availableBalance);

        // Distribute funds
        for (uint256 i = 0; i < recipients.length; i++) {
            compoundIntegrator.withdrawFromCompound(amounts[i], recipients[i]);
        }

        emit InterestDistributed(0, totalAmount); // cycleId can be passed if needed
    }

    /// @notice Batch deposit for multiple members (gas optimization)
    function batchDeposit(uint256 potId, uint256 cycleId, address[] calldata members, uint256[] calldata amounts)
        external
        payable
        onlyAuctionEngine
        nonReentrant
    {
        if (members.length != amounts.length) revert MismatchedArrays();
        if (members.length == 0) revert EmptyArray();

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        if (msg.value != totalAmount) revert IncorrectTotalPayment();

        // Forward total to Compound
        compoundIntegrator.depositToCompound{value: msg.value}();

        // Process individual deposits
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] == address(0)) revert InvalidAddress();
            if (amounts[i] <= 0) revert InvalidAmount();

            uint256 depositId = depositCounter++;
            deposits[depositId] = DepositInfo({
                amount: amounts[i],
                potId: potId,
                cycleId: cycleId,
                depositor: members[i],
                timestamp: block.timestamp,
                isActive: true
            });

            cycleDeposits[cycleId].push(depositId);
            userDeposits[members[i]].push(depositId);
            potBalances[potId] += amounts[i];

            emit FundsDeposited(depositId, potId, cycleId, members[i], amounts[i]);
        }
    }

    /// @notice Mark deposit as inactive (for accounting)
    function deactivateDeposit(uint256 depositId) external onlyAuctionEngine validDepositId(depositId) {
        deposits[depositId].isActive = false;
    }

    // -------------------- View Functions --------------------

    /// @notice View total locked funds (in Compound)
    function getEscrowBalance() external view returns (uint256) {
        return compoundIntegrator.getCompoundBalance();
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
    function getDepositInfo(uint256 depositId) external view validDepositId(depositId) returns (DepositInfo memory) {
        return deposits[depositId];
    }

    /// @notice Get total balance for a pot
    function getPotBalance(uint256 potId) external view returns (uint256) {
        return potBalances[potId];
    }

    /// @notice Get cycle deposit summary
    function getCycleDepositSummary(uint256 cycleId)
        external
        view
        returns (uint256 totalDeposits, uint256 totalAmount, address[] memory depositors, uint256[] memory amounts)
    {
        uint256[] memory depositIds = cycleDeposits[cycleId];
        totalDeposits = depositIds.length;

        depositors = new address[](totalDeposits);
        amounts = new uint256[](totalDeposits);

        for (uint256 i = 0; i < totalDeposits; i++) {
            DepositInfo memory depositInfo = deposits[depositIds[i]];
            depositors[i] = depositInfo.depositor;
            amounts[i] = depositInfo.amount;
            totalAmount += depositInfo.amount;
        }
    }

    /// @notice Check if deposit is active
    function isDepositActive(uint256 depositId) external view validDepositId(depositId) returns (bool) {
        return deposits[depositId].isActive;
    }

    /// @notice Get current deposit counter
    function getCurrentDepositId() external view returns (uint256) {
        return depositCounter - 1;
    }

    /// @notice Get compound interest earned (approximate)
    function getEstimatedInterest() external view returns (uint256) {
        uint256 currentBalance = compoundIntegrator.getCompoundBalance();
        // This would need to track initial deposits vs current balance
        // Implementation depends on CompoundIntegrator interface
        return currentBalance; // Simplified - should calculate actual interest
    }

    // -------------------- Emergency Functions --------------------

    /// @notice Emergency withdrawal (owner only)
    function emergencyWithdraw(uint256 amount, address to) external onlyOwner nonReentrant {
        if (amount <= 0) revert InvalidAmount();
        if (to == address(0)) revert InvalidAddress();

        uint256 availableBalance = compoundIntegrator.getCompoundBalance();
        if (availableBalance < amount) revert InsufficientBalance(amount, availableBalance);

        compoundIntegrator.withdrawFromCompound(amount, to);
    }

    /// @notice Emergency pause (if compound integrator supports it)
    function emergencyPause() external onlyOwner {
        // Implementation depends on CompoundIntegrator interface
        // This could pause deposits/withdrawals in emergency
    }

    // -------------------- Receive Functions --------------------

    receive() external payable {
        // Allow contract to receive ETH
        if (msg.sender != address(compoundIntegrator) && msg.sender != auctionEngine) {
            revert("Direct payments not allowed");
        }
    }

    fallback() external payable {
        revert("Function not found");
    }
}
