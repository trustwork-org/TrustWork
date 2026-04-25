# TrustWork — Freelancer Escrow Platform Architecture

## Overview

A decentralized escrow platform where clients lock stablecoin payments into smart contracts,
milestones are defined upfront, funds release automatically on approval, and disputes
are resolved via DAO arbitration. Built on Solidity, deployed to Lisk Network.

---

## Problem Statement

- Clients refuse to pay after work is delivered
- Freelancers disappear after receiving upfront payment
- No neutral third party in remote work agreements
- Traditional platforms (Upwork, Fiverr) charge 10–20% and can ban accounts arbitrarily
- No transparent, tamper-proof record of agreements

---

## Why TrustWork Wins

| Feature | Upwork / Fiverr | TrustWork |
|---|---|---|
| Platform fee | 10–20% | 2% client + 8% per milestone (freelancer) |
| Payment speed | 5–7 business days | Instant on milestone approval |
| Dispute resolution | Centralized human staff | Staked community arbitrators, on-chain |
| Reputation ownership | Lives on their servers | Soulbound NFT on your wallet forever |
| Fee transparency | Hidden service fees | All rules in public smart contract code |
| Login | Email/password | Social login or wallet (your choice) |

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       FRONTEND (Next.js)                         │
│  Job Board | Milestone Tracker | Dispute Panel | Profile Pages   │
└────────────────────────────┬─────────────────────────────────────┘
                             │ ethers.js / wagmi
┌────────────────────────────▼─────────────────────────────────────┐
│                     SMART CONTRACT LAYER                         │
│                                                                  │
│  ┌───────────────────────────────────┐  ┌──────────────────────┐ │
│  │        EscrowPlatform.sol         │  │    DisputeDAO.sol    │ │
│  │                                   │  │                      │ │
│  │  mapping(jobId => Job)            │  │  openDispute()       │ │
│  │  mapping(jobId => Milestone[])    │  │  submitEvidence()    │ │
│  │  mapping(jobId => applicants[])   │  │  submitVote()        │ │
│  │                                   │  │  resolveDispute()    │ │
│  │  createJob()  ← deposits here     │  │  joinPool()          │ │
│  │  applyToJob()                     │  │  leavePool()         │ │
│  │  approveApplicant()               │  └──────────────────────┘ │
│  │  submitMilestone()                │                           │
│  │  approveMilestone()               │                           │
│  │  raiseDispute()                   │                           │
│  │  selfReportPoorWork()             │                           │
│  │  cancelJob()                      │                           │
│  │  rescueClientRefund()             │                           │
│  │  releaseFundsAfterDispute()       │                           │
│  └───────────────────────────────────┘                           │
└──────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                   REPUTATION & IDENTITY LAYER                    │
│                                                                  │
│      ReputationNFT (Soulbound)    |    ProfileRegistry           │
│      - Minted at 5/20/50/100/250     - IPFS-hash profile store  │
│        job completion thresholds     - Skills, name, bio         │
│      - Tier upgrade burns old NFT    - Wallet → profile mapping  │
│      - Non-transferable                                          │
└──────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                     BACKEND & INFRASTRUCTURE                     │
│                                                                  │
│  Chat (XMTP)  |  Email Notifications  |  Gas Relayer (ERC-2771) │
│  Account Abstraction (EIP-4337)  |  Event Listener Service       │
└──────────────────────────────────────────────────────────────────┘
```

---

## Job Lifecycle

```
createJob() + deposit in one call
    → status: OPEN  (funds deposited, 2% client fee deducted, awaiting freelancer)
         ↓
applyToJob()
    → freelancers browse and apply, stored in jobApplicants[]
         ↓
approveApplicant()
    → status: ACTIVE  (freelancer address set, work begins immediately)
         ↓
submitMilestone()
    → milestone: SUBMITTED  (off-chain link recorded on-chain)
         ↓
approveMilestone()
    → milestone: RELEASED  (8% to platform, 92% to freelancer)
         ↓ (repeat for each milestone)
         ↓
All milestones RELEASED
    → status: COMPLETED → ReputationNFT.checkAndMint() called
```

**Alternative exits:**
- `cancelJob()` while OPEN → full refund including 2% fee (no freelancer approved yet)
- `selfReportPoorWork()` + `cancelJob()` → full refund to client, no fee, no flag
- `raiseDispute()` → status: DISPUTED → DAO resolves → status: CLOSED
- `rescueClientRefund()` by client only, after deadline + 30 days → CANCELLED

---

## Smart Contracts

### 1. `EscrowPlatform.sol`

The single core contract. All jobs stored as mapping entries. Holds all USDC.

```
State Variables:
- uint public jobCounter
- address public usdcToken                    → USDC ERC-20 contract on Lisk
- address public disputeDAO                   → DisputeDAO contract address
- address public reputationNFT                → ReputationNFT contract address
- address public profileRegistry              → ProfileRegistry contract address
- address public platformTreasury             → receives platform fee share
- uint public feePercent                      → DAO-controlled, e.g. 5 (means 5%)
- uint public constant MIN_FEE_PERCENT = 1    → hard floor, immutable
- uint public constant MAX_FEE_PERCENT = 8    → hard ceiling, immutable
- uint public constant CLIENT_FEE_BPS = 200   → 2% in basis points, immutable
- uint public constant FREELANCER_FEE_BPS = 800 → 8% in basis points, immutable
- mapping(uint => Job) public jobs
- mapping(uint => Milestone[]) public jobMilestones
- mapping(uint => address[]) public jobApplicants
- mapping(address => uint[]) public clientJobs
- mapping(address => uint[]) public freelancerJobs
- mapping(address => uint) public freelancerFlags
- mapping(address => bool) public bannedFreelancers
- bool public paused                          → emergency pause (multisig only)

JobCategory enum:
- WEB_DEVELOPMENT
- MOBILE_DEVELOPMENT
- SMART_CONTRACT_DEVELOPMENT
- UI_UX_DESIGN
- GRAPHIC_DESIGN
- CONTENT_WRITING
- COPYWRITING
- DIGITAL_MARKETING
- DATA_SCIENCE
- VIDEO_EDITING
- AUDIO_PRODUCTION
- TRANSLATION
- VIRTUAL_ASSISTANT
- OTHERS                                      → default

JobStatus enum:
- OPEN        → funded, posted, no freelancer assigned yet
- ACTIVE      → freelancer approved, work in progress
- DISPUTED    → frozen due to active arbitration
- COMPLETED   → all milestones approved and released
- CLOSED      → terminated after dispute resolution
- CANCELLED   → cancelled before any work was completed

MilestoneStatus enum:
- PENDING         → not yet submitted
- SUBMITTED       → freelancer submitted work, awaiting client review
- RELEASED        → approved and paid out
- DISPUTED        → under arbitration
- CLIENT_WON      → dispute resolved in client's favour
- FREELANCER_WON  → dispute resolved in freelancer's favour

Job Struct:
- uint jobId
- address client
- address freelancer            → address(0) until approveApplicant() is called
- uint depositAmount            → total USDC deposited by client
- uint clientFee                → 2% of depositAmount, sent to treasury on deposit
- uint availableForWork         → depositAmount - clientFee (= 98% of depositAmount)
- uint amountReleased           → running total of USDC paid to freelancer
- bool poorWorkReported         → true if freelancer called selfReportPoorWork()
- JobCategory category
- JobStatus status
- uint createdAt
- uint deadline

Milestone Struct:
- string description
- uint amount                   → USDC amount for this milestone (from availableForWork)
- uint deadline
- string submissionNote         → off-chain link/reference stored on-chain
- MilestoneStatus status
```

---

**Key Functions:**

```
createJob(milestones[], amounts[], deadline, category, depositAmount)
    → caller is client (not banned)
    → requires depositAmount > 0, at least 1 milestone
    → clientFee = depositAmount * 200 / 10000           (2%)
    → availableForWork = depositAmount - clientFee       (98%)
    → requires sum(amounts) <= availableForWork
    → transfers depositAmount USDC from client to this contract
    → transfers clientFee USDC → platformTreasury immediately
    → stores Job with category, freelancer = address(0)
    → status → OPEN
    → NOTE: if job is cancelled before a freelancer is approved,
      clientFee is refunded to client (see cancelJob)

applyToJob(jobId)
    → job status must be OPEN
    → caller must not be banned
    → caller must not be the client
    → caller must not have already applied
    → adds msg.sender to jobApplicants[jobId]

approveApplicant(jobId, freelancerAddress)
    → only client
    → job status must be OPEN
    → freelancerAddress must be in jobApplicants[jobId]
    → sets job.freelancer = freelancerAddress
    → status → ACTIVE

submitMilestone(jobId, milestoneIndex, submissionNote)
    → only job.freelancer
    → job status must be ACTIVE
    → no milestone on this job currently has status DISPUTED
    → milestone status must be PENDING
    → stores submissionNote on-chain (URL, repo link, description, etc.)
    → milestone status → SUBMITTED

approveMilestone(jobId, milestoneIndex)
    → only client
    → job status must be ACTIVE
    → milestone status must be SUBMITTED
    → platformShare = milestone.amount * 800 / 10000    (8%)
    → freelancerShare = milestone.amount - platformShare (92%)
    → transfers platformShare USDC → platformTreasury
    → transfers freelancerShare USDC → freelancer
    → milestone status → RELEASED
    → amountReleased += freelancerShare
    → if all milestones RELEASED:
        → job status → COMPLETED
        → call ReputationNFT.checkAndMint(freelancer, ...)

rejectMilestone(jobId, milestoneIndex)
    → only client
    → milestone status must be SUBMITTED
    → milestone status → PENDING (freelancer can revise and resubmit)

raiseDispute(jobId, milestoneIndex, myEvidenceIPFSHash)
    → either client or freelancer
    → job status must be ACTIVE
    → milestone status must be SUBMITTED
    → milestone status → DISPUTED
    → job status → DISPUTED
    → disputeFeeForArbitrators = milestone.amount * 600 / 10000   (6%)
    → platformDisputeFee       = milestone.amount * 200 / 10000   (2%)
    → transfers (disputeFeeForArbitrators + platformDisputeFee) USDC → DisputeDAO
    → calls DisputeDAO.openDispute(
          jobId, milestoneIndex, msg.sender, myEvidenceIPFSHash,
          disputeFeeForArbitrators, platformDisputeFee
      )
    → NOTE: 92% of milestone.amount remains locked in this contract
      pending dispute resolution

selfReportPoorWork(jobId)
    → only job.freelancer
    → job status must be ACTIVE
    → sets job.poorWorkReported = true

cancelJob(jobId)
    → only client
    → valid conditions:
        (a) job.status == OPEN (no freelancer approved yet):
            → refund availableForWork USDC to client
            → refund clientFee USDC to client (full deposit returned)
            → status → CANCELLED
        (b) job.status == ACTIVE AND job.poorWorkReported == true:
            → refund all remaining unlocked USDC to client
            → refund clientFee USDC to client
            → freelancer NOT flagged
            → status → CANCELLED
    → any other condition: revert

rescueClientRefund(jobId)
    → only job.client  (not callable by anyone else)
    → job status must be ACTIVE
    → block.timestamp > job.deadline + 30 days
    → no milestone has ever been SUBMITTED (freelancer completely ghosted)
    → returns all remaining locked USDC to client (including clientFee)
    → status → CANCELLED

releaseFundsAfterDispute(jobId, milestoneIndex, winner, majorityArbitrators[])
    → only callable by DisputeDAO contract
    → job status must be DISPUTED
    → disputedAmount = 92% of milestone.amount
       (the 8% was already sent to DisputeDAO when dispute was raised)

    IF winner == CLIENT:
        → milestone status → CLIENT_WON
        → transfer disputedAmount USDC → back to client
        → transfer all future PENDING milestone amounts USDC → back to client
        → job status → CLOSED
        → call internal _flagFreelancer(job.freelancer)

    IF winner == FREELANCER:
        → milestone status → FREELANCER_WON
        → transfer disputedAmount USDC → freelancer
        → transfer all future PENDING milestone amounts USDC → back to client
        → job status → CLOSED

_flagFreelancer(address freelancer)   [internal]
    → freelancerFlags[freelancer] += 1
    → if freelancerFlags[freelancer] >= 3:
        → bannedFreelancers[freelancer] = true
        → emit FreelancerBanned(freelancer)
    → else:
        → emit FreelancerFlagged(freelancer, freelancerFlags[freelancer])

setFeePercent(uint newFee)   [DAO governance only]
    → requires newFee >= MIN_FEE_PERCENT && newFee <= MAX_FEE_PERCENT

pause() / unpause()   [multisig only — emergency use]
```

---

### 2. `DisputeDAO.sol`

Receives fee from EscrowPlatform when a dispute opens.
Distributes arbitrator rewards and platform fee on resolution.
Calls EscrowPlatform to release the remaining 92% of the milestone to the winner.

```
State Variables:
- uint public disputeCounter
- address public usdcToken
- address public escrowPlatform
- address public platformTreasury
- address[] public arbitratorPool
- uint public minStake = 100_000_000          → 100 USDC (6 decimals)
- uint public votingPeriod = 2 days
- uint public constant SLASH_PERCENT = 10     → 10% stake slash for minority/inactive
- mapping(uint => Dispute) public disputes
- mapping(address => uint) public arbitratorStake

Dispute Struct:
- uint disputeId
- uint jobId
- uint milestoneIndex
- address raisedBy
- string partyAEvidenceHash       → IPFS hash from raising party (set at open)
- string partyBEvidenceHash       → IPFS hash from responding party (submitted later)
- uint votesForClient
- uint votesForFreelancer
- uint arbitratorFee              → 6% of milestone.amount, held for distribution
- uint platformFee                → 2% of milestone.amount, forwarded to treasury
- DisputeStatus status            → OPEN | VOTING | RESOLVED
- address[] assignedArbitrators   → 3 randomly selected from pool
- mapping(address => bool) hasVoted
- mapping(address => uint8) votes → 1 = CLIENT, 2 = FREELANCER
- uint deadline                   → block.timestamp + votingPeriod
```

**Key Functions:**

```
openDispute(jobId, milestoneIndex, raisedBy, evidenceIPFSHash, arbitratorFee, platformFee)
    → only callable by EscrowPlatform
    → receives (arbitratorFee + platformFee) USDC from EscrowPlatform
    → creates Dispute struct, stores fees
    → selects 3 arbitrators via _selectArbitrators(disputeId)
    → status → VOTING

submitEvidence(disputeId, evidenceIPFSHash)
    → callable by either client or freelancer of the disputed job
    → status must be VOTING, before deadline
    → stores partyAEvidenceHash (raising party) or partyBEvidenceHash (responding party)

submitVote(disputeId, vote)
    → only in assignedArbitrators[]
    → status must be VOTING, before deadline
    → vote: 1 = CLIENT_WINS, 2 = FREELANCER_WINS
    → records vote, marks hasVoted = true

resolveDispute(disputeId)
    → callable by anyone after voting deadline
    → tallies votes (majority of votes CAST, not total assigned)
    → identifies majority, minority, and non-voting arbitrators
    → distributes arbitratorFee equally among majority voters
    → slashes SLASH_PERCENT of stake from minority voters → platformTreasury
    → slashes SLASH_PERCENT of stake from non-voters → platformTreasury
    → transfers platformFee USDC → platformTreasury
    → calls EscrowPlatform.releaseFundsAfterDispute(jobId, milestoneIndex, winner, majorityArbitrators[])
    → status → RESOLVED

_selectArbitrators(disputeId)   [internal]
    → entropy = keccak256(abi.encodePacked(block.prevrandao, block.timestamp, disputeId))
    → selects 3 unique arbitrators from arbitratorPool
    → skips arbitrators currently assigned to an open VOTING dispute

joinArbitratorPool()
    → stakes minStake USDC (ERC-20 transferFrom)
    → caller not already in pool
    → adds to arbitratorPool

leaveArbitratorPool()
    → caller must be in pool
    → no currently VOTING disputes assigned to caller
    → returns full stake to caller, removes from pool
```

---

### 3. `ReputationNFT.sol`

Soulbound NFT. Minted at job completion thresholds. Tier upgrade burns old badge and mints new one.

```
Reputation Tiers:
- Tier 1 → "Rising Talent"    — 5 completed jobs
- Tier 2 → "Established Pro"  — 20 completed jobs
- Tier 3 → "Expert"           — 50 completed jobs
- Tier 4 → "Elite"            — 100 completed jobs
- Tier 5 → "Legend"           — 250 completed jobs

Key Properties:
- ERC-721 soulbound: _beforeTokenTransfer() reverts on wallet-to-wallet transfer
- Minting (from = address(0)) and burning (to = address(0)) allowed
- Only EscrowPlatform can call checkAndMint()

State Variables:
- uint[] public thresholds = [5, 20, 50, 100, 250]
- mapping(address => uint) public jobsCompleted
- mapping(address => uint) public currentTier
- mapping(address => uint) public freelancerTokenId

Token Metadata (on IPFS):
- freelancerAddress, tier, tierName
- jobsCompletedAtMint, averageRatingAtMint, totalEarnedAtMint, mintedAt

Key Functions:
checkAndMint(freelancer, totalJobsDone, avgRating, totalEarned)
    → only EscrowPlatform
    → if totalJobsDone crosses next threshold: burn old NFT, mint new tier NFT
    → otherwise: no-op

_beforeTokenTransfer(from, to, tokenId, batchSize)
    → if from != address(0) && to != address(0): revert("Soulbound: not transferable")
```

---

### 4. `ProfileRegistry.sol`

Maps wallet addresses to IPFS profile hashes. Enables browsing freelancers by skill.

```
Struct:
- string ipfsHash        → JSON: { name, role, skills[], bio, portfolioURL }
- uint registeredAt
- bool isRegistered

Key Functions:
registerProfile(ipfsHash)   → stores IPFS hash for msg.sender
updateProfile(ipfsHash)     → only registered users
getProfile(address)         → returns (ipfsHash, registeredAt, isRegistered)
isRegistered(address)       → bool
```

---

## Fee Structure

```
─────────────────────────────────────────────────────────────────
CLIENT FEE (at job creation):
  Client deposits D USDC
  Platform fee     = 2% of D  → platformTreasury immediately
  Available budget = 98% of D → sum(milestones) must not exceed this

  On job cancellation (no freelancer approved yet):
  → full refund of D to client (including the 2% fee)
─────────────────────────────────────────────────────────────────
FREELANCER FEE (per milestone approval — happy path):
  Milestone amount M
  Platform share   = 8% of M → platformTreasury
  Freelancer gets  = 92% of M

  Platform total on happy path = 2% of D + 8% of each milestone
─────────────────────────────────────────────────────────────────
DISPUTE PATH (on disputed milestone M):
  Sent to DisputeDAO when dispute is raised:
    → Arbitrators:  6% of M   (majority voters, split equally)
    → Platform:     2% of M   (forwarded to treasury on resolution)
  Total deducted:   8% of M   ← same as happy path, no surprises

  Remaining in EscrowPlatform: 92% of M → goes to winner

  IF CLIENT WINS:
    → Arbitrators get 6% of M
    → Platform gets  2% of M
    → Client gets back: 92% of M + all future PENDING milestone amounts
    → Freelancer: nothing for disputed or future milestones
    → Freelancer: FLAGGED (+1, banned at 3 flags)

  IF FREELANCER WINS:
    → Arbitrators get 6% of M
    → Platform gets  2% of M
    → Freelancer gets: 92% of M  (same net as happy path approval)
    → Client gets back: all future PENDING milestone amounts in full

  MINORITY / NON-VOTING ARBITRATORS:
    → Lose 10% of their staked USDC → platformTreasury

  Already-released milestones: untouched in all scenarios
─────────────────────────────────────────────────────────────────
GRACEFUL EXIT (selfReportPoorWork + cancelJob):
  → Client refund: 100% of deposit D (reward + 2% fee returned)
  → Freelancer: no payment, no flag
  → Platform: no fee kept
─────────────────────────────────────────────────────────────────
DAO FEE BOUNDS (hard-coded, immutable):
  MIN_FEE_PERCENT = 1%
  MAX_FEE_PERCENT = 8%
─────────────────────────────────────────────────────────────────

Summary table:
┌──────────────────────┬────────────┬─────────────┬────────────────┐
│ Scenario             │ Platform   │ Arbitrators │ Notes          │
├──────────────────────┼────────────┼─────────────┼────────────────┤
│ Happy path           │ 2%D + 8%M  │ 0           │ Client 98%D    │
│                      │            │             │ budget used    │
├──────────────────────┼────────────┼─────────────┼────────────────┤
│ Dispute, client wins │ 2%D + 2%M  │ 6% of M     │ 92%M → client │
├──────────────────────┼────────────┼─────────────┼────────────────┤
│ Dispute, free. wins  │ 2%D + 2%M  │ 6% of M     │ 92%M → freel. │
├──────────────────────┼────────────┼─────────────┼────────────────┤
│ Cancelled (OPEN)     │ 0          │ 0           │ Full refund    │
├──────────────────────┼────────────┼─────────────┼────────────────┤
│ Poor work exit       │ 0          │ 0           │ Full refund    │
└──────────────────────┴────────────┴─────────────┴────────────────┘
```

---

## Freelancer Flag & Ban System

```
Flag is added internally when CLIENT_WINS a dispute.

Flag 1: Warning — visible on freelancer's profile
Flag 2: Caution — frontend shows warning badge to clients viewing their profile
Flag 3: Permanent ban
    → bannedFreelancers[address] = true
    → applyToJob() reverts for this address forever
    → Cannot be overturned by anyone (not DAO, not multisig)
    → Flags are on-chain and immutable

New address workaround:
    → A banned freelancer can create a new wallet
    → They lose ALL soulbound NFT tiers, job history, and ratings
    → Starting from zero after building a Legend-tier profile is the deterrent
```

---

## Arbitrator Incentive Design

```
Arbitrators earn ONLY during dispute resolution (nothing from happy path).
The 6% of M is large relative to individual job sizes — intentionally so,
to compensate arbitrators for idle periods between disputes.

Incentive to vote honestly:
- Majority voters: earn equal share of 6% of M
- Minority voters: lose 10% of staked USDC → platform treasury
- Non-voters:      lose 10% of staked USDC → platform treasury (inactivity slash)

Outcome neutrality:
- Arbitrators earn 6% of M regardless of who wins
- Their only financial risk is being wrong or absent
- No financial reason to favour client or freelancer

Volume handling:
- 3 arbitrators assigned per dispute
- With 60 staked arbitrators: up to 20 disputes can run simultaneously
- Fee incentives attract more arbitrators as platform grows (self-balancing)

Stuck dispute prevention:
- resolveDispute() is callable by anyone after the 2-day window closes
- Resolution uses majority of votes CAST (not total assigned)
- Non-voters are slashed — strong incentive to always vote
```

---

## Data Flow — Happy Path

```
1. Client calls createJob(milestones[], amounts[], deadline, SMART_CONTRACT_DEVELOPMENT, 100 USDC)
      → 2 USDC → platform treasury, 98 USDC locked in contract, status → OPEN
      ↓
2. Three freelancers call applyToJob(jobId)
      ↓
3. Client reviews profiles, calls approveApplicant(jobId, bestFreelancer)
      → freelancer set, status → ACTIVE
      ↓
4. Freelancer completes milestone 1, calls submitMilestone(jobId, 0, "github.com/repo/pr/1")
      ↓
5. Client reviews, calls approveMilestone(jobId, 0)
      → 8% of milestone amount → platform treasury
      → 92% of milestone amount → freelancer wallet
      ↓
6. Steps 4–5 repeat for each milestone
      ↓
7. All milestones released → status → COMPLETED
      → ReputationNFT.checkAndMint() called
```

---

## Data Flow — Dispute Path

```
1. Freelancer submits milestone. Client disputes the quality.
      ↓
2. Client calls raiseDispute(jobId, 0, clientEvidenceIPFSHash)
      → milestone → DISPUTED, job → DISPUTED
      → 6% + 2% of milestone.amount transferred to DisputeDAO
      ↓
3. Freelancer calls submitEvidence(disputeId, freelancerEvidenceIPFSHash)
      ↓
4. DisputeDAO assigns 3 random arbitrators, 2-day voting window opens
      ↓
5. Arbitrators review both IPFS evidence files and vote
      ↓
6. After 2 days, anyone calls resolveDispute(disputeId)
      → majority wins
      → 6% of M split among majority voters
      → 2% of M → platform treasury
      → minority/non-voters slashed 10% of stake → platform treasury
      ↓
7. DisputeDAO calls EscrowPlatform.releaseFundsAfterDispute(winner)
      → 92% of milestone + future milestones distributed per outcome
      → job → CLOSED
```

---

## Data Flow — Graceful Exit

```
1. Freelancer realises work is below standard
      ↓
2. Freelancer calls selfReportPoorWork(jobId)
      ↓
3. Client calls cancelJob(jobId)
      → full deposit D refunded to client (including the 2% fee)
      → no fee to platform
      → freelancer not flagged
      → job → CANCELLED
```

---

## Backend & Infrastructure

These are off-chain services that complement the smart contract layer.
None of these require on-chain transactions.

### Chat — XMTP Protocol
```
What: Decentralised wallet-to-wallet messaging protocol.
Use: Client and freelancer communicate directly via their wallet addresses.
Why XMTP: Messages are end-to-end encrypted, stored on XMTP nodes (not our servers),
           and owned by the users — consistent with the platform's self-sovereign ethos.
How: Frontend integrates the XMTP JS SDK. A chat thread is opened between
     job.client and job.freelancer automatically when a job becomes ACTIVE.
```

### Email Notifications — Event Listener Service
```
What: A backend Node.js service that listens to on-chain events and sends emails.
Why: Many users (especially non-crypto natives) expect email updates.

Events → Emails:
  JobCreated(jobId)           → nothing (client created it)
  AppliedToJob(jobId, addr)   → email to client: "New application on your job"
  ApplicantApproved(jobId)    → email to freelancer: "You've been approved, work can begin"
  MilestoneSubmitted(jobId)   → email to client: "Freelancer submitted milestone for review"
  MilestoneApproved(jobId)    → email to freelancer: "Milestone approved, payment sent"
  DisputeOpened(disputeId)    → email to both parties and assigned arbitrators
  DisputeResolved(disputeId)  → email to both parties with outcome

Stack: Node.js + ethers.js event listeners + SendGrid (or Resend) for email delivery.
Users opt-in by providing an email in their profile (stored encrypted off-chain).
```

### Gas Relayer — ERC-2771 Meta-Transactions
```
What: Platform pays gas fees on behalf of users (clients, freelancers, DAO stakers).
Why: Removes the friction of needing native LSK tokens to pay gas — especially
     important for onboarding non-crypto users.

How it works:
  1. User signs a transaction message with their wallet (free, no gas)
  2. Signed message is sent to the platform's Relayer service
  3. Relayer wraps it in a meta-transaction and submits it on-chain, paying gas
  4. EscrowPlatform, DisputeDAO, and ReputationNFT implement ERC-2771 (trust the forwarder)
  5. _msgSender() is overridden to extract the original signer from calldata

Stack: OpenZeppelin's MinimalForwarder contract + a backend relay service.
Cost: Platform absorbs gas costs — recovered through platform fees (2% + 8%).
```

### Account Abstraction — EIP-4337
```
What: Users can log in with social accounts (Google, email) instead of a crypto wallet.
Why: The biggest barrier to Web3 adoption is wallet setup. AA removes this completely.

How it works:
  1. User signs up with Google/email via Privy or Web3Auth
  2. The AA provider creates a smart contract wallet for them behind the scenes
  3. From the user's perspective: it's a normal login. No seed phrases, no MetaMask.
  4. Their smart contract wallet interacts with TrustWork contracts exactly like any wallet.
  5. Users can later export their wallet if they want full self-custody.

Stack: Privy (recommended) or Web3Auth for social login → EIP-4337 smart contract wallet.
Note: Works alongside the Gas Relayer — both AA and ERC-2771 can be used together.
     AA users get gasless + social login. Crypto-native users use their own wallet.
```

---

## Contract Relationship Map

```
                ┌─────────────────────────┐
                │    EscrowPlatform.sol   │
                │                         │
                │  holds 98% of deposit   │
                │  tracks all jobs        │
                │  manages flag/ban       │
                └────┬──────────┬─────────┘
                     │          │
    sends 8% of M    │          │  calls on
    on raiseDispute  │          │  job COMPLETED
                     │          │
         ┌───────────▼──┐   ┌───▼────────────┐
         │ DisputeDAO   │   │ ReputationNFT  │
         │              │   │                │
         │ holds 6%+2%  │   │ soulbound NFTs │
         │ of M         │   │ 5 tier system  │
         │ distributes  │   └────────────────┘
         │ on resolve   │
         └──────┬───────┘
                │
calls releaseFundsAfterDispute()
     (releases 92% of M to winner)
                │
        back to EscrowPlatform
```

---

## Frontend Architecture (Next.js + wagmi + ethers.js)

```
/app
  /jobs                 → browse open jobs, filter by category/skill/budget
  /jobs/[jobId]         → job detail: milestones, applicants list, status tracker
  /post-job             → create job: category, milestones, amounts, deposit in one step
  /dashboard            → active jobs, earnings, disputes for both roles
  /dispute/[disputeId]  → IPFS evidence upload, vote status, resolution result
  /profile/[address]    → wallet profile, soulbound badge, job history, flag count
  /arbitrate            → arbitrator pool: stake, assigned disputes, vote panel

/components
  JobCard               → job listing with category badge, budget, deadline
  MilestoneCard         → status, submit/approve/reject/dispute actions
  ApplicantList         → list of applicants with profile links, approve button
  DisputePanel          → evidence IPFS upload, vote progress, outcome display
  ReputationBadge       → current tier NFT display + job count progress bar
  FeeBreakdown          → shows client: deposit → 2% fee → available budget
  FlagWarning           → caution banner if freelancer has 1 or 2 flags
  ChatPanel             → XMTP-powered chat between client and freelancer
  WalletConnect         → RainbowKit + Privy (supports both wallet and social login)

/hooks
  useJob(jobId)         → read/write EscrowPlatform for a specific job
  useDispute(id)        → interact with DisputeDAO
  useReputation(addr)   → fetch soulbound NFT and tier
  useProfile(addr)      → read/write ProfileRegistry
  useArbitrator()       → stake management, assigned disputes
  useChat(jobId)        → XMTP thread between job parties
```

---

## Tech Stack

| Layer                  | Technology                                        |
|------------------------|---------------------------------------------------|
| Smart Contracts        | Solidity ^0.8.20                                  |
| Contract Framework     | Hardhat                                           |
| Security Library       | OpenZeppelin Contracts                            |
| Payment Token          | USDC (ERC-20) on Lisk Network                     |
| NFT Standard           | ERC-721 (soulbound via hook override)             |
| Meta-transactions      | ERC-2771 (OpenZeppelin MinimalForwarder)          |
| Account Abstraction    | EIP-4337 via Privy or Web3Auth                    |
| Frontend               | Next.js 14 (App Router)                           |
| Wallet Integration     | wagmi v2 + RainbowKit                             |
| Social Login           | Privy (email/Google → smart contract wallet)      |
| Ethereum Library       | ethers.js v6                                      |
| Decentralised Chat     | XMTP Protocol                                     |
| File Storage           | IPFS via Pinata (dispute evidence only)           |
| Email Notifications    | Node.js event listener + SendGrid / Resend        |
| Styling                | Tailwind CSS                                      |
| Testing                | Hardhat + Chai                                    |
| Deployment             | Lisk Sepolia testnet                              |

---

## Security Considerations

- **ReentrancyGuard** — on all USDC-moving functions
- **Per-job balance tracking** — `availableForWork` + `amountReleased` prevent cross-job fund leakage
- **ERC-20 approval pattern** — `transferFrom` requires prior client approval, no unilateral pulls
- **Role modifiers** — `onlyClient(jobId)`, `onlyFreelancer(jobId)` on every sensitive function
- **DisputeDAO whitelist** — only the registered DisputeDAO address can call `releaseFundsAfterDispute()`
- **Fee bounds** — `MIN_FEE_PERCENT` and `MAX_FEE_PERCENT` are immutable constants
- **Emergency pause** — multisig-controlled, halts all fund movement during exploits
- **Arbitrator pool minimum** — `openDispute()` reverts if fewer than 3 arbitrators available
- **IPFS hash integrity** — content hashes stored on-chain, not mutable URLs
- **Soulbound hook** — `_beforeTokenTransfer()` reverts on any wallet-to-wallet NFT transfer
- **Overflow protection** — Solidity 0.8+ native
- **Basis points math** — all percentages use integer basis points (e.g. 200 = 2%) to avoid floating point precision loss
- **ERC-2771 trust** — `_msgSender()` correctly extracts original signer when called via forwarder

---

## DAO Governance

```
DAO-controlled (within hard-coded bounds):
- feePercent             → [1%, 8%]
- votingPeriod           → [24 hours, 7 days]
- minArbitratorStake     → [50 USDC, 1000 USDC]
- platformTreasury       → fee recipient address

Multisig-controlled (3-of-5, emergency only):
- pause() / unpause()    → freeze all fund movement
- setDisputeDAO()        → update DisputeDAO address if contract is upgraded
- setUSDCToken()         → update USDC address (emergency only)

Nobody controls:
- Individual job or dispute outcomes
- User fund balances
- Freelancer flags (immutable once written)
- Soulbound NFT data
```

---

## Sprint Plan (2 Weeks)

| Days   | Task |
|--------|------|
| 1–4    | EscrowPlatform: full lifecycle, fee logic, categories, flag/ban + Hardhat tests |
| 5–7    | DisputeDAO: staking, random selection, voting, resolution, slash logic + tests   |
| 8–9    | ReputationNFT (soulbound tiers) + ProfileRegistry + integration tests            |
| 10–11  | Frontend: job board with categories, post-job with deposit, milestone tracker    |
| 12–13  | Frontend: dispute panel + IPFS upload + arbitrator dashboard + XMTP chat         |
| 14     | Deploy to Lisk Sepolia, connect email listener, end-to-end testing, demo polish  |

---

## Post-MVP Extensions

- **Chainlink VRF** — upgrade arbitrator selection from `block.prevrandao` to verifiable randomness
- **The Graph** — index job/dispute events for fast frontend queries
- **Tiered arbitration** — 3 arbitrators for small disputes, 5 for large value disputes
- **GPS / mobile app** — React Native + WalletConnect
- **Multi-token support** — accept USDT or DAI alongside USDC
- **On-chain KYC** — optional Worldcoin or Proof of Humanity integration
- **Governance token** — community ownership and weighted DAO voting
- **Subscription tiers** — reduced platform fee for high-volume clients or freelancers
