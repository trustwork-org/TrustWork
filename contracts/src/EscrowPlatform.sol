// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ERC2771Context} from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

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

interface IReputationNFT {
    function checkAndMint(
        address freelancer,
        uint256 totalJobsDone,
        uint256 avgRating,
        uint256 totalEarned
    ) external;
}

/**
 * @title EscrowPlatform
 * @notice Core TrustWork escrow contract. Holds client deposits, tracks
 *         milestone-based releases, routes disputes to DisputeDAO, and
 *         credits freelancer reputation on completion.
 *
 *         Fee model (immutable BPS):
 *           - 2%  client fee (held in contract; forwarded to treasury at
 *                 first milestone approval, dispute resolution, or refunded
 *                 to client on cancellation)
 *           - 8%  freelancer fee per milestone (split: 6% arbitrators + 2%
 *                 treasury during a dispute; 8% treasury on happy path)
 *
 *         Vote codes (must match DisputeDAO):
 *           1 = CLIENT, 2 = FREELANCER
 *
 *         IMPORTANT IMPLEMENTATION NOTES:
 *           - usdcToken is immutable. Replacing the underlying token would
 *             orphan every existing escrow balance, so no setter is exposed.
 *           - clientFee is held in escrow until the first milestone is
 *             approved (or the job is otherwise terminated). This is the
 *             only safe way to honour the architecture's "refund clientFee
 *             on cancel" requirement, since the contract cannot pull funds
 *             back from the treasury once forwarded.
 */
contract EscrowPlatform is ERC2771Context, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =====================================================================
    // Constants
    // =====================================================================

    uint256 public constant BPS_DENOMINATOR     = 10_000;
    uint256 public constant CLIENT_FEE_BPS      = 200;   // 2%
    uint256 public constant FREELANCER_FEE_BPS  = 800;   // 8%
    uint256 public constant DISPUTE_ARB_BPS     = 600;   // 6%
    uint256 public constant DISPUTE_PLAT_BPS    = 200;   // 2%

    uint256 public constant MIN_FEE_PERCENT = 1;
    uint256 public constant MAX_FEE_PERCENT = 8;

    uint256 public constant FLAGS_FOR_BAN = 3;
    uint256 public constant RESCUE_GRACE_PERIOD = 30 days;

    uint8 public constant WINNER_CLIENT     = 1;
    uint8 public constant WINNER_FREELANCER = 2;

    // =====================================================================
    // Enums
    // =====================================================================

    enum JobCategory {
        OTHERS,                    // 0 = default zero value
        WEB_DEVELOPMENT,
        MOBILE_DEVELOPMENT,
        SMART_CONTRACT_DEVELOPMENT,
        UI_UX_DESIGN,
        GRAPHIC_DESIGN,
        CONTENT_WRITING,
        COPYWRITING,
        DIGITAL_MARKETING,
        DATA_SCIENCE,
        VIDEO_EDITING,
        AUDIO_PRODUCTION,
        TRANSLATION,
        VIRTUAL_ASSISTANT
    }

    enum JobStatus {
        NONE,        // 0 = job does not exist
        OPEN,
        ACTIVE,
        DISPUTED,
        COMPLETED,
        CLOSED,
        CANCELLED
    }

    enum MilestoneStatus {
        PENDING,         // 0 = default
        SUBMITTED,
        RELEASED,
        DISPUTED,
        CLIENT_WON,
        FREELANCER_WON
    }

    // =====================================================================
    // Structs
    // =====================================================================

    struct Job {
        uint256 jobId;
        address client;
        address freelancer;       // address(0) until approveApplicant
        uint256 depositAmount;    // total USDC client put in
        uint256 clientFee;        // 2% of depositAmount
        uint256 availableForWork; // depositAmount - clientFee (= 98%)
        uint256 amountReleased;   // running total paid to freelancer
        bool poorWorkReported;
        bool clientFeeForwarded;  // true once 2% has left the contract
        JobCategory category;
        JobStatus status;
        uint256 createdAt;
        uint256 deadline;
    }

    struct Milestone {
        string description;
        uint256 amount;
        uint256 deadline;
        string submissionNote;
        MilestoneStatus status;
    }

    // =====================================================================
    // Storage
    // =====================================================================

    IERC20 public immutable usdcToken;

    address public disputeDAO;
    address public reputationNFT;
    address public profileRegistry;
    address public platformTreasury;
    address public governance; // can adjust feePercent within bounds
    address public multisig;   // can pause and rotate critical addresses

    uint256 public jobCounter;
    uint256 public feePercent = 5; // DAO-tunable within [MIN_FEE_PERCENT, MAX_FEE_PERCENT]

    mapping(uint256 => Job) private _jobs;
    mapping(uint256 => Milestone[]) private _jobMilestones;
    mapping(uint256 => address[]) private _jobApplicants;
    mapping(uint256 => mapping(address => bool)) public hasApplied;
    mapping(uint256 => uint256) public jobBalance; // remaining USDC held for each job

    mapping(address => uint256[]) private _clientJobs;
    mapping(address => uint256[]) private _freelancerJobs;

    mapping(address => uint256) public freelancerFlags;
    mapping(address => bool) public bannedFreelancers;

    // Reputation tracking forwarded to ReputationNFT.checkAndMint
    mapping(address => uint256) public freelancerCompletedJobs;
    mapping(address => uint256) public freelancerTotalEarned;

    // =====================================================================
    // Events
    // =====================================================================

    event JobCreated(
        uint256 indexed jobId,
        address indexed client,
        JobCategory category,
        uint256 depositAmount,
        uint256 clientFee,
        uint256 availableForWork,
        uint256 deadline
    );
    event AppliedToJob(uint256 indexed jobId, address indexed freelancer);
    event ApplicantApproved(uint256 indexed jobId, address indexed freelancer);
    event MilestoneSubmitted(uint256 indexed jobId, uint256 indexed milestoneIndex, string submissionNote);
    event MilestoneApproved(
        uint256 indexed jobId,
        uint256 indexed milestoneIndex,
        uint256 platformShare,
        uint256 freelancerShare
    );
    event MilestoneRejected(uint256 indexed jobId, uint256 indexed milestoneIndex);
    event DisputeRaised(
        uint256 indexed jobId,
        uint256 indexed milestoneIndex,
        address indexed raisedBy,
        uint256 disputeId,
        uint256 arbitratorFee,
        uint256 platformFee
    );
    event PoorWorkReported(uint256 indexed jobId, address indexed freelancer);
    event JobCancelled(uint256 indexed jobId, uint256 refundedToClient);
    event JobRescued(uint256 indexed jobId, uint256 refundedToClient);
    event JobCompleted(uint256 indexed jobId, address indexed freelancer);
    event JobClosedAfterDispute(uint256 indexed jobId, uint8 winner);
    event ClientFeeForwarded(uint256 indexed jobId, uint256 amount);
    event FreelancerFlagged(address indexed freelancer, uint256 totalFlags);
    event FreelancerBanned(address indexed freelancer);

    event FeePercentSet(uint256 previous, uint256 current);
    event PlatformTreasurySet(address indexed previous, address indexed current);
    event DisputeDAOSet(address indexed previous, address indexed current);
    event ReputationNFTSet(address indexed previous, address indexed current);
    event ProfileRegistrySet(address indexed previous, address indexed current);
    event GovernanceSet(address indexed previous, address indexed current);
    event MultisigSet(address indexed previous, address indexed current);

    // =====================================================================
    // Errors
    // =====================================================================

    error ZeroAddress();
    error ZeroAmount();
    error EmptyMilestones();
    error ArrayLengthMismatch();
    error MilestoneSumExceedsBudget();
    error InvalidDeadline();
    error InvalidFeePercent();
    error JobNotFound();
    error WrongJobStatus();
    error WrongMilestoneStatus();
    error MilestoneIndexOOB();
    error MilestoneAlreadyDisputed();
    error NotClient();
    error NotFreelancer();
    error NotDisputeDAO();
    error NotMultisig();
    error NotGovernance();
    error ClientCannotApply();
    error FreelancerIsBanned();
    error AlreadyApplied();
    error ApplicantNotFound();
    error CannotCancelInState();
    error RescueConditionsUnmet();

    // =====================================================================
    // Modifiers
    // =====================================================================

    modifier onlyClient(uint256 jobId) {
        if (_msgSender() != _jobs[jobId].client) revert NotClient();
        _;
    }

    modifier onlyFreelancer(uint256 jobId) {
        if (_msgSender() != _jobs[jobId].freelancer) revert NotFreelancer();
        _;
    }

    modifier onlyDisputeDAO() {
        if (msg.sender != disputeDAO) revert NotDisputeDAO();
        _;
    }

    modifier onlyMultisig() {
        if (_msgSender() != multisig) revert NotMultisig();
        _;
    }

    modifier onlyGovernance() {
        if (_msgSender() != governance) revert NotGovernance();
        _;
    }

    modifier jobExists(uint256 jobId) {
        if (_jobs[jobId].status == JobStatus.NONE) revert JobNotFound();
        _;
    }

    // =====================================================================
    // Constructor
    // =====================================================================

    constructor(
        address usdcToken_,
        address platformTreasury_,
        address governance_,
        address multisig_,
        address trustedForwarder_
    ) ERC2771Context(trustedForwarder_) {
        if (
            usdcToken_ == address(0) ||
            platformTreasury_ == address(0) ||
            governance_ == address(0) ||
            multisig_ == address(0)
        ) revert ZeroAddress();

        usdcToken = IERC20(usdcToken_);
        platformTreasury = platformTreasury_;
        governance = governance_;
        multisig = multisig_;
    }

    // =====================================================================
    // Admin: governance (fee tuning)
    // =====================================================================

    function setFeePercent(uint256 newFee) external onlyGovernance {
        if (newFee < MIN_FEE_PERCENT || newFee > MAX_FEE_PERCENT) revert InvalidFeePercent();
        emit FeePercentSet(feePercent, newFee);
        feePercent = newFee;
    }

    function setGovernance(address newGov) external onlyGovernance {
        if (newGov == address(0)) revert ZeroAddress();
        emit GovernanceSet(governance, newGov);
        governance = newGov;
    }

    // =====================================================================
    // Admin: multisig (emergency + critical wiring)
    // =====================================================================

    function pause() external onlyMultisig {
        _pause();
    }

    function unpause() external onlyMultisig {
        _unpause();
    }

    function setPlatformTreasury(address newTreasury) external onlyMultisig {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit PlatformTreasurySet(platformTreasury, newTreasury);
        platformTreasury = newTreasury;
    }

    /// @notice Wire DisputeDAO. Must be paused for safety (active disputes
    ///         routing to a stale address would orphan funds).
    function setDisputeDAO(address newDAO) external onlyMultisig whenPaused {
        if (newDAO == address(0)) revert ZeroAddress();
        emit DisputeDAOSet(disputeDAO, newDAO);
        disputeDAO = newDAO;
    }

    function setReputationNFT(address newNFT) external onlyMultisig whenPaused {
        if (newNFT == address(0)) revert ZeroAddress();
        emit ReputationNFTSet(reputationNFT, newNFT);
        reputationNFT = newNFT;
    }

    function setProfileRegistry(address newRegistry) external onlyMultisig whenPaused {
        if (newRegistry == address(0)) revert ZeroAddress();
        emit ProfileRegistrySet(profileRegistry, newRegistry);
        profileRegistry = newRegistry;
    }

    function setMultisig(address newMultisig) external onlyMultisig {
        if (newMultisig == address(0)) revert ZeroAddress();
        emit MultisigSet(multisig, newMultisig);
        multisig = newMultisig;
    }

    // =====================================================================
    // Job creation & application
    // =====================================================================

    /**
     * @notice Create and fund a job in a single call.
     * @param descriptions  Per-milestone description strings.
     * @param amounts       Per-milestone USDC amounts. sum(amounts) <= 98% of depositAmount.
     * @param deadline      Job deadline (also applied to all milestones for MVP).
     * @param category      Job category enum.
     * @param depositAmount Total USDC the client transfers in. Must be > 0.
     */
    function createJob(
        string[] calldata descriptions,
        uint256[] calldata amounts,
        uint256 deadline,
        JobCategory category,
        uint256 depositAmount
    ) external whenNotPaused nonReentrant returns (uint256 jobId) {
        address client = _msgSender();
        if (bannedFreelancers[client]) revert FreelancerIsBanned();
        if (depositAmount == 0) revert ZeroAmount();
        if (descriptions.length == 0) revert EmptyMilestones();
        if (descriptions.length != amounts.length) revert ArrayLengthMismatch();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        uint256 clientFee = (depositAmount * CLIENT_FEE_BPS) / BPS_DENOMINATOR;
        uint256 availableForWork = depositAmount - clientFee;

        uint256 milestoneSum;
        for (uint256 i = 0; i < amounts.length; ++i) {
            if (amounts[i] == 0) revert ZeroAmount();
            milestoneSum += amounts[i];
        }
        if (milestoneSum > availableForWork) revert MilestoneSumExceedsBudget();

        // Pull funds before recording state to ensure transfer succeeds.
        usdcToken.safeTransferFrom(client, address(this), depositAmount);

        jobId = ++jobCounter;
        Job storage j = _jobs[jobId];
        j.jobId = jobId;
        j.client = client;
        j.depositAmount = depositAmount;
        j.clientFee = clientFee;
        j.availableForWork = availableForWork;
        j.category = category;
        j.status = JobStatus.OPEN;
        j.createdAt = block.timestamp;
        j.deadline = deadline;

        Milestone[] storage ms = _jobMilestones[jobId];
        for (uint256 i = 0; i < amounts.length; ++i) {
            ms.push(Milestone({
                description: descriptions[i],
                amount: amounts[i],
                deadline: deadline,
                submissionNote: "",
                status: MilestoneStatus.PENDING
            }));
        }

        _clientJobs[client].push(jobId);
        jobBalance[jobId] = depositAmount;

        emit JobCreated(jobId, client, category, depositAmount, clientFee, availableForWork, deadline);
    }

    function applyToJob(uint256 jobId) external whenNotPaused jobExists(jobId) {
        Job storage j = _jobs[jobId];
        address sender = _msgSender();

        if (j.status != JobStatus.OPEN) revert WrongJobStatus();
        if (sender == j.client) revert ClientCannotApply();
        if (bannedFreelancers[sender]) revert FreelancerIsBanned();
        if (hasApplied[jobId][sender]) revert AlreadyApplied();

        hasApplied[jobId][sender] = true;
        _jobApplicants[jobId].push(sender);

        emit AppliedToJob(jobId, sender);
    }

    function approveApplicant(uint256 jobId, address freelancer)
        external
        whenNotPaused
        nonReentrant
        jobExists(jobId)
        onlyClient(jobId)
    {
        Job storage j = _jobs[jobId];
        if (j.status != JobStatus.OPEN) revert WrongJobStatus();
        if (!hasApplied[jobId][freelancer]) revert ApplicantNotFound();
        if (bannedFreelancers[freelancer]) revert FreelancerIsBanned();

        j.freelancer = freelancer;
        j.status = JobStatus.ACTIVE;
        _freelancerJobs[freelancer].push(jobId);

        emit ApplicantApproved(jobId, freelancer);
    }

    // =====================================================================
    // Milestone lifecycle
    // =====================================================================

    function submitMilestone(uint256 jobId, uint256 milestoneIndex, string calldata submissionNote)
        external
        whenNotPaused
        jobExists(jobId)
        onlyFreelancer(jobId)
    {
        Job storage j = _jobs[jobId];
        if (j.status != JobStatus.ACTIVE) revert WrongJobStatus();

        Milestone[] storage ms = _jobMilestones[jobId];
        if (milestoneIndex >= ms.length) revert MilestoneIndexOOB();

        Milestone storage m = ms[milestoneIndex];
        if (m.status != MilestoneStatus.PENDING) revert WrongMilestoneStatus();
        if (_anyMilestoneDisputed(ms)) revert MilestoneAlreadyDisputed();

        m.submissionNote = submissionNote;
        m.status = MilestoneStatus.SUBMITTED;

        emit MilestoneSubmitted(jobId, milestoneIndex, submissionNote);
    }

    function approveMilestone(uint256 jobId, uint256 milestoneIndex)
        external
        whenNotPaused
        nonReentrant
        jobExists(jobId)
        onlyClient(jobId)
    {
        Job storage j = _jobs[jobId];
        if (j.status != JobStatus.ACTIVE) revert WrongJobStatus();

        Milestone[] storage ms = _jobMilestones[jobId];
        if (milestoneIndex >= ms.length) revert MilestoneIndexOOB();

        Milestone storage m = ms[milestoneIndex];
        if (m.status != MilestoneStatus.SUBMITTED) revert WrongMilestoneStatus();

        uint256 platformShare = (m.amount * FREELANCER_FEE_BPS) / BPS_DENOMINATOR;
        uint256 freelancerShare = m.amount - platformShare;

        m.status = MilestoneStatus.RELEASED;
        j.amountReleased += freelancerShare;
        jobBalance[jobId] -= m.amount;

        // Forward held client fee to treasury at the first successful approval.
        _forwardClientFeeIfDue(j, jobId);

        usdcToken.safeTransfer(platformTreasury, platformShare);
        usdcToken.safeTransfer(j.freelancer, freelancerShare);

        emit MilestoneApproved(jobId, milestoneIndex, platformShare, freelancerShare);

        // Check for completion.
        if (_allMilestonesReleased(ms)) {
            j.status = JobStatus.COMPLETED;
            address freelancer = j.freelancer;

            freelancerCompletedJobs[freelancer] += 1;
            freelancerTotalEarned[freelancer] += j.amountReleased;

            emit JobCompleted(jobId, freelancer);

            // Best-effort reputation update — must never block fund release.
            if (reputationNFT != address(0)) {
                try IReputationNFT(reputationNFT).checkAndMint(
                    freelancer,
                    freelancerCompletedJobs[freelancer],
                    0,
                    freelancerTotalEarned[freelancer]
                ) {} catch {}
            }
        }
    }

    function rejectMilestone(uint256 jobId, uint256 milestoneIndex)
        external
        whenNotPaused
        jobExists(jobId)
        onlyClient(jobId)
    {
        Job storage j = _jobs[jobId];
        if (j.status != JobStatus.ACTIVE) revert WrongJobStatus();

        Milestone[] storage ms = _jobMilestones[jobId];
        if (milestoneIndex >= ms.length) revert MilestoneIndexOOB();

        Milestone storage m = ms[milestoneIndex];
        if (m.status != MilestoneStatus.SUBMITTED) revert WrongMilestoneStatus();

        m.status = MilestoneStatus.PENDING;
        emit MilestoneRejected(jobId, milestoneIndex);
    }

    // =====================================================================
    // Dispute / exits
    // =====================================================================

    function raiseDispute(uint256 jobId, uint256 milestoneIndex, string calldata evidenceCID)
        external
        whenNotPaused
        nonReentrant
        jobExists(jobId)
    {
        Job storage j = _jobs[jobId];
        address sender = _msgSender();
        if (sender != j.client && sender != j.freelancer) revert NotClient();
        if (j.status != JobStatus.ACTIVE) revert WrongJobStatus();
        if (disputeDAO == address(0)) revert ZeroAddress();

        Milestone[] storage ms = _jobMilestones[jobId];
        if (milestoneIndex >= ms.length) revert MilestoneIndexOOB();

        Milestone storage m = ms[milestoneIndex];
        if (m.status != MilestoneStatus.SUBMITTED) revert WrongMilestoneStatus();

        uint256 arbFee = (m.amount * DISPUTE_ARB_BPS)  / BPS_DENOMINATOR; // 6%
        uint256 platFee = (m.amount * DISPUTE_PLAT_BPS) / BPS_DENOMINATOR; // 2%
        uint256 totalToDAO = arbFee + platFee;

        m.status = MilestoneStatus.DISPUTED;
        j.status = JobStatus.DISPUTED;
        jobBalance[jobId] -= totalToDAO;

        usdcToken.safeTransfer(disputeDAO, totalToDAO);

        uint256 disputeId = IDisputeDAO(disputeDAO).openDispute(
            jobId,
            milestoneIndex,
            j.client,
            j.freelancer,
            sender,
            evidenceCID,
            arbFee,
            platFee
        );

        emit DisputeRaised(jobId, milestoneIndex, sender, disputeId, arbFee, platFee);
    }

    function selfReportPoorWork(uint256 jobId)
        external
        whenNotPaused
        jobExists(jobId)
        onlyFreelancer(jobId)
    {
        Job storage j = _jobs[jobId];
        if (j.status != JobStatus.ACTIVE) revert WrongJobStatus();
        j.poorWorkReported = true;
        emit PoorWorkReported(jobId, j.freelancer);
    }

    /**
     * @notice Cancel a job:
     *         (a) status OPEN: full refund of depositAmount.
     *         (b) status ACTIVE AND poorWorkReported: refund all USDC still
     *             held in escrow for this job (deposit minus any milestones
     *             already released). No freelancer flag.
     */
    function cancelJob(uint256 jobId)
        external
        whenNotPaused
        nonReentrant
        jobExists(jobId)
        onlyClient(jobId)
    {
        Job storage j = _jobs[jobId];
        bool conditionA = (j.status == JobStatus.OPEN);
        bool conditionB = (j.status == JobStatus.ACTIVE && j.poorWorkReported);
        if (!conditionA && !conditionB) revert CannotCancelInState();

        uint256 refund = jobBalance[jobId];
        jobBalance[jobId] = 0;
        j.status = JobStatus.CANCELLED;

        if (refund > 0) {
            usdcToken.safeTransfer(j.client, refund);
        }
        emit JobCancelled(jobId, refund);
    }

    /**
     * @notice Last-resort recovery if the freelancer ghosted: client may
     *         pull all locked USDC after the job deadline has passed by
     *         RESCUE_GRACE_PERIOD AND no milestone was ever submitted.
     */
    function rescueClientRefund(uint256 jobId)
        external
        whenNotPaused
        nonReentrant
        jobExists(jobId)
        onlyClient(jobId)
    {
        Job storage j = _jobs[jobId];
        if (j.status != JobStatus.ACTIVE) revert WrongJobStatus();
        if (block.timestamp <= j.deadline + RESCUE_GRACE_PERIOD) revert RescueConditionsUnmet();
        if (_anyMilestoneEverSubmitted(_jobMilestones[jobId])) revert RescueConditionsUnmet();

        uint256 refund = jobBalance[jobId];
        jobBalance[jobId] = 0;
        j.status = JobStatus.CANCELLED;

        if (refund > 0) {
            usdcToken.safeTransfer(j.client, refund);
        }
        emit JobRescued(jobId, refund);
    }

    /**
     * @notice Called by DisputeDAO once a dispute is resolved. Releases
     *         the locked 92% of the disputed milestone to the winner,
     *         refunds all PENDING milestone amounts to the client,
     *         forwards the held client fee to the treasury, and (if
     *         CLIENT wins) flags the freelancer.
     */
    function releaseFundsAfterDispute(
        uint256 jobId,
        uint256 milestoneIndex,
        uint8 winner,
        address[] calldata /* majorityArbitrators */
    ) external whenNotPaused nonReentrant onlyDisputeDAO jobExists(jobId) {
        Job storage j = _jobs[jobId];
        if (j.status != JobStatus.DISPUTED) revert WrongJobStatus();

        Milestone[] storage ms = _jobMilestones[jobId];
        if (milestoneIndex >= ms.length) revert MilestoneIndexOOB();
        Milestone storage m = ms[milestoneIndex];
        if (m.status != MilestoneStatus.DISPUTED) revert WrongMilestoneStatus();

        // 92% of milestone (the 8% was already sent to DisputeDAO at raiseDispute).
        uint256 disputedRemainder = m.amount - ((m.amount * FREELANCER_FEE_BPS) / BPS_DENOMINATOR);

        // Sum all PENDING milestones — these refund to client regardless of winner.
        uint256 pendingRefund;
        for (uint256 i = 0; i < ms.length; ++i) {
            if (ms[i].status == MilestoneStatus.PENDING) {
                pendingRefund += ms[i].amount;
                // Mark them as won-by-the-recipient so they can't be
                // misinterpreted by frontend / future logic.
                ms[i].status = MilestoneStatus.CLIENT_WON;
            }
        }

        if (winner == WINNER_CLIENT) {
            m.status = MilestoneStatus.CLIENT_WON;
            jobBalance[jobId] -= disputedRemainder;
            usdcToken.safeTransfer(j.client, disputedRemainder);

            _flagFreelancer(j.freelancer);
        } else if (winner == WINNER_FREELANCER) {
            m.status = MilestoneStatus.FREELANCER_WON;
            jobBalance[jobId] -= disputedRemainder;
            j.amountReleased += disputedRemainder;
            usdcToken.safeTransfer(j.freelancer, disputedRemainder);
        } else {
            revert WrongMilestoneStatus();
        }

        if (pendingRefund > 0) {
            jobBalance[jobId] -= pendingRefund;
            usdcToken.safeTransfer(j.client, pendingRefund);
        }

        // Forward the held client fee per the architecture's fee table:
        // platform keeps 2%D + 2%M for both dispute outcomes.
        _forwardClientFeeIfDue(j, jobId);

        j.status = JobStatus.CLOSED;

        emit JobClosedAfterDispute(jobId, winner);
    }

    // =====================================================================
    // Internal helpers
    // =====================================================================

    function _flagFreelancer(address freelancer) internal {
        uint256 newCount = ++freelancerFlags[freelancer];
        if (newCount >= FLAGS_FOR_BAN) {
            bannedFreelancers[freelancer] = true;
            emit FreelancerBanned(freelancer);
        } else {
            emit FreelancerFlagged(freelancer, newCount);
        }
    }

    function _forwardClientFeeIfDue(Job storage j, uint256 jobId) internal {
        if (j.clientFeeForwarded || j.clientFee == 0) return;
        j.clientFeeForwarded = true;
        jobBalance[jobId] -= j.clientFee;
        usdcToken.safeTransfer(platformTreasury, j.clientFee);
        emit ClientFeeForwarded(jobId, j.clientFee);
    }

    function _allMilestonesReleased(Milestone[] storage ms) internal view returns (bool) {
        uint256 len = ms.length;
        for (uint256 i = 0; i < len; ++i) {
            if (ms[i].status != MilestoneStatus.RELEASED) return false;
        }
        return true;
    }

    function _anyMilestoneDisputed(Milestone[] storage ms) internal view returns (bool) {
        uint256 len = ms.length;
        for (uint256 i = 0; i < len; ++i) {
            if (ms[i].status == MilestoneStatus.DISPUTED) return true;
        }
        return false;
    }

    function _anyMilestoneEverSubmitted(Milestone[] storage ms) internal view returns (bool) {
        uint256 len = ms.length;
        for (uint256 i = 0; i < len; ++i) {
            MilestoneStatus s = ms[i].status;
            if (s != MilestoneStatus.PENDING) return true;
        }
        return false;
    }

    // =====================================================================
    // Views
    // =====================================================================

    function getJob(uint256 jobId) external view returns (Job memory) {
        return _jobs[jobId];
    }

    function getMilestones(uint256 jobId) external view returns (Milestone[] memory) {
        return _jobMilestones[jobId];
    }

    function getMilestone(uint256 jobId, uint256 milestoneIndex) external view returns (Milestone memory) {
        if (milestoneIndex >= _jobMilestones[jobId].length) revert MilestoneIndexOOB();
        return _jobMilestones[jobId][milestoneIndex];
    }

    function getApplicants(uint256 jobId) external view returns (address[] memory) {
        return _jobApplicants[jobId];
    }

    function getClientJobs(address client) external view returns (uint256[] memory) {
        return _clientJobs[client];
    }

    function getFreelancerJobs(address freelancer) external view returns (uint256[] memory) {
        return _freelancerJobs[freelancer];
    }

    // =====================================================================
    // ERC-2771 / Context plumbing
    // =====================================================================

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
