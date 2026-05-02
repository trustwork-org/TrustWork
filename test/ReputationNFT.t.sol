// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {ReputationNFT} from "../src/modules/ReputationNFT.sol";

contract ReputationNFTTest is Test {
    ReputationNFT public nft;

    address public owner = makeAddr("owner");
    address public escrowPlatform = makeAddr("escrowPlatform");
    address public trustedForwarder = makeAddr("trustedForwarder");

    address public freelancer = makeAddr("freelancer");

    function setUp() public {
        // Deploy the NFT contract with an owner and a forwarder
        nft = new ReputationNFT(trustedForwarder, owner);
        
        // Wire the EscrowPlatform address
        vm.prank(owner);
        nft.setEscrowPlatform(escrowPlatform);
    }

    // ---------------------------------------------------------------------
    // Admin Tests
    // ---------------------------------------------------------------------

    function test_SetEscrowPlatform_OnlyOwner() public {
        // Revert if non-owner tries to set it
        vm.prank(freelancer);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", freelancer));
        nft.setEscrowPlatform(makeAddr("newEscrow"));
        
        // Succeed if owner sets it
        vm.prank(owner);
        nft.setEscrowPlatform(makeAddr("newEscrow"));
        assertEq(nft.escrowPlatform(), makeAddr("newEscrow"));
    }

    function test_SetEscrowPlatform_RevertZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(ReputationNFT.ZeroAddress.selector);
        nft.setEscrowPlatform(address(0));
    }

    function test_SetBaseURI_OnlyOwner() public {
        vm.prank(freelancer);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", freelancer));
        nft.setBaseURI("ipfs://base/");
        
        vm.prank(owner);
        nft.setBaseURI("ipfs://base/");
    }

    // ---------------------------------------------------------------------
    // Minting Tests
    // ---------------------------------------------------------------------

    function test_CheckAndMint_OnlyEscrow() public {
        // Only the escrow platform can trigger a mint
        vm.prank(freelancer);
        vm.expectRevert(ReputationNFT.NotEscrowPlatform.selector);
        nft.checkAndMint(freelancer, 5, 0, 100);
    }

    function test_CheckAndMint_ZeroAddress() public {
        vm.prank(escrowPlatform);
        vm.expectRevert(ReputationNFT.ZeroAddress.selector);
        nft.checkAndMint(address(0), 5, 0, 100);
    }

    function test_CheckAndMint_BelowThreshold_NoOp() public {
        // Threshold 1 is 5 jobs. If they have 4, nothing happens.
        vm.prank(escrowPlatform);
        nft.checkAndMint(freelancer, 4, 0, 100);
        
        assertEq(nft.currentTier(freelancer), 0);
        assertEq(nft.balanceOf(freelancer), 0);
    }

    function test_CheckAndMint_Threshold1() public {
        vm.prank(escrowPlatform);
        nft.checkAndMint(freelancer, 5, 500, 1000e6);
        
        assertEq(nft.currentTier(freelancer), 1);
        assertEq(nft.jobsCompleted(freelancer), 5);
        
        uint256 tokenId = nft.freelancerTokenId(freelancer);
        assertEq(tokenId, 1);
        assertEq(nft.ownerOf(tokenId), freelancer);
        assertEq(nft.balanceOf(freelancer), 1);
        
        (
            address storedFreelancer,
            uint8 tier,
            uint256 jobs,
            uint256 rating,
            uint256 earned,
            uint256 mintedAt
        ) = nft.tokenMeta(tokenId);
        
        assertEq(storedFreelancer, freelancer);
        assertEq(tier, 1);
        assertEq(jobs, 5);
        assertEq(rating, 500);
        assertEq(earned, 1000e6);
        assertGt(mintedAt, 0);
    }

    function test_CheckAndMint_UpgradeTier() public {
        // First, freelancer reaches Tier 1 (5 jobs)
        vm.prank(escrowPlatform);
        nft.checkAndMint(freelancer, 5, 500, 1000e6);
        
        uint256 oldTokenId = nft.freelancerTokenId(freelancer);
        assertEq(nft.ownerOf(oldTokenId), freelancer);

        // Later, freelancer reaches Tier 2 (20 jobs)
        vm.prank(escrowPlatform);
        nft.checkAndMint(freelancer, 20, 480, 5000e6);
        
        assertEq(nft.currentTier(freelancer), 2);
        
        // The old Tier 1 token MUST be burned
        vm.expectRevert(abi.encodeWithSignature("ERC721NonexistentToken(uint256)", oldTokenId));
        nft.ownerOf(oldTokenId);
        
        // Metadata for old token should be deleted
        (address delFreelancer, , , , , ) = nft.tokenMeta(oldTokenId);
        assertEq(delFreelancer, address(0));

        // A new token is minted for Tier 2
        uint256 newTokenId = nft.freelancerTokenId(freelancer);
        assertEq(newTokenId, 2);
        assertEq(nft.ownerOf(newTokenId), freelancer);
        assertEq(nft.balanceOf(freelancer), 1); // Freelancer still only holds exactly 1 token
    }

    function test_CheckAndMint_SameTier_NoOp() public {
        // Reach Tier 1
        vm.prank(escrowPlatform);
        nft.checkAndMint(freelancer, 5, 500, 1000e6);
        
        uint256 tokenId = nft.freelancerTokenId(freelancer);
        
        // Complete more jobs, but not enough for Tier 2 (requires 20)
        vm.prank(escrowPlatform);
        nft.checkAndMint(freelancer, 15, 490, 2000e6);
        
        // Token ID and tier should remain identical; no new mints
        assertEq(nft.freelancerTokenId(freelancer), tokenId);
        assertEq(nft.currentTier(freelancer), 1);
        
        // But jobsCompleted counter does update
        assertEq(nft.jobsCompleted(freelancer), 15);
    }

    // ---------------------------------------------------------------------
    // Soulbound Tests
    // ---------------------------------------------------------------------

    function test_Soulbound_CannotTransfer() public {
        // Mint a token
        vm.prank(escrowPlatform);
        nft.checkAndMint(freelancer, 5, 500, 1000e6);
        
        uint256 tokenId = nft.freelancerTokenId(freelancer);
        
        // Attempt to transfer
        vm.prank(freelancer);
        vm.expectRevert(ReputationNFT.Soulbound.selector);
        nft.transferFrom(freelancer, makeAddr("receiver"), tokenId);
    }

    // ---------------------------------------------------------------------
    // View Tests
    // ---------------------------------------------------------------------

    function test_TierName() public {
        assertEq(nft.tierName(1), "Rising Talent");
        assertEq(nft.tierName(2), "Established Pro");
        assertEq(nft.tierName(3), "Expert");
        assertEq(nft.tierName(4), "Elite");
        assertEq(nft.tierName(5), "Legend");
        assertEq(nft.tierName(6), ""); // Non-existent tier
    }

    function test_TokenURI() public {
        // Mint a token
        vm.prank(escrowPlatform);
        nft.checkAndMint(freelancer, 5, 0, 0);
        uint256 tokenId = nft.freelancerTokenId(freelancer);
        
        // Empty base URI returns an empty string
        assertEq(nft.tokenURI(tokenId), "");
        
        // Set base URI
        vm.prank(owner);
        nft.setBaseURI("ipfs://baseURI/");
        
        // tokenURI should now concatenate baseURI and tokenId
        assertEq(nft.tokenURI(tokenId), "ipfs://baseURI/1");
        
        // Querying a non-existent token reverts
        vm.expectRevert(abi.encodeWithSelector(ReputationNFT.TokenDoesNotExist.selector, 999));
        nft.tokenURI(999);
    }
}
