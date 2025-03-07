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
  const urlParam = searchParams.get("url");
  const pathnameParam = searchParams.get("pathname");
  
  // Use either the url or pathname parameter
  const fileIdentifier = urlParam || pathnameParam;
  
  if (!fileIdentifier) {
    return NextResponse.json({ error: "Neither URL nor pathname provided" }, { status: 400 });
  }

  try {
    let url: string;
    let filePath: string;
    
    // Prefer using pathname parameter for consistency
    if (pathnameParam) {
      // If pathname is provided, get the file URL
      const file = await getFile(session.user.email, pathnameParam);
      
      if (!file || !file.url) {
        return NextResponse.json({ error: `File not found: ${pathnameParam}` }, { status: 404 });
      }
      
      url = file.url;
      filePath = pathnameParam;
    } else if (urlParam) {
      // If URL is provided directly, validate it's a proper URL
      if (!urlParam.startsWith('http://') && !urlParam.startsWith('https://')) {
        // If it's not a valid URL, try to get the file by treating it as a pathname
        const file = await getFile(session.user.email, urlParam);
        
        if (!file || !file.url) {
          return NextResponse.json({ 
            error: `Invalid URL and file not found as pathname: ${urlParam}` 
          }, { status: 400 });
        }
        
        url = file.url;
        filePath = urlParam;
      } else {
        url = urlParam;
        filePath = urlParam.substring(urlParam.lastIndexOf('/') + 1);
      }
    } else {
      // This shouldn't happen due to the check above, but TypeScript doesn't know that
      return NextResponse.json({ error: "No file identifier provided" }, { status: 400 });
    }
    
    console.log(`Processing file: ${filePath}, URL: ${url}`);
    
    // Make sure URL is valid before proceeding
    try {
      // This will throw an error if the URL is invalid
      new URL(url);
    } catch (error) {
      return NextResponse.json({ 
        error: `Invalid URL format: ${url}` 
      }, { status: 400 });
    }
    
    // Check if this is a PDF
    const isPdf = filePath.toLowerCase().endsWith('.pdf') || 
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