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
    
    if (pathnameParam) {
      // If pathname is provided, get the file URL
      const file = await getFile(session.user.email, pathnameParam);
      
      if (!file || !file.url) {
        return NextResponse.json({ error: `File not found: ${pathnameParam}` }, { status: 404 });
      }
      
      url = file.url;
      filePath = pathnameParam;
    } else {
      // If URL is provided directly
      url = fileIdentifier;
      filePath = urlParam || '';
    }
    
    console.log(`Processing file: ${filePath}, URL: ${url}`);
    
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