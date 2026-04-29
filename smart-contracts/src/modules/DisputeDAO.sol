// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ERC2771Context} from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IEscrowPlatform} from "../interfaces/IEscrowPlatform.sol";

/**
 * @title DisputeDAO
 * @notice Receives the dispute fee from EscrowPlatform when a dispute is
 *         raised, runs a 2-day arbitrator vote, distributes rewards/slashes,
 *         and calls back into EscrowPlatform to release the locked 92% of
 *         the milestone to the winning party.
 *
 *         Vote encoding (must match EscrowPlatform):
 *           1 = CLIENT_WINS
 *           2 = FREELANCER_WINS
 *
 *         Tie / no-vote default: FREELANCER (work was submitted on-chain).
 *         Unclaimed arbitrator fee (when zero votes are cast) is forwarded
 *         to platformTreasury.
 */
contract DisputeDAO is ERC2771Context, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Constants
    // ---------------------------------------------------------------------

    uint8 public constant VOTE_CLIENT = 1;
    uint8 public constant VOTE_FREELANCER = 2;
    uint8 public constant ARBITRATORS_PER_DISPUTE = 3;
    uint256 public constant SLASH_PERCENT = 10; // 10% of stake

    uint256 public constant MIN_VOTING_PERIOD = 10 minutes;
    uint256 public constant MAX_VOTING_PERIOD = 7 days;
    uint256 public constant MIN_ARBITRATOR_STAKE = 10_000_000; // 10 USDC (6 dp)
    uint256 public constant MAX_ARBITRATOR_STAKE = 1_000_000_000; // 1000 USDC

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    enum DisputeStatus {
        NONE,
        VOTING,
        RESOLVED
    }

    struct Dispute {
        uint256 jobId;
        uint256 milestoneIndex;
        address client;
        address freelancer;
        address raisedBy;
        string partyAEvidenceCID; // raisedBy's evidence (set at openDispute)
        string partyBEvidenceCID; // counterparty's evidence (submitted later)
        uint256 arbitratorFee; // 6% of milestone amount, held for distribution
        uint256 platformFee; // 2% of milestone amount, forwarded to treasury
        uint8 votesForClient;
        uint8 votesForFreelancer;
        DisputeStatus status;
        uint256 deadline;
        address[ARBITRATORS_PER_DISPUTE] assignedArbitrators;
        mapping(address => bool) hasVoted;
        mapping(address => uint8) votes;
    }

    IERC20 public immutable usdcToken;
    address public escrowPlatform;
    address public platformTreasury;

    uint256 public disputeCounter;
    uint256 public votingPeriod = 10 minutes; // testnet-friendly initial value; bump before mainnet
    uint256 public minStake = 10_000_000; // 10 USDC (6 dp) — testnet-friendly initial value

    /// @notice Active arbitrator addresses. Indexed positions are NOT stable
    ///         — entries are removed via swap-and-pop in leave/auto-eviction.
    address[] public arbitratorPool;

    /// @notice 1-indexed position in arbitratorPool. 0 means not in pool.
    mapping(address => uint256) private _arbitratorIndex;
    mapping(address => uint256) public arbitratorStake;
    mapping(address => bool) public arbitratorBusy;

    mapping(uint256 => Dispute) private _disputes;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event EscrowPlatformSet(address indexed previous, address indexed current);
    event PlatformTreasurySet(
        address indexed previous,
        address indexed current
    );
    event VotingPeriodSet(uint256 previous, uint256 current);
    event MinStakeSet(uint256 previous, uint256 current);

    event ArbitratorJoined(address indexed arbitrator, uint256 stake);
    event ArbitratorLeft(address indexed arbitrator, uint256 stakeReturned);
    event ArbitratorEvicted(address indexed arbitrator, uint256 remainingStake);
    event ArbitratorSlashed(
        address indexed arbitrator,
        uint256 amount,
        string reason
    );

    event DisputeOpened(
        uint256 indexed disputeId,
        uint256 indexed jobId,
        uint256 milestoneIndex,
        address indexed raisedBy,
        address[ARBITRATORS_PER_DISPUTE] arbitrators,
        uint256 deadline
    );
    event EvidenceSubmitted(
        uint256 indexed disputeId,
        address indexed party,
        string evidenceCID
    );
    event VoteSubmitted(
        uint256 indexed disputeId,
        address indexed arbitrator,
        uint8 vote
    );
    event DisputeResolved(
        uint256 indexed disputeId,
        uint8 winner,
        address[] majorityArbitrators,
        uint256 perArbitratorReward
    );

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error ZeroAddress();
    error NotEscrowPlatform();
    error InvalidVotingPeriod();
    error InvalidStake();
    error AlreadyInPool();
    error NotInPool();
    error ArbitratorIsBusy();
    error InsufficientArbitrators(uint256 eligible);
    error DisputeNotFound();
    error WrongStatus();
    error VotingClosed();
    error VotingStillOpen();
    error NotAssignedArbitrator();
    error AlreadyVoted();
    error InvalidVote();
    error NotADisputeParty();
    error EvidenceAlreadySubmitted();

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor(
        address usdcToken_,
        address platformTreasury_,
        address trustedForwarder_,
        address initialOwner
    ) ERC2771Context(trustedForwarder_) Ownable(initialOwner) {
        if (usdcToken_ == address(0) || platformTreasury_ == address(0))
            revert ZeroAddress();
        usdcToken = IERC20(usdcToken_);
        platformTreasury = platformTreasury_;
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function setEscrowPlatform(address newEscrow) external onlyOwner {
        if (newEscrow == address(0)) revert ZeroAddress();
        emit EscrowPlatformSet(escrowPlatform, newEscrow);
        escrowPlatform = newEscrow;
    }

    function setPlatformTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit PlatformTreasurySet(platformTreasury, newTreasury);
        platformTreasury = newTreasury;
    }

    function setVotingPeriod(uint256 newPeriod) external onlyOwner {
        if (newPeriod < MIN_VOTING_PERIOD || newPeriod > MAX_VOTING_PERIOD)
            revert InvalidVotingPeriod();
        emit VotingPeriodSet(votingPeriod, newPeriod);
        votingPeriod = newPeriod;
    }

    function setMinStake(uint256 newMinStake) external onlyOwner {
        if (
            newMinStake < MIN_ARBITRATOR_STAKE ||
            newMinStake > MAX_ARBITRATOR_STAKE
        ) revert InvalidStake();
        emit MinStakeSet(minStake, newMinStake);
        minStake = newMinStake;
    }

    // ---------------------------------------------------------------------
    // Arbitrator pool management
    // ---------------------------------------------------------------------

    /// @notice Stake the current `minStake` in USDC and join the arbitrator pool.
    function joinArbitratorPool() external nonReentrant {
        address sender = _msgSender();
        if (_arbitratorIndex[sender] != 0) revert AlreadyInPool();

        uint256 stakeAmount = minStake;
        usdcToken.safeTransferFrom(sender, address(this), stakeAmount);

        arbitratorPool.push(sender);
        _arbitratorIndex[sender] = arbitratorPool.length; // 1-indexed
        arbitratorStake[sender] = stakeAmount;

        emit ArbitratorJoined(sender, stakeAmount);
    }

    /// @notice Withdraw remaining stake and exit. Reverts if currently
    ///         assigned to an unresolved dispute.
    function leaveArbitratorPool() external nonReentrant {
        address sender = _msgSender();
        if (_arbitratorIndex[sender] == 0) revert NotInPool();
        if (arbitratorBusy[sender]) revert ArbitratorIsBusy();

        uint256 refund = arbitratorStake[sender];
        _removeFromPool(sender);

        if (refund > 0) {
            usdcToken.safeTransfer(sender, refund);
        }
        emit ArbitratorLeft(sender, refund);
    }

    function arbitratorPoolSize() external view returns (uint256) {
        return arbitratorPool.length;
    }

    function isArbitrator(address account) external view returns (bool) {
        return _arbitratorIndex[account] != 0;
    }

    // ---------------------------------------------------------------------
    // Dispute lifecycle
    // ---------------------------------------------------------------------

    /**
     * @notice Open a new dispute. Only callable by the registered EscrowPlatform.
     *         EscrowPlatform must have already transferred (arbitratorFee + platformFee)
     *         USDC to this contract before this call.
     */
    function openDispute(
        uint256 jobId,
        uint256 milestoneIndex,
        address client,
        address freelancer,
        address raisedBy,
        string calldata evidenceCID,
        uint256 arbitratorFee,
        uint256 platformFee
    ) external returns (uint256 disputeId) {
        if (msg.sender != escrowPlatform) revert NotEscrowPlatform();
        if (client == address(0) || freelancer == address(0))
            revert ZeroAddress();
        if (raisedBy != client && raisedBy != freelancer)
            revert NotADisputeParty();

        // Pick 3 arbitrators excluding the disputants and any currently busy.
        address[ARBITRATORS_PER_DISPUTE] memory selected = _selectArbitrators(
            client,
            freelancer,
            ++disputeCounter
        );

        disputeId = disputeCounter;
        Dispute storage d = _disputes[disputeId];
        d.jobId = jobId;
        d.milestoneIndex = milestoneIndex;
        d.client = client;
        d.freelancer = freelancer;
        d.raisedBy = raisedBy;
        d.partyAEvidenceCID = evidenceCID;
        d.arbitratorFee = arbitratorFee;
        d.platformFee = platformFee;
        d.status = DisputeStatus.VOTING;
        d.deadline = block.timestamp + votingPeriod;

        for (uint256 i = 0; i < ARBITRATORS_PER_DISPUTE; ++i) {
            d.assignedArbitrators[i] = selected[i];
            arbitratorBusy[selected[i]] = true;
        }

        emit DisputeOpened(
            disputeId,
            jobId,
            milestoneIndex,
            raisedBy,
            selected,
            d.deadline
        );
    }

    /**
     * @notice Either the client or the freelancer of the disputed job submits
     *         their evidence IPFS CID.
     */
    function submitEvidence(
        uint256 disputeId,
        string calldata evidenceCID
    ) external {
        Dispute storage d = _disputes[disputeId];
        if (d.status != DisputeStatus.VOTING) revert WrongStatus();
        if (block.timestamp > d.deadline) revert VotingClosed();

        address sender = _msgSender();
        if (sender != d.client && sender != d.freelancer)
            revert NotADisputeParty();

        if (sender == d.raisedBy) {
            // raisedBy is amending their evidence pre-deadline — allowed.
            d.partyAEvidenceCID = evidenceCID;
        } else {
            d.partyBEvidenceCID = evidenceCID;
        }

        emit EvidenceSubmitted(disputeId, sender, evidenceCID);
    }

    /**
     * @notice Submit a vote: 1 = CLIENT_WINS, 2 = FREELANCER_WINS.
     */
    function submitVote(uint256 disputeId, uint8 vote) external {
        if (vote != VOTE_CLIENT && vote != VOTE_FREELANCER)
            revert InvalidVote();

        Dispute storage d = _disputes[disputeId];
        if (d.status != DisputeStatus.VOTING) revert WrongStatus();
        if (block.timestamp > d.deadline) revert VotingClosed();

        address sender = _msgSender();
        if (!_isAssigned(d, sender)) revert NotAssignedArbitrator();
        if (d.hasVoted[sender]) revert AlreadyVoted();

        d.hasVoted[sender] = true;
        d.votes[sender] = vote;
        if (vote == VOTE_CLIENT) {
            ++d.votesForClient;
        } else {
            ++d.votesForFreelancer;
        }

        emit VoteSubmitted(disputeId, sender, vote);
    }

    /**
     * @notice Tally votes and finalise. Callable by anyone after the deadline.
     *         Distributes rewards/slashes, forwards platform fee, and triggers
     *         EscrowPlatform.releaseFundsAfterDispute().
     */
    function resolveDispute(uint256 disputeId) external nonReentrant {
        Dispute storage d = _disputes[disputeId];
        if (d.status != DisputeStatus.VOTING) revert WrongStatus();
        if (block.timestamp <= d.deadline) revert VotingStillOpen();

        // Determine winner. Tie or zero votes → FREELANCER (work was submitted).
        uint8 winner = d.votesForClient > d.votesForFreelancer
            ? VOTE_CLIENT
            : VOTE_FREELANCER;

        // Walk the 3 arbitrators, classifying each.
        address[] memory majority = new address[](ARBITRATORS_PER_DISPUTE);
        uint256 majorityCount;

        for (uint256 i = 0; i < ARBITRATORS_PER_DISPUTE; ++i) {
            address arb = d.assignedArbitrators[i];
            arbitratorBusy[arb] = false;

            if (!d.hasVoted[arb]) {
                _slashArbitrator(arb, "non-voter");
                continue;
            }

            if (d.votes[arb] == winner) {
                majority[majorityCount++] = arb;
            } else {
                _slashArbitrator(arb, "minority-vote");
            }
        }

        // Trim majority array to the actual length.
        assembly {
            mstore(majority, majorityCount)
        }

        // Distribute the arbitrator fee.
        uint256 perArbitratorReward;
        if (majorityCount == 0) {
            // No votes cast (or only one party voted incorrectly is impossible
            // since vote == winner by construction means majority has at least 1).
            // The only path here: zero votes cast at all → forward fee to treasury.
            usdcToken.safeTransfer(platformTreasury, d.arbitratorFee);
        } else {
            perArbitratorReward = d.arbitratorFee / majorityCount;
            // Pay each majority voter the equal share.
            for (uint256 i = 0; i < majorityCount; ++i) {
                usdcToken.safeTransfer(majority[i], perArbitratorReward);
            }
            // Forward dust (from integer division) to treasury.
            uint256 dust = d.arbitratorFee -
                (perArbitratorReward * majorityCount);
            if (dust > 0) {
                usdcToken.safeTransfer(platformTreasury, dust);
            }
        }

        // Forward the platform fee.
        if (d.platformFee > 0) {
            usdcToken.safeTransfer(platformTreasury, d.platformFee);
        }

        d.status = DisputeStatus.RESOLVED;

        emit DisputeResolved(disputeId, winner, majority, perArbitratorReward);

        // Final external call — state is already finalised; reentrancy guard
        // covers the slash/transfer block above.
        IEscrowPlatform(escrowPlatform).releaseFundsAfterDispute(
            d.jobId,
            d.milestoneIndex,
            winner,
            majority
        );
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    function _isAssigned(
        Dispute storage d,
        address account
    ) internal view returns (bool) {
        for (uint256 i = 0; i < ARBITRATORS_PER_DISPUTE; ++i) {
            if (d.assignedArbitrators[i] == account) return true;
        }
        return false;
    }

    function _slashArbitrator(address arb, string memory reason) internal {
        uint256 stake = arbitratorStake[arb];
        if (stake == 0) return;
        uint256 amount = (stake * SLASH_PERCENT) / 100;
        if (amount == 0) return;

        arbitratorStake[arb] = stake - amount;
        usdcToken.safeTransfer(platformTreasury, amount);
        emit ArbitratorSlashed(arb, amount, reason);

        // Auto-evict if their stake fell below the join threshold.
        if (arbitratorStake[arb] < minStake && _arbitratorIndex[arb] != 0) {
            uint256 remaining = arbitratorStake[arb];
            _removeFromPool(arb);
            if (remaining > 0) {
                usdcToken.safeTransfer(arb, remaining);
            }
            emit ArbitratorEvicted(arb, remaining);
        }
    }

    function _removeFromPool(address arb) internal {
        uint256 idx1 = _arbitratorIndex[arb]; // 1-indexed
        uint256 lastIdx = arbitratorPool.length;
        if (idx1 != lastIdx) {
            address last = arbitratorPool[lastIdx - 1];
            arbitratorPool[idx1 - 1] = last;
            _arbitratorIndex[last] = idx1;
        }
        arbitratorPool.pop();
        delete _arbitratorIndex[arb];
        delete arbitratorStake[arb];
    }

    /**
     * @dev Pseudo-random selection of 3 unique eligible arbitrators.
     *      Eligible = in pool, not currently busy, not the disputants.
     *      Uses block.prevrandao + timestamp + disputeId as entropy.
     *      MVP-grade randomness; manipulable by a single-block proposer.
     *      Post-MVP: switch to Chainlink VRF.
     */
    function _selectArbitrators(
        address client,
        address freelancer,
        uint256 disputeId
    ) internal view returns (address[ARBITRATORS_PER_DISPUTE] memory chosen) {
        uint256 poolLen = arbitratorPool.length;

        // Build eligible set in memory (cap at poolLen).
        address[] memory eligible = new address[](poolLen);
        uint256 n;
        for (uint256 i = 0; i < poolLen; ++i) {
            address a = arbitratorPool[i];
            if (a == client || a == freelancer) continue;
            if (arbitratorBusy[a]) continue;
            if (arbitratorStake[a] < minStake) continue;
            eligible[n++] = a;
        }

        if (n < ARBITRATORS_PER_DISPUTE) revert InsufficientArbitrators(n);

        uint256 seed = uint256(
            keccak256(
                abi.encodePacked(block.prevrandao, block.timestamp, disputeId)
            )
        );

        // Pick 3 unique by Fisher-Yates-style swap-and-shrink.
        for (uint256 k = 0; k < ARBITRATORS_PER_DISPUTE; ++k) {
            uint256 pick = seed % n;
            chosen[k] = eligible[pick];
            // Swap picked into the tail and shrink window.
            eligible[pick] = eligible[n - 1];
            unchecked {
                --n;
            }
            seed = uint256(keccak256(abi.encodePacked(seed, k)));
        }
    }

    // ---------------------------------------------------------------------
    // External views (struct contains mappings, so no auto-getter)
    // ---------------------------------------------------------------------

    function getDisputeCore(
        uint256 disputeId
    )
        external
        view
        returns (
            uint256 jobId,
            uint256 milestoneIndex,
            address client,
            address freelancer,
            address raisedBy,
            DisputeStatus status,
            uint256 deadline
        )
    {
        Dispute storage d = _disputes[disputeId];
        if (d.status == DisputeStatus.NONE) revert DisputeNotFound();
        return (
            d.jobId,
            d.milestoneIndex,
            d.client,
            d.freelancer,
            d.raisedBy,
            d.status,
            d.deadline
        );
    }

    function getDisputeEvidence(
        uint256 disputeId
    )
        external
        view
        returns (
            string memory partyAEvidenceCID,
            string memory partyBEvidenceCID
        )
    {
        Dispute storage d = _disputes[disputeId];
        if (d.status == DisputeStatus.NONE) revert DisputeNotFound();
        return (d.partyAEvidenceCID, d.partyBEvidenceCID);
    }

    function getDisputeFees(
        uint256 disputeId
    ) external view returns (uint256 arbitratorFee, uint256 platformFee) {
        Dispute storage d = _disputes[disputeId];
        if (d.status == DisputeStatus.NONE) revert DisputeNotFound();
        return (d.arbitratorFee, d.platformFee);
    }

    function getDisputeTally(
        uint256 disputeId
    ) external view returns (uint8 votesForClient, uint8 votesForFreelancer) {
        Dispute storage d = _disputes[disputeId];
        if (d.status == DisputeStatus.NONE) revert DisputeNotFound();
        return (d.votesForClient, d.votesForFreelancer);
    }

    function getDisputeArbitrators(
        uint256 disputeId
    )
        external
        view
        returns (address[ARBITRATORS_PER_DISPUTE] memory assignedArbitrators)
    {
        Dispute storage d = _disputes[disputeId];
        if (d.status == DisputeStatus.NONE) revert DisputeNotFound();
        return d.assignedArbitrators;
    }

    function hasArbitratorVoted(
        uint256 disputeId,
        address arb
    ) external view returns (bool) {
        return _disputes[disputeId].hasVoted[arb];
    }

    function arbitratorVote(
        uint256 disputeId,
        address arb
    ) external view returns (uint8) {
        return _disputes[disputeId].votes[arb];
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
