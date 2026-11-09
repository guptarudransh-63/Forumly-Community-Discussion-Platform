import { Notification } from '../models/index.js';
import { getIO } from '../sockets/index.js';

/**
 * Creates and delivers a notification (persisted + real-time socket emit)
 */
export async function createNotification({
  recipient,
  sender,
  type,
  entityId,
  entityType = 'Post',
  message,
  link = '',
}) {
  if (!recipient) return null;

  // Prevent notifying self
  if (sender && recipient.toString() === sender.toString()) {
    return null;
  }

  // Idempotency: avoid creating duplicate notification for the same action within 5 minutes
  const recentWindow = new Date(Date.now() - 5 * 60 * 1000);
  const existing = await Notification.findOne({
    recipient,
    sender,
    type,
    entityId,
    createdAt: { $gte: recentWindow },
  });

  if (existing) {
    return existing;
  }

  const notification = await Notification.create({
    recipient,
    sender,
    type,
    entityId,
    entityType,
    message,
    link,
  });

  const populated = await notification.populate('sender', 'username displayName avatarUrl');

  // Push real-time event through Socket.IO if available
  const io = getIO();
  if (io) {
    io.to(`user:${recipient.toString()}`).emit('notification:new', populated);
  }

  return populated;
}
