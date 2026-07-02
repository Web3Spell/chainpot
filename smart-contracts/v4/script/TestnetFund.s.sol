// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MemberRegistryV4} from "../src/MemberRegistryV4.sol";
import {VaultV4} from "../src/VaultV4.sol";

contract TestnetFund is Script {
    function run() external {
        uint256 pk1 = vm.envUint("PRIVATE_KEY");
        uint256 pk2 = 0x04c5b6479a5da32743f70c9ef6045408434a83e55f70acd5c9386d7c04ae396a;
        address user2 = vm.addr(pk2);

        IERC20 usdc = IERC20(0x036CbD53842c5426634e7929541eC2318f3dCF7e);
        MemberRegistryV4 registry = MemberRegistryV4(0xC4222C81B1ceF982F55477916a87C99Faaf9E8E2);
        VaultV4 vault = VaultV4(0x0593a9EA617796Dd44f347331ff2CF60d4117136);

        vm.startBroadcast(pk1);
        if (user2.balance < 0.005 ether) {
            (bool success, ) = user2.call{value: 0.005 ether}("");
            require(success, "ETH transfer failed");
        }
        if (usdc.balanceOf(user2) < 2e6) {
            usdc.transfer(user2, 2e6);
        }
        address user1 = vm.addr(pk1);
        if (!registry.isRegistered(user1)) {
            registry.registerMember();
        }
        usdc.approve(address(vault), type(uint256).max);
        vm.stopBroadcast();
        
        console2.log("User 1 set up and User 2 funded!");
    }
}
