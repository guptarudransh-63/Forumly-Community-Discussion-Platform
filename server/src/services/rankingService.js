const EPOCH_START = 1700000000; // Reference epoch in seconds (Nov 2023)
const DECAY_CONSTANT = 45000; // Half-life decay factor (~12.5 hours)

/**
 * Calculates Reddit-style Hot ranking score combining net vote score with time decay
 * @param {number} score - Net vote score (upvotes - downvotes)
 * @param {Date|number} createdAt - Creation date or timestamp
 * @returns {number} Deterministic hot ranking score
 */
export function calculateHotScore(score, createdAt) {
  const postTime = typeof createdAt === 'number' ? createdAt : new Date(createdAt).getTime();
  const seconds = Math.floor(postTime / 1000) - EPOCH_START;

  let sign = 0;
  if (score > 0) sign = 1;
  else if (score < 0) sign = -1;

  const order = Math.log10(Math.max(Math.abs(score), 1));
  const rawScore = sign * order + seconds / DECAY_CONSTANT;

  return Math.round(rawScore * 10000000) / 10000000;
}

/**
 * Generates an opaque base64 cursor from sort parameters
 * @param {any} sortValue - Primary sort value (e.g. date, score, hotScore)
 * @param {string} id - Unique document identifier for stable tie-breaking
 * @returns {string} Encoded cursor
 */
export function encodeCursor(sortValue, id) {
  const payload = {
    v: sortValue instanceof Date ? sortValue.toISOString() : sortValue,
    id: id.toString(),
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/**
 * Decodes an opaque base64 cursor
 * @param {string} cursor - Encoded cursor string
 * @returns {{ v: any, id: string }|null}
 */
export function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.id !== undefined && parsed.v !== undefined) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Constructs a MongoDB filter for cursor pagination based on sort direction
 * @param {string} sortField - Model field name (e.g. 'hotRankScore', 'createdAt', 'score')
 * @param {'asc'|'desc'} direction - Sort direction
 * @param {string} cursor - Encoded cursor
 * @returns {object} Mongo query clause
 */
export function buildCursorQuery(sortField, direction, cursor) {
  const decoded = decodeCursor(cursor);
  if (!decoded) return {};

  let sortVal = decoded.v;
  // If date string
  if (typeof sortVal === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(sortVal)) {
    sortVal = new Date(sortVal);
  }

  const compOp = direction === 'desc' ? '$lt' : '$gt';

  return {
    $or: [
      { [sortField]: { [compOp]: sortVal } },
      {
        [sortField]: sortVal,
        _id: { [compOp]: decoded.id },
      },
    ],
  };
}
