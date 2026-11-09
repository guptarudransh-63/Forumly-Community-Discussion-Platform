import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['Post', 'Comment'],
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    value: {
      type: Number,
      enum: [-1, 1],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Source of truth: strictly one active vote record per user per target
voteSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });
voteSchema.index({ targetType: 1, targetId: 1 });

export const Vote = mongoose.model('Vote', voteSchema);
