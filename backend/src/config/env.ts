import { z } from 'zod';

const schema = z.object({
  PORT: z.string().default('3001'),
  MONGODB_URI: z.string().min(1),
  RELAYER_PRIVATE_KEY: z.string().min(1),
  RPC_URL: z.string().url(),
  FORWARDER_ADDRESS: z.string().min(1),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
