import { auth } from "@/app/(auth)/auth";
import { NextRequest, NextResponse } from "next/server";
import { getFile } from "@/utils/file-service";
import { getPdfContentFromUrl } from "@/utils/pdf";

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pathname = searchParams.get("url");
  
  if (!pathname) {
    return NextResponse.json({ error: "Pathname not provided" }, { status: 400 });
  }

  try {
    // First, get the file URL from the pathname
    const file = await getFile(session.user.email, pathname);
    
    if (!file || !file.url) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    
    // Now we have the actual URL to fetch from blob storage
    const url = file.url;
    
    // Check if this is a PDF
    const isPdf = pathname.toLowerCase().endsWith('.pdf') || 
      url.includes('application/pdf') || 
      url.includes('.pdf?');

    let content = '';
    
    if (isPdf) {
      // Use our PDF utility to extract text
      content = await getPdfContentFromUrl(url);
    } else {
      // For other file types, just fetch the text content
      const response = await fetch(url);
      content = await response.text();
    }

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error("Error getting file content:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get file content" },
      { status: 500 }
    );
  }
} 