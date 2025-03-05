import { auth } from "@/app/(auth)/auth";
import { uploadFile } from "@/utils/file-service";
import { NextRequest, NextResponse } from "next/server";

// Maximum file size: 10MB 
const MAX_FILE_SIZE = 10 * 1024 * 1024; 

// Supported file types
const SUPPORTED_TYPES = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv'
];

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      }, { status: 400 });
    }

    // Validate file type
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: `Unsupported file type: ${file.type}. Supported types are PDF, DOCX, DOC, TXT, and CSV.` 
      }, { status: 400 });
    }

    const result = await uploadFile(file, session.user.email);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error uploading file:", error);
    
    // Provide more specific error messages for common issues
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return NextResponse.json({ 
        error: "Network error occurred while uploading. Please try again." 
      }, { status: 503 });
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to upload file" }, 
      { status: 500 }
    );
  }
} 