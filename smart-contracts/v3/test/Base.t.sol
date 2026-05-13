// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {MockComet} from "./mocks/MockComet.sol";
import {MockVRFCoordinator} from "./mocks/MockVRFCoordinator.sol";

import {MemberAccountManagerV3} from "../src/MemberAccountManagerV3.sol";
import {LotteryEngineV3} from "../src/LotteryEngineV3.sol";
import {CompoundIntegratorV3} from "../src/CompoundIntegratorV3.sol";
import {EscrowV3} from "../src/EscrowV3.sol";
import {AuctionEngineV3} from "../src/AuctionEngineV3.sol";

/// @notice Shared test fixture with full deployment and members.
contract BaseTest is Test {
    // System
    MockUSDC internal usdc;
    MockComet internal comet;
    MockVRFCoordinator internal vrfCoord;
    MemberAccountManagerV3 internal mam;
    LotteryEngineV3 internal lottery;
    CompoundIntegratorV3 internal integrator;
    EscrowV3 internal escrow;
    AuctionEngineV3 internal engine;

    // Actors
    address internal owner;
    address internal alice;
    address internal bob;
    address internal carol;
    address internal dave;
    address internal eve;

    uint256 internal constant USDC_ONE = 1e6;
    uint256 internal constant DEFAULT_AMOUNT_PER_CYCLE = 1_000 * USDC_ONE;
    uint256 internal constant DEFAULT_CYCLE_DURATION = 7 days;
    uint256 internal constant DEFAULT_BID_DEADLINE = 1 days;

    // VRF placeholders
    bytes32 internal constant KEYHASH = bytes32(uint256(0xabc));
    uint256 internal constant SUB_ID = 1;

    // Mock supply rate ~ 5% APY: 0.05 / 31536000 ≈ 1.585e9 (in 1e18 scale)
    uint256 internal constant RATE_5PCT_APY = 1_585_489_599; // ~5%

    function setUp() public virtual {
        owner = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        carol = makeAddr("carol");
        dave = makeAddr("dave");
        eve = makeAddr("eve");

        usdc = new MockUSDC();
        comet = new MockComet(address(usdc), RATE_5PCT_APY);
        vrfCoord = new MockVRFCoordinator();

        mam = new MemberAccountManagerV3();
        lottery = new LotteryEngineV3(address(vrfCoord), SUB_ID, KEYHASH);
        integrator = new CompoundIntegratorV3(address(comet), address(usdc));
        escrow = new EscrowV3(address(usdc), address(integrator));
        engine = new AuctionEngineV3(address(usdc), address(mam), address(lottery), address(escrow));

        // Cross-wire
        integrator.setEscrow(address(escrow));
        escrow.setAuctionEngine(address(engine));
        mam.addAuthorizedCaller(address(engine));
        lottery.setAuthorizedRequester(address(engine), true);

        // Fund actors
        for (uint256 i = 0; i < 5; i++) {
            address a = [alice, bob, carol, dave, eve][i];
            usdc.mint(a, 100_000 * USDC_ONE);
        }
    }

    // ---- Helpers ----

    function _register(address user) internal {
        vm.prank(user);
        mam.registerMember();
    }

    function _registerAll() internal {
        _register(alice);
        _register(bob);
        _register(carol);
        _register(dave);
        _register(eve);
    }

    function _approveAndCreateBasicPot(address creator) internal returns (uint256 potId) {
        vm.prank(creator);
        potId = engine.createPot(
            "Test Pot",
            DEFAULT_AMOUNT_PER_CYCLE,
            DEFAULT_CYCLE_DURATION,
            3, // 3 cycles
            AuctionEngineV3.CycleFrequency.Weekly,
            DEFAULT_BID_DEADLINE,
            3, // min members
            5 // max members
        );
    }

    function _joinAll(uint256 potId, address[] memory members) internal {
        for (uint256 i = 0; i < members.length; i++) {
            vm.prank(members[i]);
            engine.joinPot(potId);
        }
    }

    function _payCycle(address member, uint256 cycleId, uint256 amount) internal {
        vm.startPrank(member);
        usdc.approve(address(escrow), amount);
        engine.payForCycle(cycleId);
        vm.stopPrank();
    }

    function _approve(address member, address spender, uint256 amount) internal {
        vm.prank(member);
        usdc.approve(spender, amount);
    }
}
