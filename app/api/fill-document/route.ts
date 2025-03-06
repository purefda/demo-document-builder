import { auth } from "@/app/(auth)/auth";
import { NextRequest, NextResponse } from "next/server";
import { getFile } from "@/utils/file-service";
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

// Define types for docxtemplater's internal Part and ScopeManager interfaces
interface Part {
  module?: unknown;
  value: (scopeManager: ScopeManager) => string;
  type?: string;
}

interface ScopeManager {
  scopePath: string[];
  scopeList: any[];
  resolved: any;
}

/**
 * Process a DOCX template with extracted data
 */
async function processDocxTemplate(
  templateUrl: string,
  data: Record<string, string>
): Promise<ArrayBuffer | null> {
  try {
    // 1. Fetch the template document as an ArrayBuffer
    const templateResponse = await fetch(templateUrl);
    if (!templateResponse.ok) {
      console.error(`Failed to fetch template: ${templateResponse.status} ${templateResponse.statusText}`);
      return null;
    }
    
    const templateArrayBuffer = await templateResponse.arrayBuffer();
    if (!templateArrayBuffer || templateArrayBuffer.byteLength === 0) {
      console.error('Template file is empty or corrupt');
      return null;
    }
    
    // 2. Load the template with docxtemplater and PizZip
    const zip = new PizZip(templateArrayBuffer);
    
    // Check if this is a valid DOCX file (should have a [Content_Types].xml file)
    if (!zip.files['[Content_Types].xml']) {
      console.error('Invalid DOCX file: missing [Content_Types].xml');
      return null;
    }
    
    // Create docxtemplater instance with all options in a single constructor call (modern API)
    const doc = new Docxtemplater(zip, {
      delimiters: { start: '{{', end: '}}' },
      linebreaks: true, // Enable proper line break handling
      nullGetter: (part: any): string => {
        // When a value is not defined, return the original placeholder
        if (!part.module) {
          // For simple tags, return the original tag text
          try {
            // Try to get the tag name - may vary based on docxtemplater version
            const tag = typeof part.value === 'function' 
              ? part.value() 
              : part.value;
            return `{{${tag}}}`;
          } catch (e) {
            console.error('Error in nullGetter:', e);
            return '{{UNDEFINED}}';
          }
        }
        // For other tags (loops, etc.), return an empty string
        return '';
      }
    });
    
    // Render the document with the provided data
    doc.render(data);
    
    // 3. Generate the filled document
    const filledDocBuffer = doc.getZip().generate({ type: 'arraybuffer' });
    return filledDocBuffer;
  } catch (error) {
    console.error("Error processing DOCX template:", error);
    // Log more details if it's a docxtemplater error
    if (error && typeof error === 'object' && 'properties' in error && 
        error.properties && typeof error.properties === 'object' && 
        'errors' in error.properties) {
      console.error("Docxtemplater errors:", error.properties.errors);
    }
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the request body
    const requestData = await request.json();
    const { templatePath, extractedData } = requestData;
    
    if (!templatePath) {
      return NextResponse.json({ error: "Template path not provided" }, { status: 400 });
    }
    
    if (!extractedData || typeof extractedData !== 'object') {
      return NextResponse.json({ error: "Extracted data not provided or invalid" }, { status: 400 });
    }
    
    // Get the template file
    const templateFile = await getFile(session.user.email, templatePath);
    if (!templateFile) {
      return NextResponse.json({ error: "Template file not found" }, { status: 404 });
    }
    
    // Process the data - convert from the format stored in the document builder
    // to a simple key-value format for docxtemplater
    const processedData: Record<string, string> = {};
    for (const [key, info] of Object.entries(extractedData)) {
      if (typeof info === 'object' && info !== null && 'value' in info) {
        processedData[key] = (info as { value: string }).value || '';
      }
    }
    
    // Process the template
    const filledDocBuffer = await processDocxTemplate(templateFile.url, processedData);
    
    if (!filledDocBuffer) {
      return NextResponse.json(
        { error: "Failed to process document template" }, 
        { status: 500 }
      );
    }
    
    // Return the filled document as a downloadable file
    return new Response(filledDocBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="filled_${templatePath}"`,
      },
    });
  } catch (error: any) {
    console.error("Error filling document:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fill document" },
      { status: 500 }
    );
  }
} 