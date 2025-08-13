import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { PublicPost } from '../../../server/src/schema';

interface PublicPostsProps {
  posts: PublicPost[];
  onRefresh: () => void;
}

export function PublicPosts({ posts, onRefresh }: PublicPostsProps) {
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
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-purple-800">🌍 Public Posts</h2>
          <p className="text-gray-600">Discover what others are sharing</p>
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
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Active Posts</h3>
            <p className="text-gray-600 text-center max-w-md mb-4">
              There are no active posts at the moment. This could be because:
            </p>
            <ul className="text-sm text-gray-500 text-left max-w-md space-y-1">
              <li>• No users have created posts yet</li>
              <li>• All posts have expired (posts last 24 hours)</li>
              <li>• Backend services are currently unavailable</li>
            </ul>
            <p className="text-gray-600 text-center max-w-md mt-4">
              Be the first to share something with the community!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post: PublicPost) => {
            const isExpiringSoon = new Date(post.expires_at).getTime() - new Date().getTime() < 2 * 60 * 60 * 1000; // 2 hours
            
            return (
              <Card 
                key={post.id} 
                className="border-purple-200 bg-white/90 backdrop-blur-sm hover:shadow-lg transition-shadow"
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
                          : 'bg-blue-100 text-blue-700'
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

                  <Separator />

                  {/* Contact Information */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-purple-700">📞 Contact:</span>
                      <span className="text-sm font-mono bg-purple-50 px-2 py-1 rounded">
                        {post.phone_number}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}