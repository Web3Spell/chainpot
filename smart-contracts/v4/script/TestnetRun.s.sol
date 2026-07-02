// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {CircleEngineV4} from "../src/CircleEngineV4.sol";
import {MemberRegistryV4} from "../src/MemberRegistryV4.sol";
import {VaultV4} from "../src/VaultV4.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TestnetRun is Script {
    function run() external {
        uint256 pk1 = vm.envUint("PRIVATE_KEY");
        uint256 pk2 = 0x04c5b6479a5da32743f70c9ef6045408434a83e55f70acd5c9386d7c04ae396a;
        address user1 = vm.addr(pk1);
        address user2 = vm.addr(pk2);

        CircleEngineV4 circle = CircleEngineV4(0x93cdC00c3759c9ed6427612f5FC9C943cB67755C);
        MemberRegistryV4 registry = MemberRegistryV4(0xC4222C81B1ceF982F55477916a87C99Faaf9E8E2);
        VaultV4 vault = VaultV4(0x0593a9EA617796Dd44f347331ff2CF60d4117136);
        IERC20 usdc = IERC20(0x036CbD53842c5426634e7929541eC2318f3dCF7e);

        vm.startBroadcast(pk2);
        if (!registry.isRegistered(user2)) {
            registry.registerMember();
        }
        usdc.approve(address(vault), type(uint256).max);
        vm.stopBroadcast();

        // Compute Merkle Root
        bytes32 leaf1 = keccak256(bytes.concat(keccak256(abi.encode(user1))));
        bytes32 leaf2 = keccak256(bytes.concat(keccak256(abi.encode(user2))));
        bytes32 root = keccak256(bytes.concat(
            leaf1 < leaf2 ? leaf1 : leaf2,
            leaf1 < leaf2 ? leaf2 : leaf1
        ));
        
        bytes32[] memory proof1 = new bytes32[](1);
        proof1[0] = leaf2;
        bytes32[] memory proof2 = new bytes32[](1);
        proof2[0] = leaf1;

        vm.startBroadcast(pk1);
        uint256 potId = circle.createPot(
            root,
            2,
            1e6,
            15, // 15s cycle duration to give us time
            10, // 10s payment window
            true
        );
        console2.log("Created Pot:", potId);
        circle.joinPot(potId, proof1);
        vm.stopBroadcast();

        vm.startBroadcast(pk2);
        circle.joinPot(potId, proof2);
        vm.stopBroadcast();

        vm.startBroadcast(pk1);
        circle.startPot(potId);
        circle.startCycle(potId);
        circle.payForCycle(potId);
        vm.stopBroadcast();

        vm.startBroadcast(pk2);
        circle.payForCycle(potId);
        vm.stopBroadcast();
        
        console2.log("Cycle 1 fully funded! Please wait 10 seconds to call drawWinner.");
    }
}
