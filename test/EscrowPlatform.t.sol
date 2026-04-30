// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {EscrowPlatform} from "../src/core/EscrowPlatform.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// ---------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

contract MockDisputeDAO {
    uint256 public disputeCounter;
    
    function openDispute(
        uint256 /* jobId */,
        uint256 /* milestoneIndex */,
        address /* client */,
        address /* freelancer */,
        address /* raisedBy */,
        string calldata /* evidenceCID */,
        uint256 /* arbitratorFee */,
        uint256 /* platformFee */
    ) external returns (uint256 disputeId) {
        disputeCounter++;
        return disputeCounter;
    }
}

contract MockReputationNFT {
    function checkAndMint(
        address freelancer,
        uint256 totalJobsDone,
        uint256 avgRating,
        uint256 totalEarned
    ) external {}
}

// ---------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------

contract EscrowPlatformTest is Test {
    EscrowPlatform public escrow;
    MockUSDC public usdc;
    MockDisputeDAO public disputeDAO;
    MockReputationNFT public reputationNFT;

    address public platformTreasury = makeAddr("platformTreasury");
    address public governance = makeAddr("governance");
    address public multisig = makeAddr("multisig");
    address public trustedForwarder = makeAddr("trustedForwarder");

    address public client = makeAddr("client");
    address public freelancer = makeAddr("freelancer");

    uint256 constant INITIAL_BALANCE = 10_000e6; // 10,000 USDC

    function setUp() public {
        // Deploy mocks
        usdc = new MockUSDC();
        disputeDAO = new MockDisputeDAO();
        reputationNFT = new MockReputationNFT();
        
        // Deploy core contract
        escrow = new EscrowPlatform(
            address(usdc),
            platformTreasury,
            governance,
            multisig,
            trustedForwarder
        );

        // Setup multisig config (must pause to set sensitive addresses)
        vm.startPrank(multisig);
        escrow.pause();
        escrow.setDisputeDAO(address(disputeDAO));
        escrow.setReputationNFT(address(reputationNFT));
        escrow.unpause();
        vm.stopPrank();

        // Mint mock USDC to test users
        usdc.mint(client, INITIAL_BALANCE);
        usdc.mint(freelancer, INITIAL_BALANCE);
    }

    // --- Helper to create a standard job ---
    function _createStandardJob() internal returns (uint256) {
        vm.startPrank(client);
        usdc.approve(address(escrow), 100e6);

        string[] memory descriptions = new string[](2);
        descriptions[0] = "Milestone 1";
        descriptions[1] = "Milestone 2";
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 40e6;
        amounts[1] = 58e6;

        uint256 deadline = block.timestamp + 7 days;

        uint256 jobId = escrow.createJob(
            descriptions,
            amounts,
            deadline,
            EscrowPlatform.JobCategory.WEB_DEVELOPMENT,
            100e6 // 100 USDC deposit
        );
        vm.stopPrank();
        
        return jobId;
    }

    // --- Tests ---

    function test_InitialState() public {
        assertEq(address(escrow.usdcToken()), address(usdc));
        assertEq(escrow.platformTreasury(), platformTreasury);
        assertEq(escrow.disputeDAO(), address(disputeDAO));
        assertEq(escrow.reputationNFT(), address(reputationNFT));
    }

    function test_CreateJob() public {
        uint256 preBalance = usdc.balanceOf(client);
        
        uint256 jobId = _createStandardJob();
        assertEq(jobId, 1);
        
        EscrowPlatform.Job memory j = escrow.getJob(jobId);
        assertEq(j.client, client);
        assertEq(uint(j.status), uint(EscrowPlatform.JobStatus.OPEN));
        assertEq(j.depositAmount, 100e6);
        assertEq(j.clientFee, 2e6); // 2% of 100
        assertEq(j.availableForWork, 98e6); // 98% of 100
        
        // 100 USDC transferred from client to escrow
        assertEq(usdc.balanceOf(client), preBalance - 100e6);
        assertEq(usdc.balanceOf(address(escrow)), 100e6);
        
        // Treasury should not have the fee yet
        assertEq(usdc.balanceOf(platformTreasury), 0);
    }

    function test_ApplyAndApproveApplicant() public {
        uint256 jobId = _createStandardJob();

        // Freelancer applies
        vm.prank(freelancer);
        escrow.applyToJob(jobId);

        address[] memory applicants = escrow.getApplicants(jobId);
        assertEq(applicants.length, 1);
        assertEq(applicants[0], freelancer);

        // Client approves
        vm.prank(client);
        escrow.approveApplicant(jobId, freelancer);

        EscrowPlatform.Job memory j = escrow.getJob(jobId);
        assertEq(j.freelancer, freelancer);
        assertEq(uint(j.status), uint(EscrowPlatform.JobStatus.ACTIVE));
    }

    function test_SubmitAndApproveMilestone() public {
        uint256 jobId = _createStandardJob();

        // Assign freelancer
        vm.prank(freelancer);
        escrow.applyToJob(jobId);
        vm.prank(client);
        escrow.approveApplicant(jobId, freelancer);

        // Freelancer submits milestone 0
        vm.prank(freelancer);
        escrow.submitMilestone(jobId, 0, "ipfs://evidence");

        EscrowPlatform.Milestone memory m = escrow.getMilestone(jobId, 0);
        assertEq(uint(m.status), uint(EscrowPlatform.MilestoneStatus.SUBMITTED));
        assertEq(m.submissionNote, "ipfs://evidence");

        uint256 preFreelancerBal = usdc.balanceOf(freelancer);

        // Client approves milestone 0
        vm.prank(client);
        escrow.approveMilestone(jobId, 0);

        m = escrow.getMilestone(jobId, 0);
        assertEq(uint(m.status), uint(EscrowPlatform.MilestoneStatus.RELEASED));

        // Validate fee mathematics:
        // Milestone 0 amount = 40e6.
        // Platform share = 8% of 40e6 = 3.2e6.
        // Freelancer share = 36.8e6.
        // ALSO: first milestone approval forwards the locked client fee (2e6).
        // Total to treasury = 3.2e6 + 2e6 = 5.2e6
        
        assertEq(usdc.balanceOf(platformTreasury), 5.2e6);
        assertEq(usdc.balanceOf(freelancer), preFreelancerBal + 36.8e6);
        
        EscrowPlatform.Job memory j = escrow.getJob(jobId);
        assertTrue(j.clientFeeForwarded);
        assertEq(j.amountReleased, 36.8e6);
    }

    function test_RaiseDispute() public {
        uint256 jobId = _createStandardJob();

        // Assign freelancer
        vm.prank(freelancer);
        escrow.applyToJob(jobId);
        vm.prank(client);
        escrow.approveApplicant(jobId, freelancer);

        // Freelancer submits milestone 0
        vm.prank(freelancer);
        escrow.submitMilestone(jobId, 0, "ipfs://evidence");

        // Client disputes the milestone
        vm.prank(client);
        escrow.raiseDispute(jobId, 0, "ipfs://client_evidence");

        EscrowPlatform.Milestone memory m = escrow.getMilestone(jobId, 0);
        assertEq(uint(m.status), uint(EscrowPlatform.MilestoneStatus.DISPUTED));
        
        EscrowPlatform.Job memory j = escrow.getJob(jobId);
        assertEq(uint(j.status), uint(EscrowPlatform.JobStatus.DISPUTED));

        // For dispute:
        // 6% (Arbitrator) + 2% (Platform) of 40e6 sent to DisputeDAO
        // Total 8% of 40e6 = 3.2e6
        assertEq(usdc.balanceOf(address(disputeDAO)), 3.2e6);
    }

    function test_CancelJobBeforeActive() public {
        uint256 jobId = _createStandardJob();
        
        uint256 preClientBal = usdc.balanceOf(client);
        
        // Cancel the job while still OPEN
        vm.prank(client);
        escrow.cancelJob(jobId);

        EscrowPlatform.Job memory j = escrow.getJob(jobId);
        assertEq(uint(j.status), uint(EscrowPlatform.JobStatus.CANCELLED));

        // Client gets full 100 USDC back
        assertEq(usdc.balanceOf(client), preClientBal + 100e6);
        assertEq(usdc.balanceOf(address(escrow)), 0);
        assertEq(usdc.balanceOf(platformTreasury), 0);
    }

    function test_SelfReportPoorWorkAndCancel() public {
        uint256 jobId = _createStandardJob();

        // Assign freelancer
        vm.prank(freelancer);
        escrow.applyToJob(jobId);
        vm.prank(client);
        escrow.approveApplicant(jobId, freelancer);

        // Freelancer realizes they can't do the job and self reports
        vm.prank(freelancer);
        escrow.selfReportPoorWork(jobId);

        EscrowPlatform.Job memory j = escrow.getJob(jobId);
        assertTrue(j.poorWorkReported);

        uint256 preClientBal = usdc.balanceOf(client);

        // Client cancels and recovers remaining funds
        vm.prank(client);
        escrow.cancelJob(jobId);

        j = escrow.getJob(jobId);
        assertEq(uint(j.status), uint(EscrowPlatform.JobStatus.CANCELLED));
        
        // Client gets remaining 100 USDC back
        assertEq(usdc.balanceOf(client), preClientBal + 100e6);
    }
}
