// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {EscrowPlatform} from "../src/EscrowPlatform.sol";

contract DeployScript is Script {
    EscrowPlatform public escrowPlatform;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        escrowPlatform = new EscrowPlatform();

        vm.stopBroadcast();
    }
}
