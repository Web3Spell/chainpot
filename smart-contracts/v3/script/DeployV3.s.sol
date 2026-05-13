// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {MemberAccountManagerV3} from "../src/MemberAccountManagerV3.sol";
import {LotteryEngineV3} from "../src/LotteryEngineV3.sol";
import {CompoundIntegratorV3} from "../src/CompoundIntegratorV3.sol";
import {EscrowV3} from "../src/EscrowV3.sol";
import {AuctionEngineV3} from "../src/AuctionEngineV3.sol";

/// @notice Deploys the full ChainPot v3 stack on Base Sepolia and wires it up.
contract DeployV3 is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");

        address usdc = vm.envAddress("USDC_BASE_SEPOLIA");
        address comet = vm.envAddress("COMET_USDC_BASE_SEPOLIA");
        address vrfCoordinator = vm.envAddress("VRF_COORDINATOR_BASE_SEPOLIA");
        bytes32 keyHash = vm.envBytes32("VRF_KEYHASH_BASE_SEPOLIA");
        uint256 subId = vm.envUint("VRF_SUBSCRIPTION_ID");

        console2.log("Deployer:", vm.addr(pk));
        console2.log("USDC:", usdc);
        console2.log("Comet:", comet);

        vm.startBroadcast(pk);

        MemberAccountManagerV3 mam = new MemberAccountManagerV3();
        console2.log("MemberAccountManagerV3:", address(mam));

        LotteryEngineV3 lottery = new LotteryEngineV3(vrfCoordinator, subId, keyHash);
        console2.log("LotteryEngineV3:", address(lottery));

        CompoundIntegratorV3 integrator = new CompoundIntegratorV3(comet, usdc);
        console2.log("CompoundIntegratorV3:", address(integrator));

        EscrowV3 escrow = new EscrowV3(usdc, address(integrator));
        console2.log("EscrowV3:", address(escrow));

        AuctionEngineV3 engine = new AuctionEngineV3(usdc, address(mam), address(lottery), address(escrow));
        console2.log("AuctionEngineV3:", address(engine));

        // Wire
        integrator.setEscrow(address(escrow));
        escrow.setAuctionEngine(address(engine));
        mam.addAuthorizedCaller(address(engine));
        lottery.setAuthorizedRequester(address(engine), true);

        vm.stopBroadcast();

        console2.log("---");
        console2.log("Deployment complete. Make sure your VRF subscription has the LotteryEngine added as consumer:");
        console2.log("  Subscription ID:", subId);
        console2.log("  Consumer to add:", address(lottery));
    }
}
