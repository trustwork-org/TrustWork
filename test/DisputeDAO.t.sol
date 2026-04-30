// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {DisputeDAO} from "../src/modules/DisputeDAO.sol";
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

contract MockEscrowPlatform {
    uint8 public lastWinner;
    uint256 public lastJobId;
    uint256 public lastMilestoneIndex;

    function releaseFundsAfterDispute(
        uint256 jobId,
        uint256 milestoneIndex,
        uint8 winner,
        address[] calldata /* majorityArbitrators */
    ) external {
        lastJobId = jobId;
        lastMilestoneIndex = milestoneIndex;
        lastWinner = winner;
    }
}

// ---------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------

contract DisputeDAOTest is Test {
    DisputeDAO public dao;
    MockUSDC public usdc;
    MockEscrowPlatform public escrowMock;

    address public platformTreasury = makeAddr("platformTreasury");
    address public initialOwner = makeAddr("owner");
    address public trustedForwarder = makeAddr("trustedForwarder");

    address public client = makeAddr("client");
    address public freelancer = makeAddr("freelancer");

    // We need at least 3 arbitrators to form a pool
    address public arb1 = makeAddr("arb1");
    address public arb2 = makeAddr("arb2");
    address public arb3 = makeAddr("arb3");
    address public arb4 = makeAddr("arb4"); // Extra to test selection / leave pool

    uint256 constant ARB_STAKE = 10_000_000; // 10 USDC

    function setUp() public {
        usdc = new MockUSDC();
        escrowMock = new MockEscrowPlatform();

        dao = new DisputeDAO(
            address(usdc),
            platformTreasury,
            trustedForwarder,
            initialOwner
        );

        vm.startPrank(initialOwner);
        dao.setEscrowPlatform(address(escrowMock));
        vm.stopPrank();

        // Mint USDC to potential arbitrators
        usdc.mint(arb1, 100e6);
        usdc.mint(arb2, 100e6);
        usdc.mint(arb3, 100e6);
        usdc.mint(arb4, 100e6);
    }

    // --- Helpers ---

    function _setupArbitrators() internal {
        address[4] memory arbs = [arb1, arb2, arb3, arb4];
        for(uint i = 0; i < 4; i++) {
            vm.startPrank(arbs[i]);
            usdc.approve(address(dao), ARB_STAKE);
            dao.joinArbitratorPool();
            vm.stopPrank();
        }
    }

    // --- Tests ---

    function test_JoinArbitratorPool() public {
        vm.startPrank(arb1);
        usdc.approve(address(dao), ARB_STAKE);
        dao.joinArbitratorPool();
        vm.stopPrank();

        assertTrue(dao.isArbitrator(arb1));
        assertEq(dao.arbitratorStake(arb1), ARB_STAKE);
        assertEq(dao.arbitratorPoolSize(), 1);
        assertEq(usdc.balanceOf(address(dao)), ARB_STAKE);
        
        // EDGE CASE: Cannot join if already in pool
        vm.startPrank(arb1);
        usdc.approve(address(dao), ARB_STAKE);
        vm.expectRevert(DisputeDAO.AlreadyInPool.selector);
        dao.joinArbitratorPool();
        vm.stopPrank();
    }

    function test_LeaveArbitratorPool() public {
        _setupArbitrators();
        
        uint256 preBal = usdc.balanceOf(arb4);
        
        vm.startPrank(arb4);
        dao.leaveArbitratorPool();
        vm.stopPrank();

        assertFalse(dao.isArbitrator(arb4));
        assertEq(dao.arbitratorPoolSize(), 3); // 4 - 1
        assertEq(usdc.balanceOf(arb4), preBal + ARB_STAKE);
        
        // EDGE CASE: Cannot leave if not in pool
        vm.prank(client);
        vm.expectRevert(DisputeDAO.NotInPool.selector);
        dao.leaveArbitratorPool();
    }

    function test_OpenDispute_InsufficientArbitrators() public {
        // Only 1 arbitrator joins
        vm.startPrank(arb1);
        usdc.approve(address(dao), ARB_STAKE);
        dao.joinArbitratorPool();
        vm.stopPrank();
        
        // Opening dispute should fail because 3 are required
        vm.prank(address(escrowMock));
        vm.expectRevert(abi.encodeWithSelector(DisputeDAO.InsufficientArbitrators.selector, 1));
        dao.openDispute(1, 0, client, freelancer, client, "ipfs://evidence", 6e6, 2e6);
    }
    
    function test_OpenDisputeAndVoting_HappyPath() public {
        _setupArbitrators();

        // Simulate EscrowPlatform forwarding fees before calling openDispute
        usdc.mint(address(dao), 8e6); // 6e6 arb + 2e6 plat fee
        
        vm.prank(address(escrowMock));
        uint256 disputeId = dao.openDispute(1, 0, client, freelancer, client, "ipfs://evidenceA", 6e6, 2e6);
        
        assertEq(disputeId, 1);
        
        // Submitting evidence from counterparty
        vm.prank(freelancer);
        dao.submitEvidence(disputeId, "ipfs://evidenceB");
        
        (string memory evA, string memory evB) = dao.getDisputeEvidence(disputeId);
        assertEq(evA, "ipfs://evidenceA");
        assertEq(evB, "ipfs://evidenceB");

        address[3] memory assigned = dao.getDisputeArbitrators(disputeId);
        
        // Arbitrators vote: 1 = Client, 2 = Freelancer
        vm.prank(assigned[0]);
        dao.submitVote(disputeId, 1); // Client

        vm.prank(assigned[1]);
        dao.submitVote(disputeId, 1); // Client
        
        vm.prank(assigned[2]);
        dao.submitVote(disputeId, 2); // Freelancer

        // EDGE CASE: Unauthorized vote (client tries to vote)
        vm.prank(client);
        vm.expectRevert(DisputeDAO.NotAssignedArbitrator.selector);
        dao.submitVote(disputeId, 1);

        // EDGE CASE: Attempt resolution before deadline
        vm.expectRevert(DisputeDAO.VotingStillOpen.selector);
        dao.resolveDispute(disputeId);
        
        // Fast forward past the voting deadline
        vm.warp(block.timestamp + 10 minutes + 1);
        
        dao.resolveDispute(disputeId);

        // Client wins (2 votes to 1)
        assertEq(escrowMock.lastWinner(), 1); // Client

        // Validate Rewards and Slashes
        // assigned[2] is the minority. 10% of 10e6 = 1e6 slash.
        assertEq(dao.arbitratorStake(assigned[2]), 9e6);

        // majority (assigned[0] & [1]) share the 6e6 reward -> 3e6 each.
        // Since initial balance was 90e6 (after 10e6 stake), new balance = 93e6.
        assertEq(usdc.balanceOf(assigned[0]), 93e6);
        assertEq(usdc.balanceOf(assigned[1]), 93e6);

        // Treasury gets 2e6 (platform fee) + 1e6 (slash) = 3e6
        assertEq(usdc.balanceOf(platformTreasury), 3e6); 
    }

    function test_ResolveDispute_NonVotersSlashed() public {
        _setupArbitrators();

        usdc.mint(address(dao), 8e6);
        vm.prank(address(escrowMock));
        uint256 disputeId = dao.openDispute(1, 0, client, freelancer, client, "ipfs://evidence", 6e6, 2e6);
        
        address[3] memory assigned = dao.getDisputeArbitrators(disputeId);
        
        // Only 1 arbitrator votes, the other 2 ghost
        vm.prank(assigned[0]);
        dao.submitVote(disputeId, 2); // Freelancer

        vm.warp(block.timestamp + 10 minutes + 1);
        dao.resolveDispute(disputeId);
        
        assertEq(escrowMock.lastWinner(), 2); // Freelancer wins
        
        // non-voters slashed 10%
        assertEq(dao.arbitratorStake(assigned[1]), 9e6);
        assertEq(dao.arbitratorStake(assigned[2]), 9e6);
        
        // Treasury gets 2e6 (plat fee) + 2e6 (two 1e6 slashes) = 4e6
        assertEq(usdc.balanceOf(platformTreasury), 4e6);
    }
    
    function test_LeavePool_BusyArbitratorReverts() public {
        _setupArbitrators();

        usdc.mint(address(dao), 8e6);
        vm.prank(address(escrowMock));
        uint256 disputeId = dao.openDispute(1, 0, client, freelancer, client, "ipfs://evidenceA", 6e6, 2e6);
        
        address[3] memory assigned = dao.getDisputeArbitrators(disputeId);
        
        // An assigned arbitrator cannot withdraw stake/leave pool while dispute is VOTING
        vm.prank(assigned[0]);
        vm.expectRevert(DisputeDAO.ArbitratorIsBusy.selector);
        dao.leaveArbitratorPool();
    }
    
    function test_ResolveDispute_ZeroVotesCastTieBreaker() public {
        _setupArbitrators();

        usdc.mint(address(dao), 8e6);
        vm.prank(address(escrowMock));
        uint256 disputeId = dao.openDispute(1, 0, client, freelancer, client, "ipfs://evidence", 6e6, 2e6);
        
        vm.warp(block.timestamp + 10 minutes + 1);
        // Nobody votes. Call resolve.
        dao.resolveDispute(disputeId);

        // EDGE CASE: Zero votes or Ties defaults to FREELANCER (work submitted on-chain)
        assertEq(escrowMock.lastWinner(), 2);
        
        // All 3 assigned arbitrators get slashed and since 10% of 10e6 = 1e6, 
        // their stakes fall to 9e6. The minStake is 10e6, so they are AUTO-EVICTED.
        address[3] memory assigned = dao.getDisputeArbitrators(disputeId);
        assertFalse(dao.isArbitrator(assigned[0]));
        assertFalse(dao.isArbitrator(assigned[1]));
        assertFalse(dao.isArbitrator(assigned[2]));

        // Treasury receives:
        // - 2e6 platform fee
        // - 6e6 unclaimed arbitrator fee (since nobody voted)
        // - 3e6 from the three 1e6 slashes
        // Total = 11e6
        assertEq(usdc.balanceOf(platformTreasury), 11e6);
    }
}
