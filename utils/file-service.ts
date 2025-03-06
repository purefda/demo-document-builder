import { put, list, del, head } from '@vercel/blob';
import { insertChunks, deleteChunksByFilePath } from '@/app/db';

export interface FileMetadata {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
}

/**
 * Upload a file to Vercel Blob Storage
 */
export async function uploadFile(file: File, userEmail: string): Promise<FileMetadata> {
  // Create a blob from the file - we need to use 'public' as it's the only supported option
  // But we'll implement security at the API level by checking user authentication
  const { url, downloadUrl, pathname } = await put(`${userEmail}/${file.name}`, file, {
    access: 'public',
    addRandomSuffix: false, // Don't add random suffix to keep the filename clean
  });

  return {
    url,
    pathname: pathname.replace(`${userEmail}/`, ''),
    size: file.size,
    uploadedAt: new Date(),
  };
}

/**
 * List all files for a user
 */
export async function listFiles(userEmail: string): Promise<FileMetadata[]> {
  const { blobs } = await list({ prefix: userEmail });
  
  return blobs.map(blob => ({
    url: blob.url,
    pathname: blob.pathname.replace(`${userEmail}/`, ''),
    size: blob.size,
    uploadedAt: new Date(blob.uploadedAt),
  }));
}

/**
 * Delete a file from Vercel Blob Storage
 */
export async function deleteFile(fileUrl: string, userEmail: string): Promise<void> {
  // Verify the file belongs to the user
  const { pathname } = await head(fileUrl);
  
  if (!pathname.startsWith(userEmail)) {
    throw new Error('Unauthorized: You cannot delete this file');
  }
  
  await del(fileUrl);
  await deleteChunksByFilePath({ filePath: pathname });
}

/**
 * Rename a file in Vercel Blob Storage (by copying and deleting)
 */
export async function renameFile(fileUrl: string, newName: string, userEmail: string): Promise<FileMetadata> {
  try {
    // Get the current file
    const { pathname } = await head(fileUrl);
    
    if (!pathname.startsWith(userEmail)) {
      throw new Error('Unauthorized: You cannot rename this file');
    }
    
    // Get file extension from original pathname
    const originalName = pathname.split('/').pop() || '';
    const fileExtension = originalName.includes('.') ? 
      originalName.substring(originalName.lastIndexOf('.')) : '';
    
    // Ensure new name has the same extension
    const newNameWithExt = newName.includes('.') ? newName : `${newName}${fileExtension}`;
    
    // Download the current file
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const fileBlob = await response.blob();
    const file = new File([fileBlob], newNameWithExt, { type: fileBlob.type });
    
    // Upload with new name
    const newFile = await uploadFile(file, userEmail);
    
    // Delete the old file
    await deleteFile(fileUrl, userEmail);
    
    return newFile;
  } catch (error) {
    console.error('Error in renameFile:', error);
    throw error; // Re-throw to be handled by the API route
  }
} 