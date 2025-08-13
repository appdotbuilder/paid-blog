import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
// Note the extra ../ because we're in components subfolder
import type { CreatePostInput } from '../../../server/src/schema';

interface PostFormProps {
  onSubmit: (data: CreatePostInput) => Promise<void>;
  isLoading?: boolean;
  initialData?: Partial<CreatePostInput>;
  submitLabel?: string;
}

export function PostForm({ 
  onSubmit, 
  isLoading = false, 
  initialData = {}, 
  submitLabel = 'Create Post' 
}: PostFormProps) {
  const [formData, setFormData] = useState<CreatePostInput>({
    title: initialData.title || '',
    content: initialData.content || '',
    price: initialData.price || 1
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      await onSubmit(formData);
      // Reset form after successful submission (only if not editing)
      if (!initialData.title) {
        setFormData({
          title: '',
          content: '',
          price: 1
        });
      }
    } catch (error) {
      setError('Failed to submit post. Please try again.');
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
          ❌ {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">
          📝 Post Title
        </Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreatePostInput) => ({ ...prev, title: e.target.value }))
          }
          placeholder="Enter an engaging title for your post..."
          required
          className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content" className="text-sm font-medium">
          📄 Content
        </Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev: CreatePostInput) => ({ ...prev, content: e.target.value }))
          }
          placeholder="Write your post content here..."
          required
          rows={6}
          className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="price" className="text-sm font-medium">
          💰 Publication Fee (USD)
        </Label>
        <Input
          id="price"
          type="number"
          value={formData.price}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreatePostInput) => ({ 
              ...prev, 
              price: parseFloat(e.target.value) || 0 
            }))
          }
          placeholder="Enter fee amount"
          step="0.01"
          min="0.01"
          required
          className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-500">
          This fee will be charged each time you publish or re-post this content.
        </p>
      </div>

      <Button 
        type="submit" 
        disabled={isLoading}
        className="w-full bg-indigo-600 hover:bg-indigo-700"
        size="lg"
      >
        {isLoading ? '⏳ Processing...' : `💫 ${submitLabel}`}
      </Button>
    </form>
  );
}