import { auth } from "@/app/(auth)/auth";
import { deleteFile } from "@/utils/file-service";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get("fileUrl");
    
    if (!fileUrl) {
      return NextResponse.json({ error: "No file URL provided" }, { status: 400 });
    }

    await deleteFile(fileUrl, session.user.email);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete file" }, 
      { status: 500 }
    );
  }
} 