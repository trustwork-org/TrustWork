// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IReputationNFT {
    function checkAndMint(
        address freelancer,
        uint256 totalJobsDone,
        uint256 avgRating,
        uint256 totalEarned
    ) external;
}
