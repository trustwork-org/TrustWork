// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2771Context} from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title ReputationNFT
 * @notice Soulbound (non-transferable) ERC-721 representing a freelancer's
 *         reputation tier. Minted/upgraded by EscrowPlatform when the
 *         freelancer crosses a completed-jobs threshold.
 *
 *         Tiers:
 *           1 - "Rising Talent"     5 jobs
 *           2 - "Established Pro"  20 jobs
 *           3 - "Expert"           50 jobs
 *           4 - "Elite"           100 jobs
 *           5 - "Legend"          250 jobs
 *
 *         Tier upgrade burns the previous badge and mints a new one.
 *
 *         Soulbound enforcement: any wallet-to-wallet transfer reverts.
 *         Mint (from = address(0)) and burn (to = address(0)) are allowed.
 */
contract ReputationNFT is ERC721, ERC2771Context, Ownable {
    using Strings for uint256;

    uint256 public constant TIER_COUNT = 5;

    /// @notice Job-completion thresholds (ascending). thresholds[i] is the
    ///         minimum totalJobsDone required to reach tier (i+1).
    uint256[TIER_COUNT] public thresholds = [5, 20, 50, 100, 250];

    /// @notice Address of the EscrowPlatform contract authorised to mint/burn.
    address public escrowPlatform;

    /// @notice Optional base URI prepended to tokenId for off-chain metadata.
    string private _baseTokenURI;

    /// @notice Monotonic token id counter.
    uint256 private _nextTokenId = 1;

    struct TokenMeta {
        address freelancer;
        uint8 tier;
        uint256 jobsCompletedAtMint;
        uint256 averageRatingAtMint;
        uint256 totalEarnedAtMint;
        uint256 mintedAt;
    }

    mapping(address => uint256) public jobsCompleted;
    mapping(address => uint8) public currentTier;
    mapping(address => uint256) public freelancerTokenId;
    mapping(uint256 => TokenMeta) public tokenMeta;

    event EscrowPlatformSet(address indexed previous, address indexed current);
    event BaseURISet(string baseURI);
    event TierMinted(
        address indexed freelancer,
        uint256 indexed tokenId,
        uint8 tier,
        uint256 jobsCompleted,
        uint256 averageRating,
        uint256 totalEarned
    );
    event TierUpgraded(
        address indexed freelancer,
        uint256 indexed burnedTokenId,
        uint256 indexed newTokenId,
        uint8 fromTier,
        uint8 toTier
    );

    error NotEscrowPlatform();
    error Soulbound();
    error ZeroAddress();
    error TokenDoesNotExist(uint256 tokenId);

    modifier onlyEscrowPlatform() {
        if (_msgSender() != escrowPlatform) revert NotEscrowPlatform();
        _;
    }

    constructor(address trustedForwarder_, address initialOwner)
        ERC721("TrustWork Reputation", "TWREP")
        ERC2771Context(trustedForwarder_)
        Ownable(initialOwner)
    {}

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    /// @notice Set or update the EscrowPlatform address. Owner-only.
    function setEscrowPlatform(address newEscrow) external onlyOwner {
        if (newEscrow == address(0)) revert ZeroAddress();
        emit EscrowPlatformSet(escrowPlatform, newEscrow);
        escrowPlatform = newEscrow;
    }

    /// @notice Set the base URI used by tokenURI(). Owner-only.
    function setBaseURI(string calldata baseURI_) external onlyOwner {
        _baseTokenURI = baseURI_;
        emit BaseURISet(baseURI_);
    }

    // ---------------------------------------------------------------------
    // Mint / upgrade
    // ---------------------------------------------------------------------

    /**
     * @notice Called by EscrowPlatform after a freelancer completes a job.
     *         If the freelancer has crossed the next threshold, burns the
     *         old badge (if any) and mints a new tier badge.
     * @param freelancer    Wallet to credit.
     * @param totalJobsDone Cumulative completed-jobs count (authoritative).
     * @param avgRating     Average client rating (BPS or 0 if unused).
     * @param totalEarned   Cumulative USDC earned from completed jobs.
     */
    function checkAndMint(
        address freelancer,
        uint256 totalJobsDone,
        uint256 avgRating,
        uint256 totalEarned
    ) external onlyEscrowPlatform {
        if (freelancer == address(0)) revert ZeroAddress();

        jobsCompleted[freelancer] = totalJobsDone;

        uint8 eligibleTier = _eligibleTierFor(totalJobsDone);
        uint8 existingTier = currentTier[freelancer];

        if (eligibleTier <= existingTier) {
            // No tier change — nothing to do.
            return;
        }

        uint256 oldTokenId = freelancerTokenId[freelancer];
        if (existingTier > 0 && oldTokenId != 0) {
            _burn(oldTokenId);
            delete tokenMeta[oldTokenId];
        }

        uint256 newTokenId = _nextTokenId++;
        _safeMint(freelancer, newTokenId);

        tokenMeta[newTokenId] = TokenMeta({
            freelancer: freelancer,
            tier: eligibleTier,
            jobsCompletedAtMint: totalJobsDone,
            averageRatingAtMint: avgRating,
            totalEarnedAtMint: totalEarned,
            mintedAt: block.timestamp
        });

        currentTier[freelancer] = eligibleTier;
        freelancerTokenId[freelancer] = newTokenId;

        if (existingTier == 0) {
            emit TierMinted(freelancer, newTokenId, eligibleTier, totalJobsDone, avgRating, totalEarned);
        } else {
            emit TierUpgraded(freelancer, oldTokenId, newTokenId, existingTier, eligibleTier);
        }
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function tierName(uint8 tier) public pure returns (string memory) {
        if (tier == 1) return "Rising Talent";
        if (tier == 2) return "Established Pro";
        if (tier == 3) return "Expert";
        if (tier == 4) return "Elite";
        if (tier == 5) return "Legend";
        return "";
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist(tokenId);
        if (bytes(_baseTokenURI).length == 0) return "";
        return string.concat(_baseTokenURI, tokenId.toString());
    }

    function _eligibleTierFor(uint256 totalJobsDone) internal view returns (uint8) {
        uint8 tier;
        for (uint256 i = 0; i < TIER_COUNT; ++i) {
            if (totalJobsDone >= thresholds[i]) {
                tier = uint8(i + 1);
            } else {
                break;
            }
        }
        return tier;
    }

    // ---------------------------------------------------------------------
    // Soulbound enforcement (OZ v5: _update)
    // ---------------------------------------------------------------------

    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        // Permit mint (from == 0) and burn (to == 0); reject any wallet-to-wallet move.
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    // ---------------------------------------------------------------------
    // ERC-2771 / Context plumbing
    // ---------------------------------------------------------------------

    function _msgSender()
        internal
        view
        override(Context, ERC2771Context)
        returns (address)
    {
        return ERC2771Context._msgSender();
    }

    function _msgData()
        internal
        view
        override(Context, ERC2771Context)
        returns (bytes calldata)
    {
        return ERC2771Context._msgData();
    }

    function _contextSuffixLength()
        internal
        view
        override(Context, ERC2771Context)
        returns (uint256)
    {
        return ERC2771Context._contextSuffixLength();
    }
}
