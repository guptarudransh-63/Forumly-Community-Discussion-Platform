import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import {
  User,
  Community,
  CommunityMember,
  Post,
  Comment,
  Vote,
  SavedPost,
  Report,
  ModerationLog,
  Notification,
} from '../models/index.js';
import { calculateHotScore } from '../services/rankingService.js';
import { castVote } from '../services/votingService.js';
import { createComment } from '../services/commentService.js';

export async function seedDatabase() {
  console.log('[Seed] Connecting to MongoDB database...');
  await connectDB();

  console.log('[Seed] Clearing previous collections...');
  await Promise.all([
    User.deleteMany({}),
    Community.deleteMany({}),
    CommunityMember.deleteMany({}),
    Post.deleteMany({}),
    Comment.deleteMany({}),
    Vote.deleteMany({}),
    SavedPost.deleteMany({}),
    Report.deleteMany({}),
    ModerationLog.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  console.log('[Seed] Creating demo users...');
  const users = await User.create([
    {
      username: 'admin',
      email: 'admin@forumly.io',
      passwordHash: 'Password123!',
      displayName: 'Forumly Admin',
      bio: 'Platform architect and system administrator. Building the future of open discussions.',
      role: 'admin',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&fit=crop&crop=faces',
      bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&fit=crop',
    },
    {
      username: 'sarah_tech',
      email: 'sarah@example.com',
      passwordHash: 'Password123!',
      displayName: 'Sarah Connor',
      bio: 'Distributed systems architect. Rust, Go, and high-throughput databases.',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&fit=crop&crop=faces',
      bannerUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&fit=crop',
    },
    {
      username: 'alex_frontend',
      email: 'alex@example.com',
      passwordHash: 'Password123!',
      displayName: 'Alex Rivers',
      bio: 'Staff Frontend Engineer. Obsessed with web performance, React 19, and accessible UI.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&fit=crop&crop=faces',
      bannerUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&fit=crop',
    },
    {
      username: 'maya_design',
      email: 'maya@example.com',
      passwordHash: 'Password123!',
      displayName: 'Maya Lin',
      bio: 'Lead Design Systems Engineer. Typography lover, Figma plugin creator, minimalist aesthetics.',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&fit=crop&crop=faces',
      bannerUrl: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=1200&fit=crop',
    },
    {
      username: 'david_cloud',
      email: 'david@example.com',
      passwordHash: 'Password123!',
      displayName: 'David Miller',
      bio: 'SRE & Platform Engineer. Kubernetes, Terraform, zero-downtime migrations.',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&fit=crop&crop=faces',
      bannerUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&fit=crop',
    },
    {
      username: 'elena_data',
      email: 'elena@example.com',
      passwordHash: 'Password123!',
      displayName: 'Dr. Elena Rostova',
      bio: 'AI researcher working on multimodal foundation models, agentic workflows, and neural inference.',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&fit=crop&crop=faces',
      bannerUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=1200&fit=crop',
    },
    {
      username: 'marcus_cyber',
      email: 'marcus@example.com',
      passwordHash: 'Password123!',
      displayName: 'Marcus Vance',
      bio: 'AppSec & Red Team specialist. Zero-trust networks, cryptographic audits, and web auth security.',
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&fit=crop&crop=faces',
      bannerUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&fit=crop',
    },
    {
      username: 'pixel_gamer',
      email: 'pixel@example.com',
      passwordHash: 'Password123!',
      displayName: 'Sam Riley',
      bio: 'Indie game developer & hardware tinkerer. Shader programming, mechanical keyboards, retro gaming.',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&fit=crop&crop=faces',
      bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&fit=crop',
    },
    {
      username: 'luna_writer',
      email: 'luna@example.com',
      passwordHash: 'Password123!',
      displayName: 'Luna Sterling',
      bio: 'Tech journalist and science fiction essayist. Writing about the social impact of automation.',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&fit=crop&crop=faces',
      bannerUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&fit=crop',
    },
    {
      username: 'guest_user',
      email: 'guest@forumly.io',
      passwordHash: 'Password123!',
      displayName: 'Casual Explorer',
      bio: 'Curious learner browsing thoughtful discussions.',
      avatarUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&fit=crop&crop=faces',
    },
  ]);

  const [admin, sarah, alex, maya, david, elena, marcus, pixel, luna, guest] = users;

  console.log('[Seed] Creating communities...');
  const tech = await Community.create({
    name: 'Technology',
    slug: 'technology',
    description: 'The front page for technological breakthroughs, hardware architectures, software engineering, and the computing frontier.',
    creator: sarah._id,
    privacyType: 'public',
    postingPermission: 'anyone',
    iconUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&fit=crop',
    rules: [
      { title: 'Submissions must be technology related', description: 'Focus on advances, architectures, and engineering topics.' },
      { title: 'No spam or disguised self-promotion', description: 'Genuine discussion only; affiliate links result in a ban.' },
      { title: 'Cite reputable primary sources', description: 'Link to official research papers, patents, or benchmark data.' },
    ],
    memberCount: 8,
  });

  const webdev = await Community.create({
    name: 'Web Development',
    slug: 'webdev',
    description: 'A community dedicated to all things modern web: React, Node, WebAssembly, browsers, CSS engines, and performance engineering.',
    creator: alex._id,
    privacyType: 'public',
    postingPermission: 'members_only',
    iconUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=150&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&fit=crop',
    rules: [
      { title: 'Include code examples or reproducers', description: 'Always provide runnable code or clear context for technical questions.' },
      { title: 'Constructive code critique only', description: 'Help peers grow; explain the reasoning behind your architectural advice.' },
      { title: 'No repetitive library spam', description: 'Search existing discussions before announcing duplicate utility packages.' },
    ],
    memberCount: 7,
  });

  const design = await Community.create({
    name: 'Design & UX',
    slug: 'design',
    description: 'Product design, design systems, visual hierarchy, ergonomics, typography, and human-computer interaction.',
    creator: maya._id,
    privacyType: 'public',
    postingPermission: 'anyone',
    iconUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=150&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=1200&fit=crop',
    rules: [
      { title: 'Show your process', description: 'When sharing prototypes, include the problem statement and research findings.' },
      { title: 'Emphasize accessibility', description: 'Design for all users: WCAG contrast, screen reader semantics, and focus states.' },
    ],
    memberCount: 6,
  });

  const science = await Community.create({
    name: 'Science & Cosmos',
    slug: 'science',
    description: 'Exploring astrophysics, quantum mechanics, biology, clean energy, and experimental discovery.',
    creator: elena._id,
    privacyType: 'public',
    postingPermission: 'anyone',
    iconUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=150&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&fit=crop',
    rules: [
      { title: 'Peer-reviewed evidence required', description: 'Extraordinary claims require rigorous experimental citations.' },
      { title: 'Maintain civil scientific debate', description: 'Focus on methodological rigor and reproducibility.' },
    ],
    memberCount: 6,
  });

  const gaming = await Community.create({
    name: 'Gaming Lounge',
    slug: 'gaming',
    description: 'Game design, PC hardware, indie game discoveries, speedruns, mechanics analysis, and gaming setups.',
    creator: pixel._id,
    privacyType: 'public',
    postingPermission: 'anyone',
    iconUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&fit=crop',
    rules: [
      { title: 'Tag spoilers clearly', description: 'Use spoiler tags when discussing plot points or late-game revelations.' },
      { title: 'Respect all platforms', description: 'Console vs PC wars are prohibited; celebrate great game craftsmanship.' },
    ],
    memberCount: 5,
  });

  const ask = await Community.create({
    name: 'Ask Forumly',
    slug: 'askforumly',
    description: 'Inquisitive questions, career crossroads, architectural debates, and thoughtful open discussions.',
    creator: admin._id,
    privacyType: 'public',
    postingPermission: 'anyone',
    iconUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&fit=crop',
    rules: [
      { title: 'Open-ended questions only', description: 'Pose questions that invite diverse experiences and deep perspectives.' },
      { title: 'Serious replies when marked', description: 'Engage respectfully with genuine real-world advice.' },
    ],
    memberCount: 8,
  });

  const staff = await Community.create({
    name: 'Staff Lounge',
    slug: 'staff_lounge',
    description: 'Private coordination hub for Forumly administrators, community moderators, and core engineering.',
    creator: admin._id,
    privacyType: 'private',
    postingPermission: 'members_only',
    memberCount: 3,
  });

  console.log('[Seed] Enrolling community memberships & moderator roles...');
  await CommunityMember.create([
    // Technology
    { community: tech._id, user: sarah._id, role: 'owner' },
    { community: tech._id, user: david._id, role: 'moderator' },
    { community: tech._id, user: alex._id, role: 'member' },
    { community: tech._id, user: maya._id, role: 'member' },
    { community: tech._id, user: elena._id, role: 'member' },
    { community: tech._id, user: marcus._id, role: 'member' },
    { community: tech._id, user: luna._id, role: 'member' },
    { community: tech._id, user: admin._id, role: 'member' },

    // WebDev
    { community: webdev._id, user: alex._id, role: 'owner' },
    { community: webdev._id, user: sarah._id, role: 'moderator' },
    { community: webdev._id, user: maya._id, role: 'member' },
    { community: webdev._id, user: david._id, role: 'member' },
    { community: webdev._id, user: marcus._id, role: 'member' },
    { community: webdev._id, user: pixel._id, role: 'member' },
    { community: webdev._id, user: admin._id, role: 'member' },

    // Design
    { community: design._id, user: maya._id, role: 'owner' },
    { community: design._id, user: alex._id, role: 'moderator' },
    { community: design._id, user: luna._id, role: 'member' },
    { community: design._id, user: pixel._id, role: 'member' },
    { community: design._id, user: sarah._id, role: 'member' },
    { community: design._id, user: admin._id, role: 'member' },

    // Science
    { community: science._id, user: elena._id, role: 'owner' },
    { community: science._id, user: sarah._id, role: 'moderator' },
    { community: science._id, user: david._id, role: 'member' },
    { community: science._id, user: luna._id, role: 'member' },
    { community: science._id, user: guest._id, role: 'member' },
    { community: science._id, user: admin._id, role: 'member' },

    // Gaming
    { community: gaming._id, user: pixel._id, role: 'owner' },
    { community: gaming._id, user: alex._id, role: 'moderator' },
    { community: gaming._id, user: david._id, role: 'member' },
    { community: gaming._id, user: marcus._id, role: 'member' },
    { community: gaming._id, user: guest._id, role: 'member' },

    // Ask Forumly
    { community: ask._id, user: admin._id, role: 'owner' },
    { community: ask._id, user: luna._id, role: 'moderator' },
    { community: ask._id, user: sarah._id, role: 'member' },
    { community: ask._id, user: alex._id, role: 'member' },
    { community: ask._id, user: maya._id, role: 'member' },
    { community: ask._id, user: david._id, role: 'member' },
    { community: ask._id, user: elena._id, role: 'member' },
    { community: ask._id, user: guest._id, role: 'member' },

    // Staff
    { community: staff._id, user: admin._id, role: 'owner' },
    { community: staff._id, user: sarah._id, role: 'moderator' },
    { community: staff._id, user: alex._id, role: 'moderator' },
  ]);

  console.log('[Seed] Creating rich posts across all communities...');
  const now = Date.now();
  const time = (hoursAgo) => new Date(now - hoursAgo * 3600 * 1000);

  // Post 1: WebDev Architecture (Pinned text post)
  const p1 = await Post.create({
    title: 'Why we shifted to cursor-based pagination for high-volume feeds',
    body: `Traditional offset-based pagination (\`skip\` and \`limit\`) fails significantly when users are actively voting, commenting, and publishing new content.

### The Pitfalls of Offset Pagination:
1. **Result drift:** As items are inserted or scores change while a user scrolls, rows slip across page boundaries, resulting in duplicated or omitted items.
2. **Performance degradation:** As \`skip\` grows large (e.g. \`skip(10000)\`), the database must scan and discard thousands of records before returning the slice.

### The Cursor Solution:
\`\`\`javascript
// Compound cursor query for deterministic O(1) retrieval
const cursorQuery = {
  $or: [
    { hotRankScore: { $lt: cursorScore } },
    { hotRankScore: cursorScore, _id: { $lt: cursorId } }
  ]
};
\`\`\`

With compound index \`{ hotRankScore: -1, _id: -1 }\`, every subsequent fetch executes directly against the B-tree index in milliseconds regardless of whether the user is on page 1 or page 500.`,
    postType: 'text',
    community: webdev._id,
    author: alex._id,
    flair: { text: 'Architecture', backgroundColor: '#3b82f6', textColor: '#ffffff' },
    isPinned: true,
    createdAt: time(3),
    score: 0,
    hotRankScore: calculateHotScore(0, time(3)),
  });

  // Post 2: Technology Breakthrough (Image post)
  const p2 = await Post.create({
    title: 'Co-Packaged Silicon Photonics: 3.2 Tbps optical interconnects demonstrated in production packaging',
    body: 'Researchers and fabrication labs have achieved sub-picojoule-per-bit optical transceivers directly bonded to computing dies, reducing interconnect latency by 68% and drastically cutting data center power dissipation.',
    postType: 'image',
    mediaUrls: [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&fit=crop',
    ],
    community: tech._id,
    author: sarah._id,
    flair: { text: 'Hardware', backgroundColor: '#10b981', textColor: '#ffffff' },
    createdAt: time(4),
    score: 0,
    hotRankScore: calculateHotScore(0, time(4)),
  });

  // Post 3: Design & UX (Design Systems)
  const p3 = await Post.create({
    title: 'Designing with Intent: Why fluid typography scales better than fixed breakpoints',
    body: `Using fixed media query breakpoints (\`sm\`, \`md\`, \`lg\`) often creates abrupt, jarring layout shifts when users resize windows or rotate mobile displays.

Modern CSS gives us \`clamp()\` to achieve continuous fluid scaling between minimum and maximum viewport bounds:

\`\`\`css
/* Smoothly scales between 1rem at 360px and 1.5rem at 1280px */
font-size: clamp(1rem, 0.8rem + 0.9vw, 1.5rem);
\`\`\`

This eliminates hundreds of lines of brittle breakpoint overrides and keeps visual rhythm harmonious on foldables, ultra-wides, and tablets alike.`,
    postType: 'text',
    community: design._id,
    author: maya._id,
    flair: { text: 'Case Study', backgroundColor: '#8b5cf6', textColor: '#ffffff' },
    createdAt: time(6),
    score: 0,
    hotRankScore: calculateHotScore(0, time(6)),
  });

  // Post 4: AskForumly Interactive Poll
  const p4 = await Post.create({
    title: 'Which frontend styling paradigm do you prefer for large-scale enterprise applications in 2026?',
    body: 'We are evaluating team standards for our next major platform rewrite. Cast your vote below and share your team trade-offs in the comments!',
    postType: 'poll',
    community: ask._id,
    author: luna._id,
    flair: { text: 'Community Poll', backgroundColor: '#f59e0b', textColor: '#ffffff' },
    pollData: {
      options: [
        { text: 'Tailwind CSS (utility-first + design tokens)', voteCount: 4, voters: [alex._id, sarah._id, david._id, marcus._id] },
        { text: 'CSS Modules + Vanilla Extract (zero-runtime type-safe CSS)', voteCount: 2, voters: [maya._id, luna._id] },
        { text: 'Tailwind Variants / CVA component abstractions', voteCount: 1, voters: [pixel._id] },
        { text: 'Pure CSS with native nesting & variables', voteCount: 1, voters: [admin._id] },
      ],
      expiresAt: new Date(now + 5 * 86400 * 1000),
    },
    createdAt: time(8),
    score: 0,
    hotRankScore: calculateHotScore(0, time(8)),
  });

  // Post 5: Science Discovery (Image post)
  const p5 = await Post.create({
    title: 'James Webb Space Telescope captures pristine gravitational lensing around galaxy cluster MACS J0138',
    body: 'The massive gravitational field acts as a cosmic magnifying glass, bending spacetime to reveal five distinct images of an ancient supernova that detonated over 10 billion light-years away.',
    postType: 'image',
    mediaUrls: [
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&fit=crop',
    ],
    community: science._id,
    author: elena._id,
    flair: { text: 'Astrophysics', backgroundColor: '#ec4899', textColor: '#ffffff' },
    createdAt: time(12),
    score: 0,
    hotRankScore: calculateHotScore(0, time(12)),
  });

  // Post 6: WebDev Link Post
  const p6 = await Post.create({
    title: 'Official React 19 Upgrade Guide & Server Actions Deep-Dive',
    body: 'Essential reading for teams migrating from React 18: detailed breakdown of the useActionState hook, optimistic updates, and asset preloading semantics.',
    postType: 'link',
    externalUrl: 'https://react.dev/blog/2024/04/25/react-19-upgrade-guide',
    community: webdev._id,
    author: alex._id,
    flair: { text: 'Resources', backgroundColor: '#06b6d4', textColor: '#ffffff' },
    createdAt: time(16),
    score: 0,
    hotRankScore: calculateHotScore(0, time(16)),
  });

  // Post 7: Tech Security Article
  const p7 = await Post.create({
    title: 'Securing WebSockets against cross-site hijacking (CSWSH) in production',
    body: `WebSocket handshakes do not enforce standard CORS origin policies by default in modern browsers. 

If your application authenticates via ambient cookies (\`cookie-parser\`), an attacker hosting \`malicious.site\` can initiate a \`new WebSocket('wss://your-api.com')\` and the user's browser will attach the session cookie automatically!

### Mandatory Defenses:
1. **Verify the \`Origin\` header strictly** in the HTTP upgrade request handler.
2. **Use short-lived ticket tokens** passed in query parameters or auth protocols rather than raw cookies.
3. **Bind WebSocket sessions to a cryptographic fingerprint** of the client connection.`,
    postType: 'text',
    community: tech._id,
    author: marcus._id,
    flair: { text: 'Security', backgroundColor: '#ef4444', textColor: '#ffffff' },
    createdAt: time(20),
    score: 0,
    hotRankScore: calculateHotScore(0, time(20)),
  });

  // Post 8: Gaming Lounge
  const p8 = await Post.create({
    title: 'The renaissance of handcrafted pixel art: How modern shaders breathe life into 2D worlds',
    body: 'Looking at how games like Animal Well, Sea of Stars, and Dead Cells blend traditional sprite animations with real-time dynamic normal mapping, volumetric lighting, and particle simulations.',
    postType: 'image',
    mediaUrls: [
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1000&fit=crop',
    ],
    community: gaming._id,
    author: pixel._id,
    flair: { text: 'Game Design', backgroundColor: '#8b5cf6', textColor: '#ffffff' },
    createdAt: time(24),
    score: 0,
    hotRankScore: calculateHotScore(0, time(24)),
  });

  // Post 9: Technology - AI Infrastructure
  const p9 = await Post.create({
    title: 'Speculative decoding explained: How small draft models double LLM inference throughput',
    body: `Autoregressive token generation is memory-bandwidth bound: reading weights from HBM to compute a single token underutilizes GPU compute cores.

**Speculative Decoding** solves this by pairing a lightweight draft model (e.g. 1B params) with a target model (e.g. 70B params):
1. The fast draft model speculatively generates a sequence of \(K\) candidate tokens.
2. The large target model evaluates all \(K\) tokens simultaneously in a **single forward pass**.
3. Any correct tokens are accepted, maintaining exact mathematical equivalence with standard autoregressive sampling while doubling token generation speeds!`,
    postType: 'text',
    community: tech._id,
    author: elena._id,
    flair: { text: 'Machine Learning', backgroundColor: '#6366f1', textColor: '#ffffff' },
    createdAt: time(28),
    score: 0,
    hotRankScore: calculateHotScore(0, time(28)),
  });

  // Post 10: AskForumly Career Question
  const p10 = await Post.create({
    title: 'Senior engineers who transitioned to staff/principal roles: What was the biggest mental model shift?',
    body: 'Moving from individual project ownership to broad organizational leverage is often cited as the hardest transition in tech. What habits did you have to unlearn? How do you measure impact when you are no longer writing code full-time?',
    postType: 'text',
    community: ask._id,
    author: david._id,
    flair: { text: 'Career', backgroundColor: '#14b8a6', textColor: '#ffffff' },
    createdAt: time(32),
    score: 0,
    hotRankScore: calculateHotScore(0, time(32)),
  });

  // Post 11: WebDev Performance Guide
  const p11 = await Post.create({
    title: 'Eliminating Layout Shift (CLS) from dynamic web fonts and images',
    body: `Cumulative Layout Shift directly hurts user satisfaction and SEO ranking.

### 3 Quick Wins:
1. **Always declare explicit aspect ratios** on media elements: \`aspect-ratio: 16 / 9;\` or inline \`width\` and \`height\` attributes.
2. **Font fallback matching:** Use CSS \`size-adjust\`, \`ascent-override\`, and \`descent-override\` to match your local system font metrics to the web font.
3. **Reserve space for asynchronous ad slots and banners** with CSS \`min-height\` containers.`,
    postType: 'text',
    community: webdev._id,
    author: alex._id,
    flair: { text: 'Performance', backgroundColor: '#10b981', textColor: '#ffffff' },
    createdAt: time(36),
    score: 0,
    hotRankScore: calculateHotScore(0, time(36)),
  });

  // Post 12: Private Staff Post
  await Post.create({
    title: 'Q4 2026 Platform Roadmap: WebSockets, Full-Text Search, and Anti-Spam Filtering',
    body: 'Reviewing automated rate limiting metrics, spam detection heuristics, and our zero-downtime database indexing strategies.',
    postType: 'text',
    community: staff._id,
    author: admin._id,
    createdAt: time(40),
    score: 2,
    hotRankScore: calculateHotScore(2, time(40)),
  });

  console.log('[Seed] Casting realistic community upvotes & calculating hot ranks...');
  // Upvotes for Post 1 (WebDev Cursor Pagination)
  await castVote(sarah._id, 'Post', p1._id, 1);
  await castVote(maya._id, 'Post', p1._id, 1);
  await castVote(david._id, 'Post', p1._id, 1);
  await castVote(elena._id, 'Post', p1._id, 1);
  await castVote(marcus._id, 'Post', p1._id, 1);
  await castVote(admin._id, 'Post', p1._id, 1);

  // Upvotes for Post 2 (Silicon Photonics)
  await castVote(alex._id, 'Post', p2._id, 1);
  await castVote(david._id, 'Post', p2._id, 1);
  await castVote(elena._id, 'Post', p2._id, 1);
  await castVote(luna._id, 'Post', p2._id, 1);
  await castVote(admin._id, 'Post', p2._id, 1);

  // Upvotes for Post 3 (Design)
  await castVote(alex._id, 'Post', p3._id, 1);
  await castVote(sarah._id, 'Post', p3._id, 1);
  await castVote(luna._id, 'Post', p3._id, 1);

  // Upvotes for Post 4 (Poll)
  await castVote(sarah._id, 'Post', p4._id, 1);
  await castVote(alex._id, 'Post', p4._id, 1);
  await castVote(david._id, 'Post', p4._id, 1);
  await castVote(pixel._id, 'Post', p4._id, 1);

  // Upvotes for Post 5 (Science JWST)
  await castVote(sarah._id, 'Post', p5._id, 1);
  await castVote(alex._id, 'Post', p5._id, 1);
  await castVote(maya._id, 'Post', p5._id, 1);
  await castVote(luna._id, 'Post', p5._id, 1);
  await castVote(admin._id, 'Post', p5._id, 1);

  // Upvotes for Post 7 (Security)
  await castVote(david._id, 'Post', p7._id, 1);
  await castVote(sarah._id, 'Post', p7._id, 1);
  await castVote(alex._id, 'Post', p7._id, 1);

  // Upvotes for Post 9 (Speculative Decoding)
  await castVote(sarah._id, 'Post', p9._id, 1);
  await castVote(marcus._id, 'Post', p9._id, 1);
  await castVote(david._id, 'Post', p9._id, 1);
  await castVote(admin._id, 'Post', p9._id, 1);

  // Upvotes for Post 10 (Career)
  await castVote(sarah._id, 'Post', p10._id, 1);
  await castVote(alex._id, 'Post', p10._id, 1);
  await castVote(maya._id, 'Post', p10._id, 1);
  await castVote(elena._id, 'Post', p10._id, 1);

  console.log('[Seed] Generating threaded discussion trees...');
  // Thread 1 on Post 1 (Pagination)
  const c1 = await createComment({
    postId: p1._id,
    authorId: sarah._id,
    content: 'Completely agree on avoiding offset-based pagination. In high-velocity tables, `OFFSET` causes noticeable UI jitter. How do you handle tie-breaking when two items share the exact same score or timestamp down to the millisecond?',
  });

  const c1_1 = await createComment({
    postId: p1._id,
    authorId: alex._id,
    content: 'We use compound comparison with the unique Mongo `_id` as the deterministic tie-breaker: `{ $or: [ { score: { $lt: v } }, { score: v, _id: { $lt: id } } ] }`. Because ObjectIDs encode creation time and sequence, uniqueness is guaranteed!',
    parentCommentId: c1._id,
  });

  const c1_2 = await createComment({
    postId: p1._id,
    authorId: david._id,
    content: 'And on the database side, creating a compound index on `{ hotRankScore: -1, _id: -1 }` means MongoDB satisfies both the filter and sort directly from the index tree without any in-memory sort buffer.',
    parentCommentId: c1_1._id,
  });

  const c1_3 = await createComment({
    postId: p1._id,
    authorId: maya._id,
    content: 'From a frontend perspective, consuming these compound cursors with TanStack Query `useInfiniteQuery` is effortless — each page returns `nextCursor` which feeds into `getNextPageParam`.',
    parentCommentId: c1_2._id,
  });

  // Thread 2 on Post 7 (CSWSH Security)
  const c2 = await createComment({
    postId: p7._id,
    authorId: sarah._id,
    content: 'Great reminder on Origin checks. Many developers assume WebSockets follow the Same-Origin Policy automatically because HTTP fetch requests do.',
  });

  const c2_1 = await createComment({
    postId: p7._id,
    authorId: marcus._id,
    content: 'Exactly! In Node.js, checking `info.origin` inside the `verifyClient` callback of `ws` or `socket.io` before accepting the connection handshake is the first line of defense.',
    parentCommentId: c2._id,
  });

  // Thread 3 on Post 9 (Speculative Decoding)
  const c3 = await createComment({
    postId: p9._id,
    authorId: david._id,
    content: 'Do you see high acceptance rates when using speculative decoding across code generation and mathematical reasoning tasks, or does acceptance drop significantly compared to conversational prose?',
  });

  const c3_1 = await createComment({
    postId: p9._id,
    authorId: elena._id,
    content: 'Interestingly, code generation often has high acceptance for boilerplate, imports, and syntax keywords (e.g. 70-80% acceptance), but dips on nuanced algorithmic variable names. Overall speedup is still around 1.8x to 2.2x!',
    parentCommentId: c3._id,
  });

  // Upvote comments
  await castVote(alex._id, 'Comment', c1._id, 1);
  await castVote(david._id, 'Comment', c1._id, 1);
  await castVote(maya._id, 'Comment', c1._id, 1);

  await castVote(sarah._id, 'Comment', c1_1._id, 1);
  await castVote(david._id, 'Comment', c1_1._id, 1);
  await castVote(admin._id, 'Comment', c1_1._id, 1);

  await castVote(sarah._id, 'Comment', c1_2._id, 1);
  await castVote(alex._id, 'Comment', c1_3._id, 1);

  await castVote(marcus._id, 'Comment', c2._id, 1);
  await castVote(sarah._id, 'Comment', c2_1._id, 1);

  await castVote(elena._id, 'Comment', c3._id, 1);
  await castVote(david._id, 'Comment', c3_1._id, 1);

  console.log('[Seed] Creating bookmarks and saved posts...');
  await SavedPost.create([
    { user: alex._id, post: p2._id },
    { user: alex._id, post: p5._id },
    { user: sarah._id, post: p1._id },
    { user: sarah._id, post: p7._id },
    { user: maya._id, post: p1._id },
    { user: admin._id, post: p1._id },
  ]);

  console.log('[Seed] Creating sample user notifications...');
  await Notification.create([
    {
      recipient: alex._id,
      sender: sarah._id,
      type: 'comment_reply',
      entityId: p1._id,
      entityType: 'Post',
      message: 'sarah_tech replied to your post: "Why we shifted to cursor-based pagination..."',
      link: `/r/webdev/posts/${p1._id}`,
      isRead: false,
    },
    {
      recipient: sarah._id,
      sender: alex._id,
      type: 'comment_reply',
      entityId: p1._id,
      entityType: 'Post',
      message: 'alex_frontend answered your question about tie-breaking cursors.',
      link: `/r/webdev/posts/${p1._id}`,
      isRead: true,
    },
    {
      recipient: elena._id,
      sender: david._id,
      type: 'comment_reply',
      entityId: p9._id,
      entityType: 'Post',
      message: 'david_cloud commented on your post: "Speculative decoding explained..."',
      link: `/r/technology/posts/${p9._id}`,
      isRead: false,
    },
    {
      recipient: alex._id,
      sender: null,
      type: 'upvote_milestone',
      entityId: p1._id,
      entityType: 'Post',
      message: 'Your post "Why we shifted to cursor-based pagination" reached 5+ upvotes!',
      link: `/r/webdev/posts/${p1._id}`,
      isRead: false,
    },
  ]);

  console.log('[Seed] Creating sample moderation report & log...');
  await Report.create({
    reporter: guest._id,
    targetType: 'Post',
    targetId: p2._id,
    community: tech._id,
    reason: 'spam',
    description: 'Verifying moderation report queue functionality in development.',
    status: 'open',
  });

  await ModerationLog.create({
    community: tech._id,
    moderator: sarah._id,
    action: 'resolve_report',
    targetType: 'Post',
    targetId: p2._id,
    reason: 'Verified authentic scientific press release and patent citation.',
  });

  console.log('================================================================');
  console.log('🎉 [Seed] Successfully seeded Forumly database with rich demo data!');
  console.log('----------------------------------------------------------------');
  console.log('👥 Demo Users Available (all share password: Password123!)');
  console.log('   • admin           (Platform Admin)');
  console.log('   • sarah_tech      (Distributed Systems Architect)');
  console.log('   • alex_frontend   (Lead React / WebDev Engineer)');
  console.log('   • maya_design     (Design Systems Lead)');
  console.log('   • david_cloud     (SRE & Cloud Engineer)');
  console.log('   • elena_data      (AI & Neural Inference Researcher)');
  console.log('   • marcus_cyber    (Cybersecurity & AppSec Analyst)');
  console.log('   • pixel_gamer     (Game Dev & Retro Tech)');
  console.log('   • luna_writer     (Tech Journalist)');
  console.log('   • guest_user      (Community Lurker)');
  console.log('----------------------------------------------------------------');
  console.log('🏷️  7 Communities: r/technology, r/webdev, r/design, r/science,');
  console.log('                   r/gaming, r/askforumly, r/staff_lounge');
  console.log('📝 12+ Posts: text discussions, image showcases, external links, polls');
  console.log('💬 Multi-level nested comment trees with upvotes and karma');
  console.log('================================================================');

  await disconnectDB();
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]:', err);
      process.exit(1);
    });
}
