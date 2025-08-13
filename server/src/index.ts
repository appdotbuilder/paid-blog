import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schema types
import { 
  createPostInputSchema, 
  updatePostInputSchema, 
  repostInputSchema,
  getPostInputSchema,
  deletePostInputSchema 
} from './schema';

// Import handlers
import { createPost } from './handlers/create_post';
import { getPosts } from './handlers/get_posts';
import { getPost } from './handlers/get_post';
import { updatePost } from './handlers/update_post';
import { repost } from './handlers/repost';
import { deletePost } from './handlers/delete_post';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // Create a new post
  createPost: publicProcedure
    .input(createPostInputSchema)
    .mutation(({ input }) => createPost(input)),
  
  // Get all posts (with active/expired status)
  getPosts: publicProcedure
    .query(() => getPosts()),
  
  // Get a single post by ID
  getPost: publicProcedure
    .input(getPostInputSchema)
    .query(({ input }) => getPost(input)),
  
  // Update an existing post
  updatePost: publicProcedure
    .input(updatePostInputSchema)
    .mutation(({ input }) => updatePost(input)),
  
  // Re-post an expired post
  repost: publicProcedure
    .input(repostInputSchema)
    .mutation(({ input }) => repost(input)),
  
  // Delete a post
  deletePost: publicProcedure
    .input(deletePostInputSchema)
    .mutation(({ input }) => deletePost(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();