import mongoose from 'mongoose';

const pollOptionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  voteCount: {
    type: Number,
    default: 0,
  },
  voters: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
});

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 300,
    },
    body: {
      type: String,
      trim: true,
      maxlength: 40000,
      default: '',
    },
    postType: {
      type: String,
      enum: ['text', 'link', 'image', 'poll'],
      default: 'text',
      index: true,
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mediaUrls: [
      {
        type: String,
      },
    ],
    externalUrl: {
      type: String,
      trim: true,
      default: '',
    },
    pollData: {
      options: [pollOptionSchema],
      expiresAt: {
        type: Date,
        default: null,
      },
    },
    flair: {
      text: { type: String, default: '' },
      backgroundColor: { type: String, default: '' },
      textColor: { type: String, default: '' },
    },
    score: {
      type: Number,
      default: 0,
      index: true,
    },
    upvoteCount: {
      type: Number,
      default: 0,
    },
    downvoteCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    hotRankScore: {
      type: Number,
      default: 0,
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    isRemoved: {
      type: Boolean,
      default: false,
      index: true,
    },
    removedReason: {
      type: String,
      default: '',
    },
    removedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for feeds and queries
postSchema.index({ community: 1, createdAt: -1 });
postSchema.index({ hotRankScore: -1, _id: -1 });
postSchema.index({ score: -1, _id: -1 });
postSchema.index({ createdAt: -1, _id: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ title: 'text', body: 'text' });

export const Post = mongoose.model('Post', postSchema);
