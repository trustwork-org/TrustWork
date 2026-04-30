// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {ProfileRegistry} from "../src/modules/ProfileRegistry.sol";

contract ProfileRegistryTest is Test {
    ProfileRegistry public registry;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    string constant VALID_CID = "ipfs://QmValidCID1234567890";
    string constant UPDATED_CID = "ipfs://QmUpdatedCID0987654321";

    function setUp() public {
        registry = new ProfileRegistry();
    }

    // ---------------------------------------------------------------------
    // Registration Tests
    // ---------------------------------------------------------------------

    function test_RegisterProfile_HappyPath() public {
        vm.startPrank(alice);

        // Advance time to a known timestamp
        vm.warp(1000);
        registry.registerProfile(VALID_CID);

        vm.stopPrank();

        // Verify the profile state
        (
            string memory profileCID,
            uint256 registeredAt,
            uint256 updatedAt,
            bool registered
        ) = registry.getProfile(alice);

        assertEq(profileCID, VALID_CID);
        assertEq(registeredAt, 1000);
        assertEq(updatedAt, 1000); // Should be the same as registeredAt initially
        assertTrue(registered);
        assertTrue(registry.isRegistered(alice));
    }

    function test_RegisterProfile_RevertAlreadyRegistered() public {
        vm.startPrank(alice);

        // First registration succeeds
        registry.registerProfile(VALID_CID);

        // Second registration must fail
        vm.expectRevert(ProfileRegistry.AlreadyRegistered.selector);
        registry.registerProfile("ipfs://QmSomeOtherCID");

        vm.stopPrank();
    }

    function test_RegisterProfile_RevertEmptyCID() public {
        vm.startPrank(alice);

        // Cannot register with an empty string
        vm.expectRevert(ProfileRegistry.EmptyCID.selector);
        registry.registerProfile("");

        vm.stopPrank();
    }

    // ---------------------------------------------------------------------
    // Update Tests
    // ---------------------------------------------------------------------

    function test_UpdateProfile_HappyPath() public {
        vm.startPrank(alice);

        // Initial registration
        vm.warp(1000);
        registry.registerProfile(VALID_CID);

        // Advance time to simulate update at a later date
        vm.warp(2000);
        registry.updateProfile(UPDATED_CID);

        vm.stopPrank();

        // Verify the updated state
        (
            string memory profileCID,
            uint256 registeredAt,
            uint256 updatedAt,
            bool registered
        ) = registry.getProfile(alice);

        assertEq(profileCID, UPDATED_CID);
        assertEq(registeredAt, 1000); // registeredAt should NOT change
        assertEq(updatedAt, 2000); // updatedAt should reflect the new timestamp
        assertTrue(registered);
    }

    function test_UpdateProfile_RevertNotRegistered() public {
        vm.startPrank(alice);

        // Attempting to update a profile that was never registered
        vm.expectRevert(ProfileRegistry.NotRegistered.selector);
        registry.updateProfile(UPDATED_CID);

        vm.stopPrank();
    }

    function test_UpdateProfile_RevertEmptyCID() public {
        vm.startPrank(alice);

        registry.registerProfile(VALID_CID);

        // Cannot update to an empty string
        vm.expectRevert(ProfileRegistry.EmptyCID.selector);
        registry.updateProfile("");

        vm.stopPrank();
    }

    // ---------------------------------------------------------------------
    // View Tests
    // ---------------------------------------------------------------------

    function test_GetProfile_ReturnsEmptyForUnregistered() public {
        (
            string memory profileCID,
            uint256 registeredAt,
            uint256 updatedAt,
            bool registered
        ) = registry.getProfile(bob);

        assertEq(profileCID, "");
        assertEq(registeredAt, 0);
        assertEq(updatedAt, 0);
        assertFalse(registered);
        assertFalse(registry.isRegistered(bob));
    }
}
