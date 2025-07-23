import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

// Add debug logging
const DEBUG = true;
const log = (...args: any[]) => {
  if (DEBUG) {
    console.log('[LinkPreview]', ...args);
  }
};

interface LinkPreviewProps {
  url: string;
}

export const LinkPreview = ({ url }: LinkPreviewProps) => {
  const [preview, setPreview] = useState<{
    title?: string;
    description?: string;
    images?: string[];
    siteName?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    log('Fetching preview for URL:', url);
    
    const fetchPreview = async () => {
      try {
        log('Starting to fetch preview from server...');
        // Always use the full URL in development to avoid CORS issues
        // In production, this will be handled by the reverse proxy
        const apiUrl = `http://localhost:3000/api/link-preview?url=${encodeURIComponent(url)}`;
        
        log('API URL:', apiUrl);
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        log('Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          log('Error response:', errorText);
          throw new Error(`Server responded with status ${response.status}: ${errorText}`);
        }
        
        // Check if the response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(`Expected JSON response but got: ${contentType} - ${text.substring(0, 100)}`);
        }
        
        const data = await response.json();
        log('Received preview data from server:', data);
        
        if (isMounted) {
          setPreview(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching link preview for URL:', url, 'Error:', err);
          log('Error details:', {
            message: err.message,
            name: err.name,
            stack: err.stack,
            url: err.url,
            status: err.status,
            statusText: err.statusText,
          });
          setError(`Could not load preview: ${err.message}`);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPreview();
    
    return () => {
      isMounted = false;
    };
  }, [url]);

  // Debug render
  log('Rendering preview:', { isLoading, error, preview });
  
  if (isLoading) {
    log('Still loading preview...');
    return null;
  }
  
  if (error) {
    log('Error in preview:', error);
    return null;
  }
  
  if (!preview) {
    log('No preview data available');
    return null;
  }

  return (
    <Card className="mt-2 max-w-md border-border bg-card">
      {preview.images?.[0] && (
        <div className="relative h-40 w-full overflow-hidden rounded-t-md">
          <img
            src={preview.images[0]}
            alt="Preview"
            className="h-full w-full object-cover"
            onError={(e) => {
              // If image fails to load, hide the image container
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      )}
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">
          {preview.siteName || new URL(url).hostname.replace('www.', '')}
        </div>
        <h4 className="mt-1 text-sm font-medium">
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {preview.title || url}
          </a>
        </h4>
        {preview.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {preview.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
