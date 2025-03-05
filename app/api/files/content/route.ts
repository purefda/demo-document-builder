import { auth } from "@/app/(auth)/auth";
import { NextRequest, NextResponse } from "next/server";
import { head } from "@vercel/blob";
import { getPdfContentFromUrl } from "@/utils/pdf";

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  
  if (!url) {
    return NextResponse.json({ error: "URL not provided" }, { status: 400 });
  }

  try {
    // Check if this is a PDF
    const isPdf = url.toLowerCase().endsWith('.pdf') || 
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