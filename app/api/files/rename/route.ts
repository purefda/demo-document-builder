import { auth } from "@/app/(auth)/auth";
import { renameFile } from "@/utils/file-service";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { fileUrl, newName } = data;
    
    if (!fileUrl || !newName) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const result = await renameFile(fileUrl, newName, session.user.email);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error renaming file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to rename file" }, 
      { status: 500 }
    );
  }
} 