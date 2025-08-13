import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Post } from '../../../server/src/schema';

interface UserPostsProps {
  posts: Post[];
  onRefresh: () => void;
}

export function UserPosts({ posts, onRefresh }: UserPostsProps) {
  const formatTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expired';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  const formatCreatedDate = (createdAt: Date) => {
    const created = new Date(createdAt);
    return created.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isPostExpired = (expiresAt: Date) => {
    return new Date(expiresAt).getTime() <= new Date().getTime();
  };

  const activePosts = posts.filter((post: Post) => !isPostExpired(post.expires_at));
  const expiredPosts = posts.filter((post: Post) => isPostExpired(post.expires_at));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-purple-800">📋 My Posts</h2>
          <p className="text-gray-600">
            {activePosts.length} active • {expiredPosts.length} expired
          </p>
        </div>
        <Button 
          onClick={onRefresh}
          variant="outline" 
          className="border-purple-300 text-purple-600 hover:bg-purple-50"
        >
          🔄 Refresh
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card className="border-purple-200 bg-white/90">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">✍️</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Posts Yet</h3>
            <p className="text-gray-600 text-center max-w-md">
              You haven't created any posts yet. Your first post is free - go to the "Create Post" tab to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Active Posts */}
          {activePosts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center">
                <span className="text-green-500 mr-2">🟢</span>
                Active Posts ({activePosts.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activePosts.map((post: Post) => {
                  const isExpiringSoon = new Date(post.expires_at).getTime() - new Date().getTime() < 2 * 60 * 60 * 1000; // 2 hours
                  
                  return (
                    <Card 
                      key={post.id} 
                      className="border-green-200 bg-white/90 backdrop-blur-sm"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg text-purple-800 line-clamp-2">
                            {post.title}
                          </CardTitle>
                          <Badge 
                            variant={isExpiringSoon ? "destructive" : "secondary"}
                            className={`text-xs whitespace-nowrap ml-2 ${
                              isExpiringSoon 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            ⏰ {formatTimeRemaining(post.expires_at)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          📅 {formatCreatedDate(post.created_at)}
                        </p>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Post Image */}
                        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                          <div className="text-center text-gray-400">
                            <div className="text-4xl mb-2">🖼️</div>
                            <p className="text-sm">Demo Image</p>
                            <p className="text-xs">({post.image_path})</p>
                          </div>
                        </div>

                        {/* Post Description */}
                        <div>
                          <p className="text-gray-700 text-sm line-clamp-3">
                            {post.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Expired Posts */}
          {expiredPosts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-600 mb-4 flex items-center">
                <span className="text-gray-400 mr-2">🔴</span>
                Expired Posts ({expiredPosts.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {expiredPosts.map((post: Post) => (
                  <Card 
                    key={post.id} 
                    className="border-gray-200 bg-gray-50/90 backdrop-blur-sm opacity-75"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg text-gray-600 line-clamp-2">
                          {post.title}
                        </CardTitle>
                        <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs whitespace-nowrap ml-2">
                          💀 Expired
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400">
                        📅 {formatCreatedDate(post.created_at)}
                      </p>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Post Image */}
                      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center grayscale">
                        <div className="text-center text-gray-400">
                          <div className="text-4xl mb-2">🖼️</div>
                          <p className="text-sm">Demo Image</p>
                          <p className="text-xs">({post.image_path})</p>
                        </div>
                      </div>

                      {/* Post Description */}
                      <div>
                        <p className="text-gray-500 text-sm line-clamp-3">
                          {post.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}