# TrustWork Smart Contracts

This workspace contains the Solidity contracts and deployment scripts for TrustWork.

## Key Contracts

1. `EscrowPlatform.sol` - job creation, milestones, escrow custody, settlement, and cancellation flows.
2. `DisputeDAO.sol` - arbitrator pool, voting, and dispute resolution.
3. `ReputationNFT.sol` - non-transferable reputation tiers.
4. `ProfileRegistry.sol` - wallet-to-IPFS profile mapping.

## Development Commands

```bash
forge install
forge build
forge test
forge fmt
```

## Deployment

```bash
forge script script/Deploy.s.sol --rpc-url $LISK_RPC --broadcast --verify
```

## Related Docs

1. [Contract Architecture](./ARCHITECTURE.md)
2. [Project Documentation Index](../docs/index.md)
3. [Development Setup](../docs/DEVELOPMENT.md)
