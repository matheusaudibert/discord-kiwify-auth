import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    discordId: {
      type: String,
      default: null,
    },
  },
  {
    collection: 'kiwify-members',
    timestamps: true,
  }
);

export default mongoose.model('KiwifyMember', schema);
