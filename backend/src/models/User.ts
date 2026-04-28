import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  walletAddress: string;
  smartWalletAddress?: string;
  provider: 'privy' | 'web3auth' | 'wallet';
  privyUserId?: string;
  email?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    walletAddress: { type: String, required: true, unique: true, lowercase: true },
    smartWalletAddress: { type: String, lowercase: true },
    provider: { type: String, enum: ['privy', 'web3auth', 'wallet'], required: true },
    privyUserId: { type: String },
    email: { type: String },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
