import { Schema, model, Document } from 'mongoose';

export type RelayStatus = 'pending' | 'submitted' | 'confirmed' | 'failed';

export interface IRelayJob extends Document {
  from: string;
  to: string;
  data: string;
  nonce: number;
  signature: string;
  txHash?: string;
  status: RelayStatus;
  error?: string;
  createdAt: Date;
}

const RelayJobSchema = new Schema<IRelayJob>(
  {
    from: { type: String, required: true, lowercase: true },
    to: { type: String, required: true, lowercase: true },
    data: { type: String, required: true },
    nonce: { type: Number, required: true },
    signature: { type: String, required: true },
    txHash: { type: String },
    status: { type: String, enum: ['pending', 'submitted', 'confirmed', 'failed'], default: 'pending' },
    error: { type: String },
  },
  { timestamps: true }
);

export const RelayJob = model<IRelayJob>('RelayJob', RelayJobSchema);
