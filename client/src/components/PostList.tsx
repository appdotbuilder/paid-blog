import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';
import { PostForm } from './PostForm';
// Note the extra ../ because we're in components subfolder
import type { Post, CreatePostInput } from '../../../server/src/schema';

interface PostListProps {
  posts: Post[];
  onRepost: (postId: number) => Promise<void>;
  onDelete: (postId: number) => Promise<void>;
  onUpdate: (postId: number, updates: Partial<CreatePostInput>) => Promise<void>;
  isLoading?: boolean;
}

export function PostList({ posts, onRepost, onDelete, onUpdate, isLoading = false }: PostListProps) {
  const [editingPostId, setEditingPostId] = useState<number | null>(null);

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts yet</h3>
        <p className="text-gray-600">Create your first post to get started!</p>
      </div>
    );
  }

  const formatTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const timeLeft = expiresAt.getTime() - now.getTime();
    
    if (timeLeft <= 0) {
      return 'Expired';
    }
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  const handleUpdatePost = async (postId: number, updates: Partial<CreatePostInput>) => {
    try {
      await onUpdate(postId, updates);
      setEditingPostId(null);
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  return (
    <div className="grid gap-6">
      {posts.map((post: Post) => (
        <Card key={post.id} className="border-gray-200 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <CardTitle className="text-xl font-bold text-gray-900 flex-1 pr-4">
                {post.title}
              </CardTitle>
              <Badge 
                variant={post.is_active ? "default" : "secondary"}
                className={post.is_active 
                  ? "bg-green-500 text-white" 
                  : "bg-red-100 text-red-800"
                }
              >
                {post.is_active ? '🟢 Active' : '🔴 Expired'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {post.content}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">💰 Publication Fee</p>
                <p className="text-lg font-bold text-green-600">
                  ${post.price.toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">⏰ Status</p>
                <p className={`text-sm font-medium ${post.is_active ? 'text-green-600' : 'text-red-600'}`}>
                  {post.is_active ? formatTimeRemaining(post.expires_at) : 'Expired'}
                </p>
              </div>
            </div>

            <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-100">
              <p>📅 Posted: {post.posted_at.toLocaleString()}</p>
              <p>⏳ Expires: {post.expires_at.toLocaleString()}</p>
              {post.updated_at.getTime() !== post.created_at.getTime() && (
                <p>✏️ Last updated: {post.updated_at.toLocaleString()}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex gap-2 pt-4 border-t border-gray-100">
            {/* Edit button - always available */}
            <Dialog open={editingPostId === post.id} onOpenChange={(open) => !open && setEditingPostId(null)}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditingPostId(post.id)}
                  disabled={isLoading}
                >
                  ✏️ Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>✏️ Edit Post</DialogTitle>
                </DialogHeader>
                <PostForm
                  onSubmit={(updates) => handleUpdatePost(post.id, updates)}
                  isLoading={isLoading}
                  initialData={{
                    title: post.title,
                    content: post.content,
                    price: post.price
                  }}
                  submitLabel="Update Post"
                />
              </DialogContent>
            </Dialog>

            {/* Re-post button - only for expired posts */}
            {!post.is_active && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="default" 
                    size="sm" 
                    disabled={isLoading}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    🔄 Re-post
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Re-post This Content?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will make your post visible again for another 24 hours. 
                      You will be charged the publication fee of <strong>${post.price.toFixed(2)}</strong> again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onRepost(post.id)}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      💳 Pay ${post.price.toFixed(2)} & Re-post
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Delete button - always available */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  disabled={isLoading}
                >
                  🗑️ Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Post?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your post 
                    "{post.title}" and remove it from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDelete(post.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    🗑️ Delete Forever
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}