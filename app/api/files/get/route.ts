import { auth } from "@/app/(auth)/auth";
import { NextRequest, NextResponse } from "next/server";
import { head } from "@vercel/blob";

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pathname = searchParams.get("pathname");
  
  if (!pathname) {
    return NextResponse.json({ error: "File path not provided" }, { status: 400 });
  }

  // Make sure the requested file belongs to the authenticated user
  const fullPathname = `${session.user.email}/${pathname}`;
  
  try {
    // Get the blob metadata to verify it exists and belongs to the user
    const blob = await head(fullPathname);

    if (!blob) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Security check - make sure the file path starts with the user's email
    if (!blob.pathname.startsWith(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    // If the security check passes, we can redirect to the actual URL
    // This prevents direct access to the URL without authentication
    return NextResponse.redirect(blob.url);
  } catch (error: any) {
    console.error("Error accessing file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to access file" },
      { status: 500 }
    );
  }
} 