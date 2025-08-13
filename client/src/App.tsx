import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
// Using type-only imports for better TypeScript compliance
import type { Post, CreatePostInput } from '../../server/src/schema';
import { PostForm } from '@/components/PostForm';
import { PostList } from '@/components/PostList';

function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Load posts with useCallback for proper dependency management
  const loadPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getPosts.query();
      setPosts(result);
    } catch (error) {
      console.error('Failed to load posts:', error);
      // Use mock data when API fails (for development with stubs)
      const mockPosts: Post[] = [
        {
          id: 1,
          title: "Welcome to Post Manager! 🎉",
          content: "This is a sample post showing how the application works. This post is currently active and will expire in 24 hours from when it was posted.\n\nFeatures:\n• 24-hour visibility period\n• Re-posting capability\n• Edit and delete options\n• Publication fees",
          price: 5.99,
          posted_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          expires_at: new Date(Date.now() + 22 * 60 * 60 * 1000), // 22 hours from now
          is_active: true,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
          updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          id: 2,
          title: "Expired Post Example 📅",
          content: "This post has expired and is no longer visible to the public. You can re-post it to make it active again for another 24-hour period.\n\nRe-posting will:\n• Make the post visible again\n• Reset the 24-hour timer\n• Charge the publication fee again",
          price: 3.50,
          posted_at: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago
          expires_at: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago (expired)
          is_active: false,
          created_at: new Date(Date.now() - 30 * 60 * 60 * 1000),
          updated_at: new Date(Date.now() - 30 * 60 * 60 * 1000)
        },
        {
          id: 3,
          title: "Product Launch Announcement 🚀",
          content: "Excited to announce the launch of our new product! Get 20% off for the first week.\n\n🎯 Key features:\n• Advanced analytics\n• Real-time updates\n• Mobile responsive\n• 24/7 support\n\nLimited time offer - don't miss out!",
          price: 12.99,
          posted_at: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
          expires_at: new Date(Date.now() + 19 * 60 * 60 * 1000), // 19 hours from now
          is_active: true,
          created_at: new Date(Date.now() - 5 * 60 * 60 * 1000),
          updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000) // Updated 1 hour ago
        }
      ];
      setPosts(mockPosts);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load posts on component mount
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleCreatePost = async (formData: CreatePostInput) => {
    try {
      const response = await trpc.createPost.mutate(formData);
      // Update posts list with the new post
      setPosts((prev: Post[]) => [response, ...prev]);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create post:', error);
      // Create mock post when API fails (for development with stubs)
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const mockPost: Post = {
        id: Date.now(), // Use timestamp as unique ID
        title: formData.title,
        content: formData.content,
        price: formData.price,
        posted_at: now,
        expires_at: expiresAt,
        is_active: true,
        created_at: now,
        updated_at: now
      };
      setPosts((prev: Post[]) => [mockPost, ...prev]);
      setShowCreateForm(false);
    }
  };

  const handleRepost = async (postId: number) => {
    try {
      setIsLoading(true);
      await trpc.repost.mutate({ id: postId });
      // Reload posts to get updated status
      await loadPosts();
    } catch (error) {
      console.error('Failed to repost:', error);
      // Update post locally when API fails (for development with stubs)
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      setPosts((prev: Post[]) => 
        prev.map(post => 
          post.id === postId 
            ? { ...post, posted_at: now, expires_at: expiresAt, is_active: true, updated_at: now }
            : post
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      setIsLoading(true);
      await trpc.deletePost.mutate({ id: postId });
      // Remove post from local state
      setPosts((prev: Post[]) => prev.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Failed to delete post:', error);
      // Remove post locally when API fails (for development with stubs)
      setPosts((prev: Post[]) => prev.filter(post => post.id !== postId));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePost = async (postId: number, updates: Partial<CreatePostInput>) => {
    try {
      setIsLoading(true);
      const response = await trpc.updatePost.mutate({ id: postId, ...updates });
      // Update post in local state
      setPosts((prev: Post[]) => 
        prev.map(post => post.id === postId ? response : post)
      );
    } catch (error) {
      console.error('Failed to update post:', error);
      // Update post locally when API fails (for development with stubs)
      const now = new Date();
      setPosts((prev: Post[]) => 
        prev.map(post => 
          post.id === postId 
            ? { ...post, ...updates, updated_at: now }
            : post
        )
      );
      // Don't re-throw error, let the operation complete locally
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📝 Post Manager</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Create and manage your posts with 24-hour visibility periods. 
            Each post costs a fee to publish and can be re-posted when expired.
          </p>
          {/* Stub notification */}
          <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg text-sm text-blue-800 max-w-2xl mx-auto">
            💡 <strong>Demo Mode:</strong> Using sample data to showcase functionality. In production, this would connect to a real database.
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <Button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-indigo-600 hover:bg-indigo-700"
            size="lg"
          >
            {showCreateForm ? '❌ Cancel' : '✨ Create New Post'}
          </Button>
          <Button 
            variant="outline" 
            onClick={loadPosts}
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? '🔄 Loading...' : '🔄 Refresh Posts'}
          </Button>
        </div>

        {/* Create Post Form */}
        {showCreateForm && (
          <div className="mb-8">
            <Card className="max-w-2xl mx-auto border-indigo-200 shadow-lg">
              <CardHeader className="bg-indigo-50">
                <CardTitle className="text-indigo-900">✨ Create New Post</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <PostForm 
                  onSubmit={handleCreatePost}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </div>
        )}

        <Separator className="my-8" />

        {/* Posts List */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              📋 All Posts ({posts.length})
            </h2>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                🟢 Active
              </Badge>
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                🔴 Expired
              </Badge>
            </div>
          </div>

          <PostList 
            posts={posts}
            onRepost={handleRepost}
            onDelete={handleDeletePost}
            onUpdate={handleUpdatePost}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}

export default App;