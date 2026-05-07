// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";

import {EscrowPlatform} from "../src/core/EscrowPlatform.sol";
import {DisputeDAO} from "../src/modules/DisputeDAO.sol";
import {ProfileRegistry} from "../src/modules/ProfileRegistry.sol";
import {ReputationNFT} from "../src/modules/ReputationNFT.sol";

/**A
 * @title DeployScript
 * @notice Deploys the four TrustWork contracts and wires them together.
 *
 *         Required env vars:
 *           PRIVATE_KEY         deployer key
 *           USDC_TOKEN          USDC ERC-20 address on the target chain
 *           PLATFORM_TREASURY   address that receives platform fees
 *           GOVERNANCE          address allowed to tune the fee percent
 *           MULTISIG            address allowed to pause + rotate addresses
 *           TRUSTED_FORWARDER   ERC-2771 forwarder (use address(0) to disable)
 *
 *         Wiring requires the deployer to be both the EscrowPlatform multisig
 *         and the initial owner of DisputeDAO + ReputationNFT. After wiring
 *         completes, ownership/multisig can be rotated to the production
 *         addresses with separate transactions.
 */
contract DeployScript is Script {
    struct Config {
        address usdcToken;
        address platformTreasury;
        address governance;
        address multisig;
        address trustedForwarder;
    }

    struct Deployment {
        EscrowPlatform escrow;
        DisputeDAO disputeDAO;
        ProfileRegistry profileRegistry;
        ReputationNFT reputationNFT;
    }

    function run() external returns (Deployment memory d) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        Config memory cfg = Config({
            usdcToken: vm.envAddress("USDC_TOKEN"),
            platformTreasury: vm.envAddress("PLATFORM_TREASURY"),
            governance: vm.envAddress("GOVERNANCE"),
            multisig: vm.envAddress("MULTISIG"),
            trustedForwarder: vm.envAddress("TRUSTED_FORWARDER")
        });

        require(deployer == cfg.multisig, "deployer must equal MULTISIG for wiring");

        vm.startBroadcast(deployerKey);

        d.escrow = new EscrowPlatform(
            cfg.usdcToken,
            cfg.platformTreasury,
            cfg.governance,
            cfg.multisig,
            cfg.trustedForwarder
        );

        d.disputeDAO = new DisputeDAO(
            cfg.usdcToken,
            cfg.platformTreasury,
            cfg.trustedForwarder,
            deployer
        );

        d.profileRegistry = new ProfileRegistry();

        d.reputationNFT = new ReputationNFT(cfg.trustedForwarder, deployer);

        d.disputeDAO.setEscrowPlatform(address(d.escrow));
        d.reputationNFT.setEscrowPlatform(address(d.escrow));

        d.escrow.pause();
        d.escrow.setDisputeDAO(address(d.disputeDAO));
        d.escrow.setReputationNFT(address(d.reputationNFT));
        d.escrow.setProfileRegistry(address(d.profileRegistry));
        d.escrow.unpause();

        vm.stopBroadcast();

        console2.log("EscrowPlatform   :", address(d.escrow));
        console2.log("DisputeDAO       :", address(d.disputeDAO));
        console2.log("ProfileRegistry  :", address(d.profileRegistry));
        console2.log("ReputationNFT    :", address(d.reputationNFT));
    }
}
