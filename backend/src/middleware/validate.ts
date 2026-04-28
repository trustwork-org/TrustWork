import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { z } from 'zod';

export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.flatten().fieldErrors });
    }
    req.body = result.data;
    next();
  };

// ── Schemas ──────────────────────────────────────────────────────────────────

export const relaySchema = z.object({
  from: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  to: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  data: z.string().min(2),
  nonce: z.number().int().nonnegative(),
  signature: z.string().min(2),
});

export const registerAccountSchema = z.object({
  walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  smartWalletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  provider: z.enum(['privy', 'web3auth', 'wallet']),
  privyUserId: z.string().optional(),
  email: z.string().email().optional(),
});
