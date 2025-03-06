# Document Builder Implementation Guide

## Overview

The Document Builder feature allows users to:

1. Extract information from uploaded documents using AI
2. Select a DOCX template file with placeholders in `{{key}}` format
3. Generate a new document by replacing the placeholders with extracted information
4. Download the generated document

## Components

### 1. Document Building Section UI (`components/document-builder/document-building-section.tsx`)

This component provides:
- A template selection interface (DOCX files only)
- A view of the extracted information that will be used to fill the template
- A "Build Document" button to trigger the document generation process

### 2. Document Filling API (`app/api/fill-document/route.ts`)

This API endpoint:
- Accepts a template path and extracted data
- Retrieves the template file
- Processes the template using docxtemplater
- Returns the filled document for download

## How It Works

1. **Template Selection**: Users select a DOCX template file from their uploaded files.
2. **Placeholder Format**: Templates should contain placeholders in `{{key}}` format that match the keys of extracted information.
3. **Document Generation**: When the user clicks "Build Document", the system:
   - Sends the template path and extracted data to the API
   - The API processes the template, replacing `{{key}}` placeholders with extracted values
   - The filled document is returned to the user for download

## Technical Implementation

### Placeholder Replacement

The system uses docxtemplater to handle the replacements. Key features:
- Configured to recognize `{{` and `}}` as delimiters
- Properly handles Word's XML-based format where placeholders might span multiple XML elements
- Supports complex scenarios like loops and conditional sections (if needed in the future)
- Preserves original placeholders when no corresponding value is provided (won't replace with "undefined")

### docxtemplater Implementation

The implementation follows the modern docxtemplater API pattern:
```javascript
// Create docxtemplater instance with all options in a single constructor call
const doc = new Docxtemplater(zip, {
  delimiters: { start: '{{', end: '}}' },
  linebreaks: true,
  nullGetter: (part) => {
    // Custom logic to preserve original placeholders
    if (!part.module) {
      const tag = typeof part.value === 'function' ? part.value() : part.value;
      return `{{${tag}}}`;
    }
    return '';
  }
});

// Render with data
doc.render(data);

// Generate output
const filledDocBuffer = doc.getZip().generate({ type: 'arraybuffer' });
```

### Handling Missing Values

When a template contains a placeholder like `{{KEY}}` but no value is provided for that key, the system will:
1. Preserve the original placeholder text (`{{KEY}}`) in the output document
2. Only replace placeholders that have corresponding values
3. Never replace placeholders with "undefined" or empty strings

This allows templates to contain more placeholders than the extracted data has values, which is useful when:
- Different document types need different sets of information
- Templates are reused across different scenarios
- Users want to manually fill in some fields after automated processing

### Example

If a template contains:
```
Manufacturer: {{MANUFACTURER_NAME}}
Indications: {{INDICATION_FOR_USE}}
Additional Info: {{ADDITIONAL_INFO}}
```

And the extracted data only includes:
```json
{
  "MANUFACTURER_NAME": { "value": "Acme Medical", "reviewed": true },
  "INDICATION_FOR_USE": { "value": "For treatment of...", "reviewed": false }
}
```

The generated document would contain:
```
Manufacturer: Acme Medical
Indications: For treatment of...
Additional Info: {{ADDITIONAL_INFO}}
```

## Dependencies

This implementation uses the following packages:
- `docxtemplater`: For template processing and placeholder replacement
- `pizzip`: For handling the DOCX file format (which is a ZIP file containing XML)
- `file-saver`: For client-side file downloads

## File Flow

1. **Client Side**:
   - User selects a template and clicks "Build Document"
   - Frontend sends template path and extracted data to API
   - When response is received, the blob is saved using file-saver

2. **Server Side**:
   - API fetches the template file from storage
   - Template is processed with docxtemplater
   - Generated document is returned as a binary response with appropriate headers

## Error Handling

The implementation includes comprehensive error handling for:
- Missing or invalid template files
- Template processing errors
- API communication issues
- File download failures

## Deployment Notes

In a production environment, the full implementation would:
1. Install required packages: `docxtemplater`, `pizzip`, and `file-saver`
2. Uncomment the docxtemplater implementation in the API endpoint
3. Set up proper MIME types and headers for document download

The current implementation includes stubs and placeholders for these features while the packages are being installed. 