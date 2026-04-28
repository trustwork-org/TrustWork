// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProfileRegistry
 * @notice Maps wallet addresses to off-chain (IPFS) profile metadata CIDs.
 *         The IPFS object stores: { name, role, skills[], bio, portfolioURL, ... }.
 *
 *         Profiles are self-sovereign: each wallet controls its own entry.
 *         No admin can write or delete on behalf of another wallet.
 */
contract ProfileRegistry {
    struct Profile {
        string profileCID;
        uint256 registeredAt;
        uint256 updatedAt;
        bool isRegistered;
    }

    mapping(address => Profile) private _profiles;

    event ProfileRegistered(address indexed user, string profileCID, uint256 timestamp);
    event ProfileUpdated(address indexed user, string profileCID, uint256 timestamp);

    error AlreadyRegistered();
    error NotRegistered();
    error EmptyCID();

    /**
     * @notice First-time profile registration for the caller.
     * @param profileCID Non-empty IPFS CID pointing to the profile JSON.
     */
    function registerProfile(string calldata profileCID) external {
        if (_profiles[msg.sender].isRegistered) revert AlreadyRegistered();
        if (bytes(profileCID).length == 0) revert EmptyCID();

        _profiles[msg.sender] = Profile({
            profileCID: profileCID,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp,
            isRegistered: true
        });

        emit ProfileRegistered(msg.sender, profileCID, block.timestamp);
    }

    /**
     * @notice Replace the IPFS CID for the caller's existing profile.
     */
    function updateProfile(string calldata profileCID) external {
        Profile storage p = _profiles[msg.sender];
        if (!p.isRegistered) revert NotRegistered();
        if (bytes(profileCID).length == 0) revert EmptyCID();

        p.profileCID = profileCID;
        p.updatedAt = block.timestamp;

        emit ProfileUpdated(msg.sender, profileCID, block.timestamp);
    }

    /**
     * @notice Read a profile entry.
     * @return profileCID    The stored IPFS CID (empty string if not registered).
     * @return registeredAt  Block timestamp at first registration.
     * @return updatedAt     Block timestamp of last update.
     * @return registered    Whether the address has ever registered.
     */
    function getProfile(address user)
        external
        view
        returns (string memory profileCID, uint256 registeredAt, uint256 updatedAt, bool registered)
    {
        Profile storage p = _profiles[user];
        return (p.profileCID, p.registeredAt, p.updatedAt, p.isRegistered);
    }

    function isRegistered(address user) external view returns (bool) {
        return _profiles[user].isRegistered;
    }
}
