import { initTRPC, TRPCError } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  registerUserInputSchema,
  loginUserInputSchema,
  createPostInputSchema,
  purchaseCreditsInputSchema,
  type AuthContext 
} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { createPost } from './handlers/create_post';
import { getPublicPosts } from './handlers/get_public_posts';
import { getUserPosts } from './handlers/get_user_posts';
import { purchaseCredits } from './handlers/purchase_credits';
import { getUserProfile } from './handlers/get_user_profile';
import { getCreditHistory } from './handlers/get_credit_history';

// Create context interface
interface Context {
  user?: AuthContext;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Public routes
  register: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  login: publicProcedure
    .input(loginUserInputSchema)
    .mutation(({ input }) => loginUser(input)),

  getPublicPosts: publicProcedure
    .query(() => getPublicPosts()),

  // Protected routes (require authentication)
  createPost: protectedProcedure
    .input(createPostInputSchema)
    .mutation(({ input, ctx }) => createPost(input, ctx.user.user_id)),

  getUserPosts: protectedProcedure
    .query(({ ctx }) => getUserPosts(ctx.user.user_id)),

  purchaseCredits: protectedProcedure
    .input(purchaseCreditsInputSchema)
    .mutation(({ input, ctx }) => purchaseCredits(input, ctx.user.user_id)),

  getUserProfile: protectedProcedure
    .query(({ ctx }) => getUserProfile(ctx.user.user_id)),

  getCreditHistory: protectedProcedure
    .query(({ ctx }) => getCreditHistory(ctx.user.user_id)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext({ req }): Context {
      // In real implementation, extract auth token from headers
      // and validate it to get user context
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Placeholder: In real implementation, verify JWT token
        // and extract user information
        return {
          user: {
            user_id: 1, // Placeholder user ID
            email: 'user@example.com' // Placeholder email
          }
        };
      }
      
      return {};
    },
  });
  
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();