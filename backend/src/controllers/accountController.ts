import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';

/**
 * POST /api/account/register
 * Called after Privy/Web3Auth social login on the frontend.
 * Stores the EOA + smart contract wallet mapping in MongoDB.
 */
export const registerAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { walletAddress, smartWalletAddress, provider, privyUserId, email } = req.body as {
      walletAddress: string;
      smartWalletAddress?: string;
      provider: 'privy' | 'web3auth' | 'wallet';
      privyUserId?: string;
      email?: string;
    };

    const user = await User.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { smartWalletAddress, provider, privyUserId, email },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/account/:address
 * Resolve a wallet address to its stored profile.
 */
export const getAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findOne({ walletAddress: req.params.address.toLowerCase() }).select('-__v');
    if (!user) return res.status(404).json({ message: 'Account not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};
