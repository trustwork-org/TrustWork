// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal interface DisputeDAO uses to call back into EscrowPlatform.
///         winner is encoded as 1 = CLIENT, 2 = FREELANCER.
interface IEscrowPlatform {
    function releaseFundsAfterDispute(
        uint256 jobId,
        uint256 milestoneIndex,
        uint8 winner,
        address[] calldata majorityArbitrators
    ) external;
}
