import { auth } from "@/app/(auth)/auth";
import { listFiles } from "@/utils/file-service";
import { NextResponse } from "next/server";

export async function GET() {
  // Check authentication
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const files = await listFiles(session.user.email);
    return NextResponse.json(files);
  } catch (error: any) {
    console.error("Error listing files:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list files" }, 
      { status: 500 }
    );
  }
} 