import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { env } from '../config/env';
import { RelayJob } from '../models/RelayJob';

// Minimal MinimalForwarder ABI — only what we need
const FORWARDER_ABI = [
  'function getNonce(address from) view returns (uint256)',
  'function execute(tuple(address from, address to, uint256 value, uint256 gas, uint256 nonce, bytes data) req, bytes signature) payable returns (bool, bytes)',
];

const provider = new ethers.JsonRpcProvider(env.RPC_URL);
const relayerWallet = new ethers.Wallet(env.RELAYER_PRIVATE_KEY, provider);
const forwarder = new ethers.Contract(env.FORWARDER_ADDRESS, FORWARDER_ABI, relayerWallet);

export const getNonce = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params;
    const nonce: bigint = await forwarder.getNonce(address);
    res.json({ nonce: nonce.toString() });
  } catch (err) {
    next(err);
  }
};

export const relay = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to, data, nonce, signature } = req.body as {
      from: string;
      to: string;
      data: string;
      nonce: number;
      signature: string;
    };

    const job = await RelayJob.create({ from, to, data, nonce, signature, status: 'pending' });

    const request = { from, to, value: 0, gas: 500_000, nonce, data };
    const tx = await forwarder.execute(request, signature);

    job.txHash = tx.hash;
    job.status = 'submitted';
    await job.save();

    // Confirm async — don't block the response
    tx.wait()
      .then(() => RelayJob.findByIdAndUpdate(job._id, { status: 'confirmed' }))
      .catch((e: Error) => RelayJob.findByIdAndUpdate(job._id, { status: 'failed', error: e.message }));

    res.status(202).json({ jobId: job._id, txHash: tx.hash });
  } catch (err) {
    next(err);
  }
};

export const getJobStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await RelayJob.findById(req.params.id).select('-__v');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) {
    next(err);
  }
};
