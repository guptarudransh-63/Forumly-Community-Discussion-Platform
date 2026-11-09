export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Forumly API',
    version: '1.0.0',
    description: 'REST API documentation for Forumly community discussion platform',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Endpoint',
    },
  ],
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'email', 'password'],
                properties: {
                  username: { type: 'string', example: 'coder_alice' },
                  email: { type: 'string', example: 'alice@example.com' },
                  password: { type: 'string', example: 'password123' },
                  displayName: { type: 'string', example: 'Alice Developer' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User successfully registered' },
          400: { description: 'Username or email already in use' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Log in with credentials',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['login', 'password'],
                properties: {
                  login: { type: 'string', example: 'coder_alice' },
                  password: { type: 'string', example: 'password123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated successfully' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/feeds': {
      get: {
        summary: 'Get feed of posts',
        tags: ['Feeds'],
        parameters: [
          { name: 'feedType', in: 'query', schema: { type: 'string', enum: ['home', 'popular', 'latest', 'following'] } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['hot', 'new', 'top'] } },
          { name: 'timeWindow', in: 'query', schema: { type: 'string', enum: ['today', 'week', 'month', 'year', 'all'] } },
          { name: 'communitySlug', in: 'query', schema: { type: 'string' } },
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'Paginated list of posts' },
        },
      },
    },
    '/posts': {
      post: {
        summary: 'Create a new post',
        tags: ['Posts'],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'communityId'],
                properties: {
                  title: { type: 'string' },
                  body: { type: 'string' },
                  postType: { type: 'string', enum: ['text', 'link', 'image', 'poll'] },
                  communityId: { type: 'string' },
                  mediaUrls: { type: 'array', items: { type: 'string' } },
                  externalUrl: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Post created' },
        },
      },
    },
    '/votes': {
      post: {
        summary: 'Vote on post or comment',
        tags: ['Voting'],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['targetType', 'targetId', 'value'],
                properties: {
                  targetType: { type: 'string', enum: ['Post', 'Comment'] },
                  targetId: { type: 'string' },
                  value: { type: 'integer', enum: [-1, 0, 1] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Vote registered' },
        },
      },
    },
    '/comments': {
      post: {
        summary: 'Create top-level comment or nested reply',
        tags: ['Comments'],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['postId', 'content'],
                properties: {
                  postId: { type: 'string' },
                  parentCommentId: { type: 'string', nullable: true },
                  content: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Comment created' },
        },
      },
    },
  },
};
