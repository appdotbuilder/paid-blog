import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { AuthForm } from '@/components/AuthForm';
import { CreatePostForm } from '@/components/CreatePostForm';
import { PublicPosts } from '@/components/PublicPosts';
import { UserPosts } from '@/components/UserPosts';
import { CreditPurchase } from '@/components/CreditPurchase';
import type { User, PublicPost, Post } from '../../server/src/schema';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [publicPosts, setPublicPosts] = useState<PublicPost[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);

  // Load public posts on component mount
  const loadPublicPosts = useCallback(async () => {
    try {
      const posts = await trpc.getPublicPosts.query();
      setPublicPosts(posts);
    } catch (error) {
      console.error('Failed to load public posts:', error);
      // Set empty array as fallback for better UX
      setPublicPosts([]);
    }
  }, []);

  // Load user posts when user is authenticated
  const loadUserPosts = useCallback(async () => {
    if (!user) return;
    try {
      const posts = await trpc.getUserPosts.query();
      setUserPosts(posts);
    } catch (error) {
      console.error('Failed to load user posts:', error);
      // Set empty array as fallback for better UX
      setUserPosts([]);
    }
  }, [user]);

  // Load user profile to get current credits
  const loadUserProfile = useCallback(async () => {
    if (!user) return;
    try {
      const profile = await trpc.getUserProfile.query();
      setUser(profile);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // Keep existing user data if profile fetch fails
    }
  }, [user]);

  useEffect(() => {
    loadPublicPosts();
  }, [loadPublicPosts]);

  useEffect(() => {
    if (user) {
      loadUserPosts();
      loadUserProfile();
    }
  }, [loadUserPosts, loadUserProfile]);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setUserPosts([]);
  };

  const handlePostCreated = (newPost: Post) => {
    setUserPosts((prev: Post[]) => [newPost, ...prev]);
    // Refresh public posts to show the new post
    loadPublicPosts();
    // Refresh user profile to update credit balance
    loadUserProfile();
  };

  const handleCreditsUpdated = (newCredits: number) => {
    if (user) {
      setUser((prev: User | null) => prev ? { ...prev, credits: newCredits } : null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-800 mb-2">📝 BlogSpace</h1>
          <p className="text-gray-600">Share your thoughts with the world - first post is free! ✨</p>
          
          {/* Demo Notice */}
          <div className="mt-4 mx-auto max-w-2xl">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-blue-500 text-xl">ℹ️</span>
                  <div className="text-left">
                    <h3 className="font-semibold text-blue-800 mb-1">Demo Application</h3>
                    <p className="text-sm text-blue-700">
                      This is a demonstration of a paid blog platform. Backend services are simulated, 
                      so some features will show demo data. The UI and user experience represent the 
                      complete application functionality.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* User Status Bar */}
        {user && (
          <Card className="mb-6 border-purple-200 bg-white/80">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-semibold">
                    {user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user.email}</p>
                  <p className="text-sm text-gray-600">Phone: {user.phone_number}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 px-3 py-1">
                  💰 {user.credits} credits
                </Badge>
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                >
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!user ? (
          /* Authentication Forms */
          <div className="max-w-md mx-auto">
            <AuthForm onLogin={handleLogin} />
          </div>
        ) : (
          /* Main Application */
          <Tabs defaultValue="browse" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-white/80 border-purple-200">
              <TabsTrigger value="browse" className="data-[state=active]:bg-purple-100">
                🌍 Browse Posts
              </TabsTrigger>
              <TabsTrigger value="create" className="data-[state=active]:bg-purple-100">
                ✍️ Create Post
              </TabsTrigger>
              <TabsTrigger value="my-posts" className="data-[state=active]:bg-purple-100">
                📋 My Posts
              </TabsTrigger>
              <TabsTrigger value="credits" className="data-[state=active]:bg-purple-100">
                💳 Buy Credits
              </TabsTrigger>
            </TabsList>

            <TabsContent value="browse">
              <PublicPosts 
                posts={publicPosts} 
                onRefresh={loadPublicPosts}
              />
            </TabsContent>

            <TabsContent value="create">
              <CreatePostForm 
                onPostCreated={handlePostCreated}
                userCredits={user.credits}
                userPostCount={userPosts.length}
              />
            </TabsContent>

            <TabsContent value="my-posts">
              <UserPosts 
                posts={userPosts}
                onRefresh={loadUserPosts}
              />
            </TabsContent>

            <TabsContent value="credits">
              <CreditPurchase 
                currentCredits={user.credits}
                onCreditsUpdated={handleCreditsUpdated}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

export default App;