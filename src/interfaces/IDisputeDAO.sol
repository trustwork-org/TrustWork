// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IDisputeDAO {
    function openDispute(
        uint256 jobId,
        uint256 milestoneIndex,
        address client,
        address freelancer,
        address raisedBy,
        string calldata evidenceCID,
        uint256 arbitratorFee,
        uint256 platformFee
    ) external returns (uint256);
}
