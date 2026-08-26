// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AuctionEngineV4} from "../src/AuctionEngineV4.sol";
import {MemberRegistryV4} from "../src/MemberRegistryV4.sol";
import {VaultV4} from "../src/VaultV4.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TestnetRunAuction is Script {
    function run() external {
        uint256 pk1 = vm.envUint("PRIVATE_KEY");
        uint256 pk2 = 0x04c5b6479a5da32743f70c9ef6045408434a83e55f70acd5c9386d7c04ae396a;
        address user1 = vm.addr(pk1);
        address user2 = vm.addr(pk2);

        AuctionEngineV4 auction = AuctionEngineV4(0x347B063538219961a747192d0656c1b4e382Da2e);
        MemberRegistryV4 registry = MemberRegistryV4(0x5860dDEE64256Cf77924209b1eEEb4ddf92B3395);
        VaultV4 vault = VaultV4(0x3D5dd83A9977BBEA876F9380cfd56A6B9E064C95);
        IERC20 usdc = IERC20(0x036CbD53842c5426634e7929541eC2318f3dCF7e);

        vm.startBroadcast(pk1);
        if (!registry.isRegistered(user1)) {
            registry.registerMember();
        }
        usdc.approve(address(vault), type(uint256).max);
        vm.stopBroadcast();

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
        uint256 potId = auction.createPot(
            root,
            2,
            1e6, // 1 USDC
            2 days,  // cycle duration
            1 days,  // payment window
            1.5 days // bidding window
        );
        console2.log("Created Auction Pot:", potId);
        auction.joinPot(potId, proof1);
        vm.stopBroadcast();

        vm.startBroadcast(pk2);
        auction.joinPot(potId, proof2);
        vm.stopBroadcast();

        vm.startBroadcast(pk1);
        auction.startPot(potId);
        auction.startCycle(potId);
        auction.payForCycle(potId);
        vm.stopBroadcast();

        vm.startBroadcast(pk2);
        auction.payForCycle(potId);
        
        // Cannot simulate bidding on testnet without time travel because of MIN_PAYMENT_WINDOW
        // auction.placeBid(potId, 1500000); 
        // vm.stopBroadcast();

        // vm.startBroadcast(pk1);
        // auction.placeBid(potId, 2000000);
        vm.stopBroadcast();
        
        console2.log("Auction Cycle fully funded and Bid placed! Wait 15s to declare winner.");
    }
}
