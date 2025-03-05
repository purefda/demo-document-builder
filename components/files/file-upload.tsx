'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface UploadResponse {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
}

export function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = files.length;
      let uploadedCount = 0;

      const filePromises = Array.from(files).map(async (file) => {
        // Create FormData for each file
        const formData = new FormData();
        formData.append('file', file);
        
        // Upload file to API
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }
        
        // Update progress
        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / totalFiles) * 100));
        
        return await response.json() as UploadResponse;
      });

      await Promise.all(filePromises);
      
      // Trigger parent component to refresh file list
      window.dispatchEvent(new CustomEvent('files-updated'));
      
      toast.success('Files uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast.error(error.message || 'Failed to upload files');
    } finally {
      setUploading(false);
      // Reset the input to allow re-uploading the same file
      e.target.value = '';
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-light-white hover:bg-gray-50 transition-colors">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-12 w-12 text-purple mb-4"
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
          />
        </svg>
        
        <p className="mb-2 text-lg font-semibold text-deep-purple">
          {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
        </p>
        
        <p className="mb-4 text-sm text-gray-500">
          Support for PDF, DOCX, TXT and more (20-50 files)
        </p>
        
        <label className="relative cursor-pointer">
          <input
            type="file"
            multiple
            className="sr-only"
            onChange={handleFileUpload}
            disabled={uploading}
            accept=".pdf,.docx,.txt,.doc,.rtf,.md"
          />
          <div className="py-2 px-4 bg-purple hover:bg-deep-purple text-white rounded-md transition-colors">
            {uploading ? 'Uploading...' : 'Select Files'}
          </div>
        </label>
        
        {uploading && (
          <div className="w-full mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-purple h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-1 text-center">{uploadProgress}% Uploaded</p>
          </div>
        )}
      </div>
    </div>
  );
} 