import mongoose from 'mongoose';

const moderationLogSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true,
    },
    moderator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'remove_post',
        'restore_post',
        'remove_comment',
        'restore_comment',
        'lock_post',
        'unlock_post',
        'pin_post',
        'unpin_post',
        'ban_user',
        'unban_user',
        'mute_user',
        'update_rules',
        'resolve_report',
        'dismiss_report',
      ],
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    targetType: {
      type: String,
      default: '',
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

moderationLogSchema.index({ community: 1, createdAt: -1 });

export const ModerationLog = mongoose.model('ModerationLog', moderationLogSchema);
