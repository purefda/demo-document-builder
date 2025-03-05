"use client";

import { useState, useRef, useEffect } from "react";
import { InfoIcon, LoaderIcon, TrashIcon, UploadIcon, PencilEditIcon } from "./icons";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Example medical device fields for extraction based on the PRD
const DEFAULT_FIELDS = [
  { key: "MANUFACTURER_NAME", prompt: "Provide the manufacturer name" },
  { key: "DEVICE_NAME", prompt: "Provide the full name of the medical device" },
  { key: "MODEL_NUMBER", prompt: "Extract the model number of the device" },
  { key: "INDICATION_FOR_USE", prompt: "Write the indication for use for this device" },
  { key: "CONTRAINDICATIONS", prompt: "List all contraindications for this device" },
  { key: "WARNINGS", prompt: "Extract all warnings associated with this device" },
  { key: "PRECAUTIONS", prompt: "List safety precautions for using this device" },
  { key: "STORAGE_CONDITIONS", prompt: "Provide storage conditions for this device" },
  { key: "STERILIZATION_METHOD", prompt: "Describe the sterilization method for this device" },
  { key: "EXPIRATION_DATE", prompt: "Extract information about expiration date or shelf life" }
];

export interface FileMetadata {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
}

export function DocumentBuilder() {
  const router = useRouter();
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [extractedInfo, setExtractedInfo] = useState<{ [key: string]: { value: string; reviewed: boolean } }>({});
  const [extractingField, setExtractingField] = useState<string | null>(null);
  const [extractingAll, setExtractingAll] = useState(false);
  const [userFiles, setUserFiles] = useState<FileMetadata[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingDocuments, setProcessingDocuments] = useState<{ [key: string]: boolean }>({});

  // Fetch user's files on component mount
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch('/api/files/list');
        if (!response.ok) {
          throw new Error('Failed to fetch files');
        }
        const files = await response.json();
        setUserFiles(files);
      } catch (err) {
        setError('Error loading files. Please try again later.');
        console.error('Error fetching files:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  const handleAddField = () => {
    setFields([...fields, { key: `FIELD_${fields.length + 1}`, prompt: "" }]);
  };

  const handleUpdateField = (index: number, key: string, value: string) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);
  };

  const handleDeleteField = (index: number) => {
    if (fields.length > 1) {
      const newFields = [...fields];
      newFields.splice(index, 1);
      setFields(newFields);
    }
  };

  const toggleFileSelection = (pathname: string) => {
    setSelectedFiles(prev => 
      prev.includes(pathname) 
        ? prev.filter(p => p !== pathname) 
        : [...prev, pathname]
    );
  };

  const handleExtract = async (fieldKey: string) => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one document first");
      return;
    }
    
    setExtractingField(fieldKey);
    setError(null);
    
    // Reset document processing states
    const initialProcessingState: { [key: string]: boolean } = {};
    selectedFiles.forEach(f => initialProcessingState[f] = false);
    setProcessingDocuments(initialProcessingState);
    
    try {
      // Find the field with matching key
      const field = fields.find(f => f.key === fieldKey);
      if (!field) {
        throw new Error(`Field ${fieldKey} not found`);
      }

      // Get selected files info with pathname property
      const selectedFilesInfo = userFiles
        .filter(file => selectedFiles.includes(file.pathname))
        .map(file => ({ 
          name: file.pathname, 
          url: file.url,
          pathname: file.pathname 
        }));
      
      // Fetch the content of each selected document
      const documentsWithContent = await Promise.all(
        selectedFilesInfo.map(async (file, index) => {
          try {
            // Mark this document as being processed
            setProcessingDocuments(prev => ({ ...prev, [file.pathname]: true }));
            
            // Fetch the document content using the file pathname to get the redirect first
            const redirectResponse = await fetch(`/api/files/get?pathname=${encodeURIComponent(file.pathname)}`);
            
            if (!redirectResponse.ok) {
              throw new Error(`Failed to access ${file.name}`);
            }
            
            // Get the actual file URL from the redirect
            const fileUrl = redirectResponse.url;
            
            // Use our server-side API to extract the content
            const contentResponse = await fetch(`/api/files/content?url=${encodeURIComponent(fileUrl)}`);
            
            if (!contentResponse.ok) {
              throw new Error(`Failed to extract content from ${file.name}`);
            }
            
            const data = await contentResponse.json();
            
            // Mark document as processed
            setProcessingDocuments(prev => ({ ...prev, [file.pathname]: false }));
            
            return {
              ...file,
              content: data.content || `[No content extracted from ${file.name}]`
            };
          } catch (error) {
            // Mark document as processed (with error)
            setProcessingDocuments(prev => ({ ...prev, [file.pathname]: false }));
            console.error(`Error fetching content for ${file.name}:`, error);
            return {
              ...file,
              content: `[Failed to load content for ${file.name}]`
            };
          }
        })
      );
      
      // Construct document content text to send to the API
      // Limit each document content to a reasonable size to avoid token limits
      const documentContents = documentsWithContent.map(doc => {
        // Truncate content if it's too long (about 10,000 characters per document)
        const maxContentLength = 100000000;
        const truncatedContent = doc.content.length > maxContentLength 
          ? doc.content.substring(0, maxContentLength) + "... [Content truncated due to length]"
          : doc.content;
        
        return `Document: ${doc.name}\n\n${truncatedContent}\n\n`;
      }).join('---\n\n');

      // Construct the system prompt and user prompt
      const systemPrompt = "You are an AI assistant that extracts specific information from medical device documentation. Extract the exact information requested, using only the provided documents. If the information is not found, say 'Information not found'. Don't replay irrelvant information like \"here is the information I found for you\" or \"here is the information I extracted for you\" or anything like that, just reply with the information requested.";
      
      // Call the query API
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt,
          userPrompt: `find the information for the field: ${field.key}. With the prompt: ${field.prompt}\n\nHere are the documents to extract from:\n\n${documentContents}`,
          // Using default model from the PRD (set in the API)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract information');
      }

      const data = await response.json();
      const extractedValue = data.choices[0]?.message?.content || 'Failed to extract information';

      setExtractedInfo(prev => ({
        ...prev,
        [fieldKey]: {
          value: extractedValue,
          reviewed: false
        }
      }));
    } catch (err) {
      console.error('Error extracting information:', err);
      setError('Failed to extract information. Please try again.');
    } finally {
      setExtractingField(null);
    }
  };

  const handleExtractAll = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one document first");
      return;
    }
    
    setExtractingAll(true);
    setError(null);
    
    try {
      // Process fields one by one
      for (const field of fields) {
        if (!field.key || !field.prompt) continue;
        
        setExtractingField(field.key);
        try {
          // Call extract for each field but don't let errors stop the whole process
          await handleExtract(field.key);
        } catch (error: any) {
          console.error(`Error extracting ${field.key}:`, error);
          // Continue with other fields even if one fails
          setExtractedInfo(prev => ({
            ...prev,
            [field.key]: {
              value: `Error extracting information: ${error.message || 'Unknown error'}`,
              reviewed: false
            }
          }));
        }
      }
    } catch (err) {
      console.error('Error during extract all operation:', err);
      setError('Some fields failed to extract. Please check the results.');
    } finally {
      setExtractingField(null);
      setExtractingAll(false);
    }
  };

  const handleToggleReviewed = (key: string) => {
    setExtractedInfo(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        reviewed: !prev[key]?.reviewed
      }
    }));
  };

  const handleUpdateExtractedValue = (key: string, value: string) => {
    setExtractedInfo(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        value,
        reviewed: true
      }
    }));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-3xl font-bold text-center mb-8 text-[#00185c]">
        Document Builder
      </h1>
      
      <div className="grid gap-8">
        {/* Document Selection Section */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 transition-all hover:shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-[#00185c]">Document Management</h2>
          
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <LoaderIcon size={32} />
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 text-center">{error}</div>
          ) : (
            <>
              {userFiles.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 text-sm italic">No documents uploaded yet</p>
                  <Link 
                    href="/files" 
                    className="mt-4 inline-block px-4 py-2 bg-[#2f59cf] text-white rounded-md hover:bg-[#00185c] transition-colors"
                  >
                    Go to Files Page to Upload
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex justify-between mb-4">
                    <p className="text-gray-500 text-sm">
                      Select documents to use for information extraction
                    </p>
                    <Link 
                      href="/files" 
                      className="text-[#2f59cf] hover:text-[#00185c] text-sm font-medium"
                    >
                      Upload New Documents
                    </Link>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    <table className="min-w-full border-collapse">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                          <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filename</th>
                          <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                          <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {userFiles.map((file) => (
                          <tr 
                            key={file.pathname}
                            className={`hover:bg-gray-50 cursor-pointer ${
                              selectedFiles.includes(file.pathname) ? 'bg-[#f6f8fd]' : ''
                            } ${
                              processingDocuments[file.pathname] ? 'animate-pulse' : ''
                            }`}
                            onClick={() => toggleFileSelection(file.pathname)}
                          >
                            <td className="py-3 px-4">
                              <input 
                                type="checkbox" 
                                checked={selectedFiles.includes(file.pathname)} 
                                onChange={() => {}}
                                className="h-4 w-4 text-[#2f59cf] focus:ring-[#2f59cf] border-gray-300 rounded"
                              />
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              {file.pathname}
                              {processingDocuments[file.pathname] && (
                                <span className="ml-2 text-xs text-[#2f59cf]">
                                  Processing...
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-500">{formatFileSize(file.size)}</td>
                            <td className="py-3 px-4 text-sm text-gray-500">
                              {new Date(file.uploadedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 text-sm text-gray-500">
                    Selected {selectedFiles.length} of {userFiles.length} documents
                  </div>
                </>
              )}
            </>
          )}
        </section>

        {/* Information Extraction Section */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 transition-all hover:shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[#00185c]">Information Extraction</h2>
            <div className="flex space-x-3">
              <button
                onClick={handleAddField}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Add Field
              </button>
              <button
                onClick={handleExtractAll}
                disabled={extractingAll || selectedFiles.length === 0}
                className={`px-3 py-1.5 text-sm rounded text-white transition-colors ${
                  extractingAll || selectedFiles.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#2f59cf] hover:bg-[#00185c]'
                }`}
              >
                {extractingAll ? (
                  <span className="flex items-center">
                    <LoaderIcon size={16} />
                    <span className="ml-2">Extracting All...</span>
                  </span>
                ) : (
                  'Extract All'
                )}
              </button>
            </div>
          </div>

          {fields.length === 0 ? (
            <p className="text-gray-500 italic text-center py-6">No fields defined yet. Add fields to extract information.</p>
          ) : (
            <div className="space-y-6">
              {fields.map((field, index) => (
                <div key={index} className="grid grid-cols-1 gap-4 p-4 border rounded-lg hover:shadow-sm transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => handleUpdateField(index, 'key', e.target.value)}
                        className="text-sm font-medium bg-gray-100 border border-gray-300 rounded px-2 py-1 focus:border-[#2f59cf] focus:ring-1 focus:ring-[#2f59cf] focus:outline-none"
                        placeholder="Field Key"
                      />
                      <span className="mx-2 text-gray-400">=</span>
                    </div>
                    <button
                      onClick={() => handleDeleteField(index)}
                      disabled={fields.length <= 1}
                      className={`text-red-500 hover:text-red-700 transition-colors ${
                        fields.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <TrashIcon size={18} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Prompt</label>
                      <textarea
                        value={field.prompt}
                        onChange={(e) => handleUpdateField(index, 'prompt', e.target.value)}
                        className="w-full h-24 text-sm bg-white border border-gray-300 rounded px-3 py-2 focus:border-[#2f59cf] focus:ring-1 focus:ring-[#2f59cf] focus:outline-none"
                        placeholder="Enter prompt to extract this information"
                      />
                      <div className="mt-2">
                        <button
                          onClick={() => handleExtract(field.key)}
                          disabled={extractingField === field.key || extractingAll || !field.prompt || selectedFiles.length === 0}
                          className={`flex items-center px-3 py-1.5 text-sm rounded text-white transition-colors ${
                            extractingField === field.key || extractingAll || !field.prompt || selectedFiles.length === 0
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-[#2f59cf] hover:bg-[#00185c]'
                          }`}
                        >
                          {extractingField === field.key ? (
                            <>
                              <LoaderIcon size={16} />
                              <span className="ml-2">Extracting...</span>
                            </>
                          ) : (
                            'Extract'
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs text-gray-500">Extracted Information</label>
                        {extractedInfo[field.key] && (
                          <div className="flex items-center">
                            <label className="flex items-center text-xs text-gray-500 mr-2">
                              <input
                                type="checkbox"
                                checked={extractedInfo[field.key]?.reviewed || false}
                                onChange={() => handleToggleReviewed(field.key)}
                                className="h-3 w-3 mr-1 text-[#2f59cf] focus:ring-[#2f59cf] border-gray-300 rounded"
                              />
                              Reviewed
                            </label>
                          </div>
                        )}
                      </div>
                      <textarea
                        value={extractedInfo[field.key]?.value || ''}
                        onChange={(e) => handleUpdateExtractedValue(field.key, e.target.value)}
                        className="w-full h-24 text-sm bg-white border border-gray-300 rounded px-3 py-2 focus:border-[#2f59cf] focus:ring-1 focus:ring-[#2f59cf] focus:outline-none"
                        placeholder="Extracted information will appear here"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
} 