// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CompoundIntegrator.sol";

contract Escrow is Ownable(msg.sender) {
    IERC20 public usdc;
    CompoundIntegrator public compoundIntegrator;
    address public auctionEngine;

    struct DepositInfo {
        uint256 amount;
        uint256 potId;
        uint256 cycleId;
        address depositor;
    }

    uint256 public depositCounter;
    mapping(uint256 => DepositInfo) public deposits;
    mapping(uint256 => uint256[]) public cycleDeposits; // cycleId => deposit IDs

    event FundsDeposited(
        uint256 indexed depositId,
        uint256 indexed potId,
        uint256 indexed cycleId,
        address depositor,
        uint256 amount
    );

    constructor(address _usdc, address _compoundIntegrator) {
        usdc = IERC20(_usdc);
        compoundIntegrator = CompoundIntegrator(_compoundIntegrator);
    }

    modifier onlyAuctionEngine() {
        require(msg.sender == auctionEngine, "Only Auction Engine allowed");
        _;
    }

    function setAuctionEngine(address _auctionEngine) external onlyOwner {
        auctionEngine = _auctionEngine;
        compoundIntegrator.setAuctionEngine(_auctionEngine);
    }

    /// @notice Deposit funds for a specific pot and cycle (called from AuctionEngine)
    function deposit(uint256 potId, uint256 cycleId, address member) external payable onlyAuctionEngine {
        require(msg.value > 0, "Deposit amount must be > 0");

        // Forward to Compound via integrator
        compoundIntegrator.depositToCompound{value: msg.value};

        // Track deposit info
        uint256 depositId = depositCounter++;
        deposits[depositId] = DepositInfo({
            amount: msg.value,
            potId: potId,
            cycleId: cycleId,
            depositor: member
        });

        cycleDeposits[cycleId].push(depositId);

        emit FundsDeposited(depositId, potId, cycleId, member, msg.value);
    }

    /// @notice Withdraw funds (principal or rewards) back to Auction Engine
    function withdrawFunds(uint256 amount, address to) external onlyAuctionEngine {
        compoundIntegrator.withdrawFromCompound(amount, to);
    }

        /// @notice Release funds to the winner of the cycle (usually lowest bidder)
    function releaseFundsToWinner(
        uint256 amount,
        address payable winner
    ) external onlyAuctionEngine {
        require(winner != address(0), "Invalid winner");
        compoundIntegrator.withdrawFromCompound(amount, winner);
    }

    /// @notice Release interest/profit share to contributors (optional utility)
    function releaseInterestToContributors(
        uint256[] calldata depositIds,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyAuctionEngine {
        require(
            depositIds.length == recipients.length &&
            recipients.length == amounts.length,
            "Mismatched input arrays"
        );

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            compoundIntegrator.withdrawFromCompound(amounts[i], recipients[i]);
        }
    }

    /// @notice View total locked funds (in Compound)
    function getEscrowBalance() external view returns (uint256) {
        return compoundIntegrator.getCompoundBalance();
    }

    /// @notice Get all deposits for a cycle
    function getDepositsForCycle(uint256 cycleId) external view returns (uint256[] memory) {
        return cycleDeposits[cycleId];
    }

    /// @notice Get individual deposit info
    function getDepositInfo(uint256 depositId) external view returns (DepositInfo memory) {
        return deposits[depositId];
    }
}
