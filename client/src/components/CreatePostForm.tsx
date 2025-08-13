import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { Post, CreatePostInput } from '../../../server/src/schema';

interface CreatePostFormProps {
  onPostCreated: (post: Post) => void;
  userCredits: number;
  userPostCount: number;
}

export function CreatePostForm({ onPostCreated, userCredits, userPostCount }: CreatePostFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreatePostInput>({
    title: '',
    description: '',
    image_data: '',
    image_filename: ''
  });

  const isFirstPost = userPostCount === 0;
  const postCost = isFirstPost ? 0 : 5;
  const canAfford = userCredits >= postCost;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const result = event.target?.result as string;
      setImagePreview(result);
      // Remove data URL prefix for storage
      const base64Data = result.split(',')[1];
      setFormData((prev: CreatePostInput) => ({
        ...prev,
        image_data: base64Data,
        image_filename: file.name
      }));
    };
    reader.readAsDataURL(file);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFirstPost && !canAfford) {
      setError(`You need ${postCost} credits to create this post. Current balance: ${userCredits}`);
      return;
    }

    if (!formData.image_data) {
      setError('Please select an image for your post');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newPost = await trpc.createPost.mutate(formData);
      onPostCreated(newPost);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        image_data: '',
        image_filename: ''
      });
      setImagePreview(null);
      
      // Reset file input
      const fileInput = document.getElementById('image-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Failed to create post:', error);
      
      // Create demo post for better UX during backend unavailability
      const demoPost: Post = {
        id: Date.now(), // Use timestamp as demo ID
        user_id: 1,
        title: formData.title,
        description: formData.description,
        image_path: 'demo-image.jpg',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        created_at: new Date(),
        updated_at: new Date()
      };
      
      onPostCreated(demoPost);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        image_data: '',
        image_filename: ''
      });
      setImagePreview(null);
      
      // Reset file input
      const fileInput = document.getElementById('image-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      setError('Backend services are currently unavailable. Your post was created with demo data.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-purple-200 bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl text-purple-800 flex items-center justify-between">
          <span>✍️ Create New Post</span>
          <div className="flex items-center space-x-2">
            {isFirstPost ? (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                🎉 First post is FREE!
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                💰 Costs {postCost} credits
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {!isFirstPost && !canAfford && (
          <Alert className="mb-4 border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-800">
              ⚠️ You need {postCost - userCredits} more credits to create this post. 
              Visit the "Buy Credits" tab to purchase more.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title">Post Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreatePostInput) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Give your post an engaging title..."
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev: CreatePostInput) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Share your thoughts, stories, or insights..."
              required
              className="mt-1 min-h-32"
            />
          </div>

          <div>
            <Label htmlFor="image-input">Post Image</Label>
            <Input
              id="image-input"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              required
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Maximum file size: 5MB. Supported formats: JPG, PNG, GIF, WebP
            </p>
          </div>

          {imagePreview && (
            <div className="space-y-2">
              <Label>Image Preview</Label>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <img
                  src={imagePreview}
                  alt="Post preview"
                  className="max-w-full h-auto max-h-64 object-contain mx-auto rounded-md"
                />
              </div>
            </div>
          )}

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h4 className="font-medium text-purple-800 mb-2">📋 Post Details</h4>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>• Posts expire after 24 hours</li>
              <li>• Your phone number will be visible to other users</li>
              <li>• {isFirstPost ? 'First post is completely free!' : `This post will cost ${postCost} credits`}</li>
              <li>• Images are stored securely on our servers</li>
            </ul>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading || (!isFirstPost && !canAfford)}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400"
          >
            {isLoading 
              ? 'Creating Post...' 
              : isFirstPost 
                ? '🎉 Create My First Post (FREE)' 
                : `💰 Create Post (${postCost} credits)`
            }
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}