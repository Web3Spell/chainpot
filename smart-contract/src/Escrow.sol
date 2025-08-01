// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CompoundIntegrator.sol";

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

    // Events
    event FundsDeposited(
        uint256 indexed depositId,
        uint256 indexed potId,
        uint256 indexed cycleId,
        address depositor,
        uint256 amount
    );
    event FundsWithdrawn(address indexed recipient, uint256 amount);
    event WinnerPaid(uint256 indexed cycleId, address indexed winner, uint256 amount);
    event InterestDistributed(uint256 indexed cycleId, uint256 totalInterest);
    event AuctionEngineUpdated(address indexed oldEngine, address indexed newEngine);
    event CompoundIntegratorUpdated(address indexed oldIntegrator, address indexed newIntegrator);

    constructor(address _usdc, address payable _compoundIntegrator) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_compoundIntegrator != address(0), "Invalid compound integrator");
        
        usdc = IERC20(_usdc);
        compoundIntegrator = CompoundIntegrator(_compoundIntegrator);
    }

    modifier onlyAuctionEngine() {
        require(msg.sender == auctionEngine, "Only Auction Engine allowed");
        _;
    }

    modifier validDepositId(uint256 depositId) {
        require(depositId > 0 && depositId < depositCounter, "Invalid deposit ID");
        require(deposits[depositId].depositor != address(0), "Deposit does not exist");
        _;
    }

    // -------------------- Admin Functions --------------------

    function setAuctionEngine(address _auctionEngine) external onlyOwner {
        require(_auctionEngine != address(0), "Invalid auction engine address");
        
        address oldEngine = auctionEngine;
        auctionEngine = _auctionEngine;
        
        // Update compound integrator if it exists
        if (address(compoundIntegrator) != address(0)) {
            compoundIntegrator.setAuctionEngine(_auctionEngine);
        }
        
        emit AuctionEngineUpdated(oldEngine, _auctionEngine);
    }

    function setCompoundIntegrator(address payable _compoundIntegrator) external onlyOwner {
        require(_compoundIntegrator != address(0), "Invalid compound integrator");
        
        address oldIntegrator = address(compoundIntegrator);
        compoundIntegrator = CompoundIntegrator(_compoundIntegrator);
        
        emit CompoundIntegratorUpdated(oldIntegrator, _compoundIntegrator);
    }

    // -------------------- Core Functions --------------------

    /// @notice Deposit funds for a specific pot and cycle (called from AuctionEngine)
    function deposit(
        uint256 potId, 
        uint256 cycleId, 
        address member
    ) external payable onlyAuctionEngine nonReentrant {
        require(msg.value > 0, "Deposit amount must be > 0");
        require(member != address(0), "Invalid member address");
        require(potId > 0, "Invalid pot ID");
        require(cycleId > 0, "Invalid cycle ID");

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
        require(amount > 0, "Amount must be > 0");
        require(to != address(0), "Invalid recipient");
        
        // Check if we have enough balance in compound
        uint256 availableBalance = compoundIntegrator.getCompoundBalance();
        require(availableBalance >= amount, "Insufficient balance in compound");

        compoundIntegrator.withdrawFromCompound(amount, to);
        
        emit FundsWithdrawn(to, amount);
    }

    /// @notice Release funds to the winner of the cycle (usually lowest bidder)
    function releaseFundsToWinner(
        uint256 amount,
        address payable winner
    ) external onlyAuctionEngine nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(winner != address(0), "Invalid winner address");
        
        // Verify we have sufficient balance
        uint256 availableBalance = compoundIntegrator.getCompoundBalance();
        require(availableBalance >= amount, "Insufficient balance");

        compoundIntegrator.withdrawFromCompound(amount, winner);
        
        emit WinnerPaid(0, winner, amount); // cycleId can be passed if needed
    }

    /// @notice Release interest/profit share to contributors
    function releaseInterestToContributors(
        uint256[] calldata depositIds,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyAuctionEngine nonReentrant {
        require(
            depositIds.length == recipients.length &&
            recipients.length == amounts.length,
            "Mismatched input arrays"
        );
        require(depositIds.length > 0, "Empty arrays");

        uint256 totalAmount = 0;
        
        // Validate inputs and calculate total
        for (uint256 i = 0; i < depositIds.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            require(amounts[i] > 0, "Invalid amount");
            totalAmount += amounts[i];
        }

        // Check available balance
        uint256 availableBalance = compoundIntegrator.getCompoundBalance();
        require(availableBalance >= totalAmount, "Insufficient balance");

        // Distribute funds
        for (uint256 i = 0; i < recipients.length; i++) {
            compoundIntegrator.withdrawFromCompound(amounts[i], recipients[i]);
        }

        emit InterestDistributed(0, totalAmount); // cycleId can be passed if needed
    }

    /// @notice Batch deposit for multiple members (gas optimization)
    function batchDeposit(
        uint256 potId,
        uint256 cycleId,
        address[] calldata members,
        uint256[] calldata amounts
    ) external payable onlyAuctionEngine nonReentrant {
        require(members.length == amounts.length, "Mismatched arrays");
        require(members.length > 0, "Empty arrays");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(msg.value == totalAmount, "Incorrect total payment");

        // Forward total to Compound
        compoundIntegrator.depositToCompound{value: msg.value}();

        // Process individual deposits
        for (uint256 i = 0; i < members.length; i++) {
            require(members[i] != address(0), "Invalid member address");
            require(amounts[i] > 0, "Invalid amount");

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
    function deactivateDeposit(uint256 depositId) 
        external 
        onlyAuctionEngine 
        validDepositId(depositId) 
    {
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
    function getDepositInfo(uint256 depositId) 
        external 
        view 
        validDepositId(depositId) 
        returns (DepositInfo memory) 
    {
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
        returns (
            uint256 totalDeposits,
            uint256 totalAmount,
            address[] memory depositors,
            uint256[] memory amounts
        ) 
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
    function isDepositActive(uint256 depositId) 
        external 
        view 
        validDepositId(depositId) 
        returns (bool) 
    {
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
    function emergencyWithdraw(uint256 amount, address to) 
        external 
        onlyOwner 
        nonReentrant 
    {
        require(amount > 0, "Amount must be > 0");
        require(to != address(0), "Invalid recipient");
        
        uint256 availableBalance = compoundIntegrator.getCompoundBalance();
        require(availableBalance >= amount, "Insufficient balance");
        
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
        require(msg.sender == address(compoundIntegrator) || msg.sender == auctionEngine, 
                "Direct payments not allowed");
    }

    fallback() external payable {
        revert("Function not found");
    }
}