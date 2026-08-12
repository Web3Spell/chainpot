//SPDX-License_Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();

        // Deployment logic here

        vm.stopBroadcast();
    }
}
