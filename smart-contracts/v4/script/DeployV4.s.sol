// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {MemberRegistryV4} from "../src/MemberRegistryV4.sol";
import {LotteryEngineV4} from "../src/LotteryEngineV4.sol";
import {CompoundIntegratorV4} from "../src/CompoundIntegratorV4.sol";
import {VaultV4} from "../src/VaultV4.sol";
import {CircleEngineV4} from "../src/CircleEngineV4.sol";
import {AuctionEngineV4} from "../src/AuctionEngineV4.sol";

/// @notice Deploys the full ChainPot V4 stack on Base Sepolia and wires it up.
contract DeployV4 is Script {
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

        MemberRegistryV4 registry = new MemberRegistryV4();
        console2.log("MemberRegistryV4:", address(registry));

        LotteryEngineV4 lottery = new LotteryEngineV4(vrfCoordinator, subId, keyHash);
        console2.log("LotteryEngineV4:", address(lottery));

        CompoundIntegratorV4 integrator = new CompoundIntegratorV4(comet, usdc);
        console2.log("CompoundIntegratorV4:", address(integrator));

        VaultV4 vault = new VaultV4(usdc, address(integrator));
        console2.log("VaultV4:", address(vault));

        CircleEngineV4 circle = new CircleEngineV4(address(registry), address(vault), address(lottery));
        console2.log("CircleEngineV4:", address(circle));

        AuctionEngineV4 auction = new AuctionEngineV4(address(registry), address(vault), address(lottery));
        console2.log("AuctionEngineV4:", address(auction));

        // ---- Wiring ----
        integrator.setVault(address(vault));

        vault.setEngine(address(circle), true);
        vault.setEngine(address(auction), true);

        registry.setAuthorizedCaller(address(circle), true);
        registry.setAuthorizedCaller(address(auction), true);

        lottery.setAuthorizedRequester(address(circle), true);
        lottery.setAuthorizedRequester(address(auction), true);

        vm.stopBroadcast();

        console2.log("---");
        console2.log("Wiring complete. Post-deploy:");
        console2.log(" 1. Add LotteryEngineV4 as a consumer on VRF subscription:", subId);
        console2.log("    Consumer:", address(lottery));
        console2.log(" 2. Fund the VRF subscription with LINK.");
        console2.log(" 3. (Prod) Transfer owner()/governance of each contract to a 2/3 multisig + timelock.");
    }
}
