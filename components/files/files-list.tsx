'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface FileItem {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date | string;
}

export function FilesList() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Get secure access URL for a file
  const getSecureFileUrl = (pathname: string) => {
    return `/api/files/get?pathname=${encodeURIComponent(pathname)}`;
  };

  // Open file securely
  const openFile = (file: FileItem) => {
    window.open(getSecureFileUrl(file.pathname), '_blank');
  };

  // Fetch files from API
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/files/list');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch files');
      }

      const data = await response.json();
      
      // Sort by uploadedAt (most recent first)
      const sortedFiles = data.sort((a: FileItem, b: FileItem) => {
        const dateA = new Date(a.uploadedAt).getTime();
        const dateB = new Date(b.uploadedAt).getTime();
        return dateB - dateA;
      });
      
      setFiles(sortedFiles);
    } catch (error: any) {
      console.error('Error fetching files:', error);
      toast.error(error.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and setup event listener for file updates
  useEffect(() => {
    fetchFiles();
    
    // Listen for file updates from other components
    const handleFilesUpdated = () => fetchFiles();
    window.addEventListener('files-updated', handleFilesUpdated);
    
    return () => {
      window.removeEventListener('files-updated', handleFilesUpdated);
    };
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string | Date): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteFile = async (file: FileItem) => {
    setDeletingId(file.pathname);
    try {
      const response = await fetch(`/api/files/delete?fileUrl=${encodeURIComponent(file.url)}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete file');
      }
      
      setFiles(files.filter(f => f.pathname !== file.pathname));
      toast.success('File deleted successfully');
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast.error(error.message || 'Failed to delete file');
    } finally {
      setDeletingId(null);
    }
  };

  const startEditing = (file: FileItem) => {
    // Extract filename without path
    setEditingId(file.pathname);
    setNewFileName(file.pathname);
  };

  const saveFileName = async (file: FileItem) => {
    const trimmedName = newFileName.trim();
    
    if (!trimmedName) {
      toast.error('File name cannot be empty');
      return;
    }
    
    // Check if we're only changing the case (which can cause issues with some storage systems)
    if (trimmedName.toLowerCase() === file.pathname.toLowerCase() && trimmedName !== file.pathname) {
      // We need to use a temporary name to change case in some storage systems
      toast.info('Changing file name case...');
    }
    
    try {
      const response = await fetch('/api/files/rename', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileUrl: file.url,
          newName: trimmedName
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename file');
      }
      
      const updatedFile = await response.json();
      
      // Update file list
      setFiles(files.map(f => 
        f.pathname === file.pathname ? updatedFile : f
      ));
      
      setEditingId(null);
      toast.success('File renamed successfully');
    } catch (error: any) {
      console.error('Error renaming file:', error);
      toast.error(`Error renaming file: ${error.message}`);
      setEditingId(null); // Reset editing state on error
      
      // Refresh the file list to ensure UI is in sync with server state
      fetchFiles();
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple"></div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12 bg-light-white rounded-lg">
        <p className="text-gray-500">No files uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg overflow-hidden">
        <thead className="bg-deep-purple text-white">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">File Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Size</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Upload Date</th>
            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {files.map((file) => (
            <tr key={file.pathname} className="hover:bg-light-white transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                {editingId === file.pathname ? (
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 w-full"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center">
                    <div className="mr-2 cursor-pointer" onClick={() => openFile(file)}>
                      {file.pathname.endsWith('.pdf') ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      ) : file.pathname.endsWith('.docx') || file.pathname.endsWith('.doc') ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <span 
                      className="text-sm font-medium text-gray-900 cursor-pointer hover:text-purple"
                      onClick={() => openFile(file)}
                    >
                      {file.pathname}
                    </span>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatFileSize(file.size)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(file.uploadedAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                {editingId === file.pathname ? (
                  <div className="flex justify-center space-x-2">
                    <button 
                      onClick={() => saveFileName(file)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Save
                    </button>
                    <button 
                      onClick={cancelEditing}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-center space-x-2">
                    <button 
                      onClick={() => openFile(file)}
                      className="text-green-600 hover:text-green-900"
                      disabled={deletingId === file.pathname}
                    >
                      View
                    </button>
                    <button 
                      onClick={() => startEditing(file)}
                      className="text-blue-600 hover:text-blue-900"
                      disabled={deletingId === file.pathname}
                    >
                      Rename
                    </button>
                    <button 
                      onClick={() => handleDeleteFile(file)}
                      className="text-red-600 hover:text-red-900"
                      disabled={deletingId === file.pathname}
                    >
                      {deletingId === file.pathname ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 