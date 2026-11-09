import mongoose from 'mongoose';

const ruleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  order: {
    type: Number,
    default: 0,
  },
});

const communitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-zA-Z0-9_]+$/, 'Community slug can only contain letters, numbers, and underscores'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    iconUrl: {
      type: String,
      default: '',
    },
    bannerUrl: {
      type: String,
      default: '',
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    privacyType: {
      type: String,
      enum: ['public', 'restricted', 'private'],
      default: 'public',
      index: true,
    },
    postingPermission: {
      type: String,
      enum: ['anyone', 'members_only', 'approved_only'],
      default: 'members_only',
    },
    rules: [ruleSchema],
    memberCount: {
      type: Number,
      default: 1,
      min: 0,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

communitySchema.index({ name: 'text', description: 'text', slug: 'text' });

export const Community = mongoose.model('Community', communitySchema);
