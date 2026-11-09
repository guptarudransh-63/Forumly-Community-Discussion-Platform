# Forumly — Full-Stack Reddit Clone

**Forumly** is a complete community-driven discussion platform engineered with Node.js, Express, MongoDB, React, Vite, and Tailwind CSS. It supports public, restricted, and private communities, nested threaded comments, an atomic voting engine with strict score integrity, Reddit-style hot ranking and deterministic cursor pagination, a full community moderation suite with auditable history, search, bookmarks, and real-time Socket.IO alerts.

---

## 🌟 Key Features

### 1. Communities & Granular Roles
- **Community Types**:
  - `Public`: Discoverable and readable by anyone; joinable by all.
  - `Restricted`: Publicly visible; submissions restricted to approved contributors.
  - `Private`: Exclusive access; posts, member lists, and search queries strictly forbidden to non-members.
- **Role-Based Access Control**:
  - `Owner`: Full management of settings, rules, and moderators.
  - `Moderator`: Queue review, content removals/restorations, discussion locking/pinning, member muting and banning.
  - `Member` / `Approved Contributor`.

### 2. Multi-Type Posts & Engagement
- **Post Types**:
  - **Text Posts**: Rich markdown formatting.
  - **Image Posts**: Uploaded with MIME verification and local asset hosting.
  - **Link Posts**: External URL preview.
  - **Poll Posts**: Interactive voting with dynamic percentage progress bars and duplicate vote prevention.
- Custom post flair tagging.
- Pinned announcements and locked comment threads.

### 3. Atomic Voting & Score Integrity
- **Strictly One Vote**: Unique compound index on `(user, targetType, targetId)`.
- **Atomic Deltas**: Uses atomic MongoDB `$inc` operations for concurrent vote changes (`+1`, `-1`, `0`).
- **Idempotency**: Repeated upvotes or downvotes do not artificially inflate scores.
- **Author Karma**: Post karma and comment karma are automatically updated on each vote change.

### 4. Ranking & Cursor Pagination
- **Hot Ranking**: Deterministic Reddit-inspired time-decay logarithm:
  $$\text{order} = \log_{10}(\max(|\text{score}|, 1))$$
  $$\text{sign} = \begin{cases} 1 & \text{score} > 0 \\ 0 & \text{score} = 0 \\ -1 & \text{score} < 0 \end{cases}$$
  $$\text{hotScore} = \text{round}\left(\text{sign} \cdot \text{order} + \frac{\text{seconds}}{45000}, 7\right)$$
- **New & Top**: Sort by recency or score across customizable timeframes (`today`, `week`, `month`, `year`, `all`).
- **Cursor Pagination**: Stable Base64 cursors (`{ sortValue, _id }`) prevent item duplication or omissions as scores shift during live scrolling.

### 5. Nested Threaded Comments
- Recursive discussion trees with collapsible vertical thread guidelines.
- Depth limits preventing runaway nesting.
- **Deletion Placeholder Safety**: Removed parent comments display `[deleted]` while preserving child replies without orphaning conversations.

### 6. Full Moderation Suite
- **User Reporting**: Submit reports with reason classifications (`spam`, `harassment`, `rule_violation`, etc.).
- **Mod Queue**: Dedicated queue filtered by `open`, `resolved`, or `dismissed` with target content preview.
- **Quick Enforcement**: Content removal, discussion locking, and member bans.
- **Immutable Audit Trail**: Logs every moderator action with timestamps, reasons, and target IDs.

### 7. Search, Saved Posts & Real-Time Alerts
- **Global Search**: Search across posts, communities, and user profiles with autocomplete suggestions and privacy filtering.
- **Personal Bookmarks**: Private saved posts tab.
- **Real-Time WebSockets**: Instant notification delivery via Socket.IO.

---

## 🏗️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Zustand, TanStack Query v5, Lucide Icons |
| **Backend** | Node.js, Express.js, MongoDB, Mongoose, Socket.IO, Zod, Multer, Swagger UI |
| **Auth** | JWT in secure `HttpOnly` cookies, bcryptjs password hashing |
| **Testing** | Vitest, Supertest, MongoMemoryServer |

---

## 🚀 Quickstart & Setup

### Prerequisites
- Node.js (v18+)
- MongoDB daemon running locally on `localhost:27017` (or fallback to embedded memory server)

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Inspect `server/.env` (pre-created with secure development defaults):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/forumly
JWT_SECRET=forumly_super_secure_jwt_secret_key_change_in_production_2026
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
COOKIE_SECRET=forumly_cookie_secret_987654321
UPLOAD_DIR=./uploads
```

### 3. Seed Database with Realistic Demo Data
```bash
npm run seed
```
Creates demo communities (`r/technology`, `r/webdev`, `r/askforumly`, `r/staff_lounge`), demo users, posts, nested comment trees, votes, and sample moderation reports.

### 4. Run Automated Test Suite
```bash
npm test
```
Executes 28 automated tests across 5 test suites:
- `tests/voting.test.js`: First upvote, idempotent repeats, vote flipping (+1 to -1), score delta, karma updates, removed post rejection.
- `tests/feeds.test.js`: Hot decay, New sorting, Top timeframes, duplicate-free cursor pagination, private community security.
- `tests/comments.test.js`: Tree creation, nested replies, cross-post rejection, locked post enforcement, deletion preservation.
- `tests/moderation.test.js`: RBAC moderation enforcement, content removal, member bans, report resolution, audit logging.
- `tests/e2e.test.js`: Full 17-step end-to-end integration journey.

### 5. Launch Development Platform
```bash
npm run dev
```
- **Web Client**: [http://localhost:5173](http://localhost:5173)
- **REST API**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **Interactive Swagger Docs**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)

---

## 🔑 Demo Accounts

The frontend includes a **1-Click Demo Login** panel inside the Sign In modal:
- **System Admin**: `admin` / `Password123!`
- **Community Moderator**: `sarah_tech` / `Password123!` (Moderator of `r/technology`)
- **WebDev Lead**: `alex_frontend` / `Password123!` (Owner of `r/webdev`)
- **Casual Member**: `guest_user` / `Password123!`
