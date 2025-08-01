// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title CompoundIntegrator
/// @notice Integrates with Compound Protocol for yield generation
/// @dev This is a simplified version - in production, integrate with actual Compound contracts
contract CompoundIntegrator is Ownable, ReentrancyGuard {
    
    address public auctionEngine;
    address public escrow;
    
    // Simplified compound simulation
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;
    uint256 public interestRate = 500; // 5% APY in basis points
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public lastUpdateTime;
    
    mapping(address => uint256) public deposits;
    
    event DepositedToCompound(uint256 amount, uint256 timestamp);
    event WithdrawnFromCompound(uint256 amount, address recipient, uint256 timestamp);
    event InterestAccrued(uint256 amount, uint256 timestamp);
    event AuctionEngineUpdated(address indexed newEngine);
    event EscrowUpdated(address indexed newEscrow);
    event InterestRateUpdated(uint256 newRate);
    
    constructor() Ownable(msg.sender) {
        lastUpdateTime = block.timestamp;
    }
    
    modifier onlyAuthorized() {
        require(
            msg.sender == auctionEngine || 
            msg.sender == escrow || 
            msg.sender == owner(),
            "Not authorized"
        );
        _;
    }
    
    // -------------------- Admin Functions --------------------
    
    function setAuctionEngine(address _auctionEngine) external onlyOwner {
        require(_auctionEngine != address(0), "Invalid address");
        auctionEngine = _auctionEngine;
        emit AuctionEngineUpdated(_auctionEngine);
    }
    
    function setEscrow(address _escrow) external onlyOwner {
        require(_escrow != address(0), "Invalid address");
        escrow = _escrow;
        emit EscrowUpdated(_escrow);
    }
    
    function setInterestRate(uint256 _interestRate) external onlyOwner {
        require(_interestRate <= 2000, "Interest rate too high"); // Max 20%
        interestRate = _interestRate;
        emit InterestRateUpdated(_interestRate);
    }
    
    // -------------------- Core Functions --------------------
    
    /// @notice Deposit ETH to Compound (simplified simulation)
    function depositToCompound() external payable onlyAuthorized nonReentrant {
        require(msg.value > 0, "Deposit amount must be > 0");
        
        _updateInterest();
        
        totalDeposited += msg.value;
        deposits[msg.sender] += msg.value;
        
        emit DepositedToCompound(msg.value, block.timestamp);
    }
    
    /// @notice Withdraw funds from Compound
    function withdrawFromCompound(uint256 amount, address recipient) 
        external 
        onlyAuthorized 
        nonReentrant 
    {
        require(amount > 0, "Amount must be > 0");
        require(recipient != address(0), "Invalid recipient");
        require(address(this).balance >= amount, "Insufficient balance");
        
        _updateInterest();
        
        totalWithdrawn += amount;
        
        (bool success, ) = payable(recipient).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit WithdrawnFromCompound(amount, recipient, block.timestamp);
    }
    
    /// @notice Update accrued interest (simplified calculation)
    function _updateInterest() internal {
        if (totalDeposited == 0) return;
        
        uint256 timeElapsed = block.timestamp - lastUpdateTime;
        if (timeElapsed == 0) return;
        
        // Calculate simple interest for the time period
        // In production, this would interact with actual Compound contracts
        uint256 interest = (totalDeposited * interestRate * timeElapsed) / 
                          (BASIS_POINTS * 365 days);
        
        if (interest > 0) {
            // Simulate interest accrual
            totalDeposited += interest;
            emit InterestAccrued(interest, block.timestamp);
        }
        
        lastUpdateTime = block.timestamp;
    }
    
    /// @notice Manually trigger interest update
    function updateInterest() external {
        _updateInterest();
    }
    
    // -------------------- View Functions --------------------
    
    /// @notice Get current balance including accrued interest
    function getCompoundBalance() external view returns (uint256) {
        if (totalDeposited == 0) return address(this).balance;
        
        uint256 timeElapsed = block.timestamp - lastUpdateTime;
        uint256 interest = (totalDeposited * interestRate * timeElapsed) / 
                          (BASIS_POINTS * 365 days);
        
        return totalDeposited + interest;
    }
    
    /// @notice Get total deposited amount
    function getTotalDeposited() external view returns (uint256) {
        return totalDeposited;
    }
    
    /// @notice Get total withdrawn amount
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }
    
    /// @notice Get current interest rate
    function getInterestRate() external view returns (uint256) {
        return interestRate;
    }
    
    /// @notice Get accrued interest since last update
    function getAccruedInterest() external view returns (uint256) {
        if (totalDeposited == 0) return 0;
        
        uint256 timeElapsed = block.timestamp - lastUpdateTime;
        return (totalDeposited * interestRate * timeElapsed) / 
               (BASIS_POINTS * 365 days);
    }
    
    /// @notice Get deposit amount for specific address
    function getDepositAmount(address depositor) external view returns (uint256) {
        return deposits[depositor];
    }
    
    /// @notice Calculate estimated annual yield
    function getEstimatedAnnualYield(uint256 principal) external view returns (uint256) {
        return (principal * interestRate) / BASIS_POINTS;
    }
    
    // -------------------- Emergency Functions --------------------
    
    /// @notice Emergency withdrawal (owner only)
    function emergencyWithdraw(uint256 amount, address recipient) 
        external 
        onlyOwner 
        nonReentrant 
    {
        require(amount > 0, "Amount must be > 0");
        require(recipient != address(0), "Invalid recipient");
        require(address(this).balance >= amount, "Insufficient balance");
        
        (bool success, ) = payable(recipient).call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    /// @notice Get contract balance
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // -------------------- Receive Functions --------------------
    
    receive() external payable {
        // Allow contract to receive ETH
    }
    
    fallback() external payable {
        revert("Function not found");
    }
}