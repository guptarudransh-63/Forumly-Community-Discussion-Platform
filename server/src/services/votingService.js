import { Vote, Post, Comment, User } from '../models/index.js';
import { calculateHotScore } from './rankingService.js';

/**
 * Executes an atomic vote operation for a post or comment
 * @param {string} userId - Voter user id
 * @param {'Post'|'Comment'} targetType - Target model type
 * @param {string} targetId - Target document id
 * @param {1|-1|0} requestedValue - Requested vote: +1, -1, or 0 (unvote)
 */
export async function castVote(userId, targetType, targetId, requestedValue) {
  if (![1, -1, 0].includes(requestedValue)) {
    throw new Error('Vote value must be 1, -1, or 0');
  }

  // 1. Fetch Target Model
  const Model = targetType === 'Post' ? Post : Comment;
  const targetDoc = await Model.findById(targetId);

  if (!targetDoc) {
    const error = new Error(`${targetType} not found`);
    error.status = 404;
    throw error;
  }

  if (targetDoc.isRemoved) {
    const error = new Error(`Cannot vote on removed ${targetType.toLowerCase()}`);
    error.status = 400;
    throw error;
  }

  // 2. Find existing vote record
  const existingVote = await Vote.findOne({
    user: userId,
    targetType,
    targetId,
  });

  const previousValue = existingVote ? existingVote.value : 0;

  // Idempotency: if already at the requested state, return current values without modifications
  if (previousValue === requestedValue) {
    return {
      targetId,
      targetType,
      userVote: requestedValue,
      score: targetDoc.score,
      upvoteCount: targetDoc.upvoteCount,
      downvoteCount: targetDoc.downvoteCount,
    };
  }

  // 3. Compute score and count deltas
  let scoreDelta = 0;
  let upvoteDelta = 0;
  let downvoteDelta = 0;

  if (previousValue === 0) {
    if (requestedValue === 1) {
      scoreDelta = 1;
      upvoteDelta = 1;
    } else if (requestedValue === -1) {
      scoreDelta = -1;
      downvoteDelta = 1;
    }
  } else if (previousValue === 1) {
    if (requestedValue === -1) {
      scoreDelta = -2;
      upvoteDelta = -1;
      downvoteDelta = 1;
    } else if (requestedValue === 0) {
      scoreDelta = -1;
      upvoteDelta = -1;
    }
  } else if (previousValue === -1) {
    if (requestedValue === 1) {
      scoreDelta = 2;
      upvoteDelta = 1;
      downvoteDelta = -1;
    } else if (requestedValue === 0) {
      scoreDelta = 1;
      downvoteDelta = -1;
    }
  }

  // 4. Update or Delete Vote record
  if (requestedValue === 0) {
    if (existingVote) {
      await Vote.deleteOne({ _id: existingVote._id });
    }
  } else if (existingVote) {
    existingVote.value = requestedValue;
    await existingVote.save();
  } else {
    await Vote.create({
      user: userId,
      targetType,
      targetId,
      value: requestedValue,
    });
  }

  // 5. Update Target with atomic $inc
  const updatedDoc = await Model.findByIdAndUpdate(
    targetId,
    {
      $inc: {
        score: scoreDelta,
        upvoteCount: upvoteDelta,
        downvoteCount: downvoteDelta,
      },
    },
    { new: true }
  );

  // 6. If Post, update hotRankScore
  if (targetType === 'Post' && updatedDoc) {
    const newHotScore = calculateHotScore(updatedDoc.score, updatedDoc.createdAt);
    updatedDoc.hotRankScore = newHotScore;
    await updatedDoc.save();
  }

  // 7. Update author karma
  if (updatedDoc && updatedDoc.author && scoreDelta !== 0) {
    const karmaField = targetType === 'Post' ? 'postKarma' : 'commentKarma';
    const authorId = updatedDoc.author._id || updatedDoc.author;
    await User.findByIdAndUpdate(authorId, {
      $inc: { [karmaField]: scoreDelta },
    });
  }

  return {
    targetId,
    targetType,
    userVote: requestedValue,
    score: updatedDoc.score,
    upvoteCount: updatedDoc.upvoteCount,
    downvoteCount: updatedDoc.downvoteCount,
  };
}
