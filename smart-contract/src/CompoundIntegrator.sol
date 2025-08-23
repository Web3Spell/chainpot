// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/// @title CompoundV3Integrator
/// @notice Real integration with Compound V3 (Comet) for yield generation
/// @dev Integrates with Compound III USDC market on Base Sepolia
contract CompoundV3Integrator is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Compound V3 Interface (Comet)
    interface IComet {
        function supply(address asset, uint amount) external;
        function withdraw(address asset, uint amount) external;
        function balanceOf(address account) external view returns (uint256);
        function borrowBalanceOf(address account) external view returns (uint256);
        function collateralBalanceOf(address account, address asset) external view returns (uint128);
        function baseToken() external view returns (address);
        function getSupplyRate(uint utilization) external view returns (uint64);
        function getBorrowRate(uint utilization) external view returns (uint64);
        function getUtilization() external view returns (uint);
        function totalSupply() external view returns (uint256);
        function totalBorrow() external view returns (uint256);
        function getPrice(address priceFeed) external view returns (uint256);
        function getAssetInfo(uint8 i) external view returns (AssetInfo memory);
        function getAssetInfoByAddress(address asset) external view returns (AssetInfo memory);
        function pause(bool supplyPaused, bool transferPaused, bool withdrawPaused, bool absorbPaused, bool buyPaused) external;
        function isLiquidatable(address account) external view returns (bool);
    }

    struct AssetInfo {
        uint8 offset;
        address asset;
        address priceFeed;
        uint64 scale;
        uint64 borrowCollateralFactor;
        uint64 liquidateCollateralFactor;
        uint64 liquidationFactor;
        uint128 supplyCap;
    }

    // Contract addresses for Base Sepolia
    address public constant COMET_USDC_BASE_SEPOLIA = 0x571621Ce60Cebb0c1D442B5afb38B1663C6Bf017; // Base Sepolia Comet USDC
    address public constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // Base Sepolia USDC
    
    IComet public immutable comet;
    IERC20 public immutable usdc;
    
    address public auctionEngine;
    address public escrow;
    
    // Tracking
    uint256 public totalSupplied;
    uint256 public totalWithdrawn;
    uint256 public lastUpdateTime;
    
    mapping(address => uint256) public userSupplies;
    mapping(uint256 => uint256) public potSupplies; // potId => amount supplied

    //PriceFeed Variables
    AggregatorV3Interface private immutable ethUsdFeed;
    AggregatorV3Interface private immutable usdcUsdFeed;
    
    uint256 public constant PRICE_DECIMALS = 6; // USDC decimals
    uint256 public constant MAX_STALENESS = 3600; // 1 hour
    uint256 public constant MIN_PRICE = 100 * 1e6; // $100 minimum
    uint256 public constant MAX_PRICE = 20000 * 1e6; // $20,000 maximum


    // Events
    event SuppliedToCompound(uint256 amount, uint256 timestamp);
    event WithdrawnFromCompound(uint256 amount, address recipient, uint256 timestamp);
    event InterestAccrued(uint256 amount, uint256 timestamp);
    event AuctionEngineUpdated(address indexed newEngine);
    event EscrowUpdated(address indexed newEscrow);
    event EmergencyWithdrawal(uint256 amount, address recipient);
    event PriceRetrieved(uint256 ethPriceInUsdc);

 // Errors
    error StalePriceData();
    error InvalidPriceData();
    error PriceOutOfBounds();

    constructor(address _ethUsdFeed, address _usdcUsdFeed) Ownable(msg.sender) {
        comet = IComet(COMET_USDC_BASE_SEPOLIA);
        usdc = IERC20(USDC_BASE_SEPOLIA);
        lastUpdateTime = block.timestamp;
        ethUsdFeed = AggregatorV3Interface(_ethUsdFeed);
        usdcUsdFeed = AggregatorV3Interface(_usdcUsdFeed);

        // Approve Comet to spend USDC
        usdc.safeApprove(COMET_USDC_BASE_SEPOLIA, type(uint256).max);
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
    
    // -------------------- Core Functions --------------------
    
    /// @notice Convert ETH to USDC and supply to Compound V3
    /// @dev In production, you'd use a DEX like Uniswap to swap ETH to USDC
    function depositToCompound() external payable onlyAuthorized nonReentrant {
        require(msg.value > 0, "Amount must be > 0");
        
        // For this example, we simulate ETH->USDC conversion
        // In production, integrate with Uniswap V3 or another DEX
        uint256 usdcAmount = _simulateETHToUSDC(msg.value);
        
        // Supply USDC to Compound V3
        comet.supply(USDC_BASE_SEPOLIA, usdcAmount);
        
        totalSupplied += usdcAmount;
        userSupplies[msg.sender] += usdcAmount;
        lastUpdateTime = block.timestamp;
        
        emit SuppliedToCompound(usdcAmount, block.timestamp);
    }
    
    /// @notice Supply USDC directly to Compound V3
    function supplyUSDC(uint256 amount) external onlyAuthorized nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(usdc.balanceOf(msg.sender) >= amount, "Insufficient USDC balance");
        
        // Transfer USDC from caller
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        
        // Supply to Compound V3
        comet.supply(USDC_BASE_SEPOLIA, amount);
        
        totalSupplied += amount;
        userSupplies[msg.sender] += amount;
        lastUpdateTime = block.timestamp;
        
        emit SuppliedToCompound(amount, block.timestamp);
    }
    
    /// @notice Withdraw USDC from Compound V3 and convert to ETH
    function withdrawFromCompound(uint256 amount, address recipient) 
        external 
        onlyAuthorized 
        nonReentrant 
    {
        require(amount > 0, "Amount must be > 0");
        require(recipient != address(0), "Invalid recipient");
        
        uint256 availableBalance = getCompoundBalance();
        require(availableBalance >= amount, "Insufficient balance in Compound");
        
        // Calculate USDC amount needed
        uint256 usdcAmount = _simulateETHToUSDC(amount);
        
        // Withdraw from Compound V3
        comet.withdraw(USDC_BASE_SEPOLIA, usdcAmount);
        
        // Convert USDC back to ETH (simulated)
        uint256 ethAmount = _simulateUSDCToETH(usdcAmount);
        
        totalWithdrawn += ethAmount;
        lastUpdateTime = block.timestamp;
        
        // Send ETH to recipient
        (bool success, ) = payable(recipient).call{value: ethAmount}("");
        require(success, "ETH transfer failed");
        
        emit WithdrawnFromCompound(ethAmount, recipient, block.timestamp);
    }
    
    /// @notice Withdraw USDC directly (no conversion)
    function withdrawUSDC(uint256 usdcAmount, address recipient) 
        external 
        onlyAuthorized 
        nonReentrant 
    {
        require(usdcAmount > 0, "Amount must be > 0");
        require(recipient != address(0), "Invalid recipient");
        
        uint256 availableUSDC = comet.balanceOf(address(this));
        require(availableUSDC >= usdcAmount, "Insufficient USDC in Compound");
        
        // Withdraw from Compound V3
        comet.withdraw(USDC_BASE_SEPOLIA, usdcAmount);
        
        // Transfer USDC to recipient
        usdc.safeTransfer(recipient, usdcAmount);
        
        totalWithdrawn += usdcAmount;
        lastUpdateTime = block.timestamp;
        
        emit WithdrawnFromCompound(usdcAmount, recipient, block.timestamp);
    }
    
    /// @notice Claim and compound any earned interest
    function compoundInterest() external onlyAuthorized {
        uint256 currentBalance = comet.balanceOf(address(this));
        uint256 netInterest = currentBalance > totalSupplied ? currentBalance - totalSupplied : 0;
        
        if (netInterest > 0) {
            totalSupplied += netInterest;
            emit InterestAccrued(netInterest, block.timestamp);
        }
        
        lastUpdateTime = block.timestamp;
    }
    
    // -------------------- Simulation Functions (Replace with real DEX integration) --------------------
    
    /// @notice Simulate ETH to USDC conversion (replacing with real DEX integration in next phase)
    function _simulateETHToUSDC(uint256 ethAmount) internal pure returns (uint256) {
        // Simulated rate: 1 ETH = 2500 USDC
        // In production, get real-time price from Chainlink or DEX
        return (ethAmount * 2500) / 1e18 * 1e6; // Convert to 6 decimal USDC
    }
    
 /// @notice Simulate USDC to ETH conversion using live price data
    /// @param usdcAmount Amount of USDC to convert (6 decimals)
    /// @return ethAmount Equivalent ETH amount (18 decimals)
    function _simulateUSDCToETH(uint256 usdcAmount) internal view returns (uint256 ethAmount) {
        // Get current ETH price in USDC
        uint256 ethPriceInUsdc = _getETHPriceInUSDCInternal();
        
        // Convert USDC to ETH: ethAmount = usdcAmount / ethPrice
        // usdcAmount (6 decimals) * 1e18 / ethPriceInUsdc (6 decimals) = ETH (18 decimals)
        ethAmount = (usdcAmount * 1e18) / ethPriceInUsdc;
        
        return ethAmount;
    }
    
    /// @notice Internal function to get ETH price without events
    function _getETHPriceInUSDCInternal() internal view returns (uint256) {
        (, int256 ethPrice, , uint256 ethUpdatedAt, ) = ethUsdFeed.latestRoundData();
        if (ethPrice <= 0) revert InvalidPriceData();
        if (block.timestamp - ethUpdatedAt > MAX_STALENESS) revert StalePriceData();
        
        (, int256 usdcPrice, , uint256 usdcUpdatedAt, ) = usdcUsdFeed.latestRoundData();
        if (usdcPrice <= 0) revert InvalidPriceData();
        if (block.timestamp - usdcUpdatedAt > MAX_STALENESS) revert StalePriceData();
        
        uint8 ethDecimals = ethUsdFeed.decimals();
        uint8 usdcDecimals = usdcUsdFeed.decimals();
        
        uint256 ethPriceInUsdc = (uint256(ethPrice) * (10 ** PRICE_DECIMALS) * (10 ** usdcDecimals)) / 
                                (uint256(usdcPrice) * (10 ** ethDecimals));
        
        if (ethPriceInUsdc < MIN_PRICE || ethPriceInUsdc > MAX_PRICE) {
            revert PriceOutOfBounds();
        }
        
        return ethPriceInUsdc;
    }
}
    /// @notice Get ETH price in USDC
    /// @return ethPriceInUsdc ETH price with 6 decimals
    function getETHPriceInUSDC() external returns (uint256 ethPriceInUsdc) {
        // Get ETH/USD price
        (, int256 ethPrice, , uint256 ethUpdatedAt, ) = ethUsdFeed.latestRoundData();
        if (ethPrice <= 0) revert InvalidPriceData();
        if (block.timestamp - ethUpdatedAt > MAX_STALENESS) revert StalePriceData();
        
        // Get USDC/USD price  
        (, int256 usdcPrice, , uint256 usdcUpdatedAt, ) = usdcUsdFeed.latestRoundData();
        if (usdcPrice <= 0) revert InvalidPriceData();
        if (block.timestamp - usdcUpdatedAt > MAX_STALENESS) revert StalePriceData();
        
        // Calculate ETH/USDC = (ETH/USD) / (USDC/USD)
        uint8 ethDecimals = ethUsdFeed.decimals();
        uint8 usdcDecimals = usdcUsdFeed.decimals();
        
        ethPriceInUsdc = (uint256(ethPrice) * (10 ** PRICE_DECIMALS) * (10 ** usdcDecimals)) / 
                        (uint256(usdcPrice) * (10 ** ethDecimals));
        
        // Sanity check
        if (ethPriceInUsdc < MIN_PRICE || ethPriceInUsdc > MAX_PRICE) {
            revert PriceOutOfBounds();
        }
        
        emit PriceRetrieved(ethPriceInUsdc);
        return ethPriceInUsdc;
    }
    // -------------------- View Functions --------------------
    
    /// @notice Get current balance in Compound (USDC balance converted to ETH equivalent)
    function getCompoundBalance() public view returns (uint256) {
        uint256 usdcBalance = comet.balanceOf(address(this));
        return _simulateUSDCToETH(usdcBalance);
    }
    
    /// @notice Get USDC balance in Compound
    function getCompoundUSDCBalance() external view returns (uint256) {
        return comet.balanceOf(address(this));
    }
    
    /// @notice Get current supply APY from Compound V3
    function getCurrentSupplyAPY() external view returns (uint256) {
        uint256 utilization = comet.getUtilization();
        uint64 supplyRate = comet.getSupplyRate(utilization);
        // Convert from per-second rate to APY (basis points)
        return uint256(supplyRate) * 365 days * 10000 / 1e18;
    }
    
    /// @notice Get total supplied amount
    function getTotalSupplied() external view returns (uint256) {
        return totalSupplied;
    }
    
    /// @notice Get total withdrawn amount
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }
    
    /// @notice Get accrued interest
    function getAccruedInterest() external view returns (uint256) {
        uint256 currentBalance = comet.balanceOf(address(this));
        return currentBalance > totalSupplied ? currentBalance - totalSupplied : 0;
    }
    
    /// @notice Get user's supply amount
    function getUserSupply(address user) external view returns (uint256) {
        return userSupplies[user];
    }
    
    /// @notice Get pot's supply amount
    function getPotSupply(uint256 potId) external view returns (uint256) {
        return potSupplies[potId];
    }
    
    /// @notice Get Compound market utilization
    function getMarketUtilization() external view returns (uint256) {
        return comet.getUtilization();
    }
    
    /// @notice Check if account is liquidatable
    function isAccountLiquidatable() external view returns (bool) {
        return comet.isLiquidatable(address(this));
    }
    
    /// @notice Get base token (should be USDC)
    function getBaseToken() external view returns (address) {
        return comet.baseToken();
    }
    
    /// @notice Get contract's USDC balance (not in Compound)
    function getUSDCBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
    
    /// @notice Get contract's ETH balance
    function getETHBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // -------------------- Advanced Compound V3 Functions --------------------
    
    /// @notice Supply with tracking for specific pot
    function supplyForPot(uint256 potId, uint256 amount) 
        external 
        payable 
        onlyAuthorized 
        nonReentrant 
    {
        require(amount > 0, "Amount must be > 0");
        
        uint256 usdcAmount;
        
        if (msg.value > 0) {
            // ETH deposit - convert to USDC
            require(msg.value == amount, "ETH amount mismatch");
            usdcAmount = _simulateETHToUSDC(amount);
        } else {
            // Direct USDC deposit
            usdcAmount = amount;
            usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        }
        
        // Supply to Compound V3
        comet.supply(USDC_BASE_SEPOLIA, usdcAmount);
        
        // Track by pot
        potSupplies[potId] += usdcAmount;
        totalSupplied += usdcAmount;
        userSupplies[msg.sender] += usdcAmount;
        
        emit SuppliedToCompound(usdcAmount, block.timestamp);
    }
    
    /// @notice Withdraw for specific pot
    function withdrawForPot(uint256 potId, uint256 amount, address recipient) 
        external 
        onlyAuthorized 
        nonReentrant 
    {
        require(amount > 0, "Amount must be > 0");
        require(recipient != address(0), "Invalid recipient");
        require(potSupplies[potId] >= amount, "Insufficient pot balance");
        
        // Convert ETH amount to USDC for withdrawal
        uint256 usdcAmount = _simulateETHToUSDC(amount);
        
        // Withdraw from Compound V3
        comet.withdraw(USDC_BASE_SEPOLIA, usdcAmount);
        
        // Update tracking
        potSupplies[potId] -= usdcAmount;
        totalWithdrawn += amount;
        
        // Convert back to ETH and send
        uint256 ethAmount = _simulateUSDCToETH(usdcAmount);
        (bool success, ) = payable(recipient).call{value: ethAmount}("");
        require(success, "ETH transfer failed");
        
        emit WithdrawnFromCompound(ethAmount, recipient, block.timestamp);
    }
    
    /// @notice Get interest earned for a specific pot
    function getPotInterest(uint256 potId) external view returns (uint256) {
        if (potSupplies[potId] == 0) return 0;
        
        uint256 totalCurrentBalance = comet.balanceOf(address(this));
        uint256 totalInterest = totalCurrentBalance > totalSupplied ? totalCurrentBalance - totalSupplied : 0;
        
        // Proportional interest based on pot's contribution
        return (totalInterest * potSupplies[potId]) / totalSupplied;
    }
    
    /// @notice Withdraw interest only for a pot
    function withdrawPotInterest(uint256 potId, address recipient) 
        external 
        onlyAuthorized 
        nonReentrant 
        returns (uint256) 
    {
        uint256 interestUSDC = getPotInterest(potId);
        require(interestUSDC > 0, "No interest to withdraw");
        
        // Withdraw interest from Compound
        comet.withdraw(USDC_BASE_SEPOLIA, interestUSDC);
        
        // Convert to ETH and send
        uint256 ethAmount = _simulateUSDCToETH(interestUSDC);
        (bool success, ) = payable(recipient).call{value: ethAmount}("");
        require(success, "ETH transfer failed");
        
        emit WithdrawnFromCompound(ethAmount, recipient, block.timestamp);
        return ethAmount;
    }
    
    // -------------------- Compound V3 View Functions --------------------
    
    /// @notice Get current supply APY from Compound V3
    function getSupplyAPY() external view returns (uint256) {
        uint256 utilization = comet.getUtilization();
        uint64 supplyRate = comet.getSupplyRate(utilization);
        
        // Convert per-second rate to APY (approximately)
        // supplyRate is in 1e18 precision, per second
        uint256 secondsPerYear = 365 * 24 * 60 * 60;
        return (uint256(supplyRate) * secondsPerYear * 100) / 1e18;
    }
    
    /// @notice Get market utilization rate
    function getUtilization() external view returns (uint256) {
        return comet.getUtilization();
    }
    
    /// @notice Get total market supply
    function getTotalMarketSupply() external view returns (uint256) {
        return comet.totalSupply();
    }
    
    /// @notice Get total market borrow
    function getTotalMarketBorrow() external view returns (uint256) {
        return comet.totalBorrow();
    }
    
    /// @notice Check if our account is healthy
    function isAccountHealthy() external view returns (bool) {
        return !comet.isLiquidatable(address(this));
    }
    
    /// @notice Get our borrow balance (should be 0 for this use case)
    function getBorrowBalance() external view returns (uint256) {
        return comet.borrowBalanceOf(address(this));
    }
    
    // -------------------- Real DEX Integration Functions (Placeholder) --------------------
    
    /// @notice Real ETH to USDC swap using Uniswap V3 (implement in production)
    function swapETHToUSDC(uint256 ethAmount, uint256 minUSDCOut) 
        external 
        payable 
        onlyAuthorized 
        returns (uint256 usdcOut) 
    {
        require(msg.value == ethAmount, "ETH amount mismatch");
        
        // TODO: Implement real Uniswap V3 swap
        // ISwapRouter swapRouter = ISwapRouter(UNISWAP_V3_ROUTER);
        // ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
        //     tokenIn: WETH,
        //     tokenOut: USDC_BASE_SEPOLIA,
        //     fee: 3000, // 0.3%
        //     recipient: address(this),
        //     deadline: block.timestamp + 300,
        //     amountIn: ethAmount,
        //     amountOutMinimum: minUSDCOut,
        //     sqrtPriceLimitX96: 0
        // });
        // usdcOut = swapRouter.exactInputSingle{value: ethAmount}(params);
        
        // For now, use simulation
        usdcOut = _simulateETHToUSDC(ethAmount);
        require(usdcOut >= minUSDCOut, "Insufficient output amount");
        
        return usdcOut;
    }
    
    /// @notice Real USDC to ETH swap using Uniswap V3 (implement in production)
    function swapUSDCToETH(uint256 usdcAmount, uint256 minETHOut) 
        external 
        onlyAuthorized 
        returns (uint256 ethOut) 
    {
        require(usdcAmount > 0, "Amount must be > 0");
        require(usdc.balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // TODO: Implement real Uniswap V3 swap
        // Similar to above but reverse direction
        
        // For now, use simulation
        ethOut = _simulateUSDCToETH(usdcAmount);
        require(ethOut >= minETHOut, "Insufficient output amount");
        require(address(this).balance >= ethOut, "Insufficient ETH balance");
        
        return ethOut;
    }
    
    // -------------------- Emergency Functions --------------------
    
    /// @notice Emergency withdraw all funds from Compound
    function emergencyWithdrawAll() external onlyOwner nonReentrant {
        uint256 balance = comet.balanceOf(address(this));
        if (balance > 0) {
            comet.withdraw(USDC_BASE_SEPOLIA, balance);
            emit EmergencyWithdrawal(balance, owner());
        }
    }
    
    /// @notice Emergency withdraw specific amount
    function emergencyWithdraw(uint256 amount, address recipient) 
        external 
        onlyOwner 
        nonReentrant 
    {
        require(amount > 0, "Amount must be > 0");
        require(recipient != address(0), "Invalid recipient");
        
        if (address(this).balance >= amount) {
            (bool success, ) = payable(recipient).call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            // Try to withdraw from Compound first
            uint256 usdcAmount = _simulateETHToUSDC(amount);
            comet.withdraw(USDC_BASE_SEPOLIA, usdcAmount);
            
            uint256 ethAmount = _simulateUSDCToETH(usdcAmount);
            (bool success, ) = payable(recipient).call{value: ethAmount}("");
            require(success, "ETH transfer failed");
        }
        
        emit EmergencyWithdrawal(amount, recipient);
    }
    
    /// @notice Emergency withdraw USDC
    function emergencyWithdrawUSDC(uint256 amount, address recipient) 
        external 
        onlyOwner 
        nonReentrant 
    {
        require(amount > 0, "Amount must be > 0");
        require(recipient != address(0), "Invalid recipient");
        
        uint256 usdcBalance = usdc.balanceOf(address(this));
        if (usdcBalance >= amount) {
            usdc.safeTransfer(recipient, amount);
        } else {
            // Withdraw from Compound
            comet.withdraw(USDC_BASE_SEPOLIA, amount);
            usdc.safeTransfer(recipient, amount);
        }
        
        emit EmergencyWithdrawal(amount, recipient);
    }
    
    // -------------------- Receive Functions --------------------
    
    receive() external payable {
        // Allow contract to receive ETH from swaps and withdrawals
    }
    
    fallback() external payable {
        revert("Function not found");
    }

}
