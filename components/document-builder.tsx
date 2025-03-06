"use client";

import { useState, useRef, useEffect } from "react";
import { InfoIcon, LoaderIcon, TrashIcon, UploadIcon, PencilEditIcon } from "./icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FieldPrompt } from "@/utils/field-prompt-service";

// Example medical device fields for extraction based on the PRD
const DEFAULT_FIELDS: FieldPrompt[] = [
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

interface FieldPromptConfig {
  id: string;
  name: string;
  fields: FieldPrompt[];
  createdAt?: Date;
  updatedAt?: Date;
}

export function DocumentBuilder() {
  const router = useRouter();
  const [fields, setFields] = useState<FieldPrompt[]>(DEFAULT_FIELDS);
  const [extractedInfo, setExtractedInfo] = useState<{ [key: string]: { value: string; reviewed: boolean } }>({});
  const [extractingField, setExtractingField] = useState<string | null>(null);
  const [extractingAll, setExtractingAll] = useState(false);
  const [userFiles, setUserFiles] = useState<FileMetadata[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingDocuments, setProcessingDocuments] = useState<{ [key: string]: boolean }>({});
  const [availableConfigs, setAvailableConfigs] = useState<FieldPromptConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>("");

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
    loadFieldConfigs();
  }, []);

  // Load field configurations from API
  const loadFieldConfigs = async () => {
    try {
      const response = await fetch('/api/field-prompts');
      
      if (!response.ok) {
        if (response.status !== 401) { // Ignore auth errors to allow document builder to work without login
          console.error(`Failed to fetch field-prompt configs: ${response.status}`);
        }
        return;
      }
      
      const configs = await response.json();
      setAvailableConfigs(configs);
    } catch (err) {
      console.error('Error loading field configurations:', err);
    }
  };

  // Function to load a selected field configuration
  const handleLoadConfig = async (configId: string) => {
    setSelectedConfig(configId);
    
    try {
      const response = await fetch(`/api/field-prompts/${configId}`);
      
      if (!response.ok) {
        console.error(`Failed to fetch field-prompt config: ${response.status}`);
        return;
      }
      
      const config = await response.json();
      if (config && config.fields) {
        setFields(config.fields);
        // Reset extracted info when changing configuration
        setExtractedInfo({});
      }
    } catch (err) {
      console.error(`Error loading field configuration ${configId}:`, err);
    }
  };

  const handleAddField = () => {
    setFields([...fields, { key: "", prompt: "" }]);
  };

  const handleUpdateField = (index: number, key: string, value: string) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);
  };

  const handleDeleteField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    setFields(newFields);
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
      alert('Please select at least one document to extract information from.');
      return;
    }

    setExtractingField(fieldKey);
    
    try {
      const fieldToExtract = fields.find(f => f.key === fieldKey);
      if (!fieldToExtract) {
        throw new Error(`Field with key ${fieldKey} not found`);
      }

      // Get document content for each selected file
      const documents = [];
      for (const filePath of selectedFiles) {
        setProcessingDocuments(prev => ({ ...prev, [filePath]: true }));
        try {
          // Get the file from userFiles array
          const file = userFiles.find(f => f.pathname === filePath);
          if (!file) {
            console.error(`File not found in userFiles: ${filePath}`);
            continue;
          }

          console.log(`Attempting to fetch content for: ${filePath}`);
          console.log(`File URL: ${file.url}`);
          
          // Get the document content
          try {
            // Pass both pathname and url to the API
            const contentResponse = await fetch(`/api/files/content?pathname=${encodeURIComponent(filePath)}&url=${encodeURIComponent(file.url)}`);
            
            if (!contentResponse.ok) {
              console.error(`Failed to fetch content: ${contentResponse.status} ${contentResponse.statusText}`);
              throw new Error(`Failed to get content for ${filePath}`);
            }

            const contentData = await contentResponse.json();
            if (!contentData.content) {
              console.error(`No content in response for: ${filePath}`);
              throw new Error(`Failed to extract content from ${filePath}`);
            }
            
            documents.push(contentData.content);
          } catch (error) {
            console.error(`Error fetching content for ${filePath}:`, error);
            throw new Error(`Failed to get content for ${filePath}`);
          }
        } finally {
          setProcessingDocuments(prev => ({ ...prev, [filePath]: false }));
        }
      }

      const systemPrompt = `You are a specialized extraction assistant trained specifically to retrieve precise and relevant information from medical device documentation.
    Extract ONLY the requested information based strictly on the provided prompt and field key. 
    If the document does not explicitly contain the requested information, state clearly that it is not available. 
    Do not include assumptions, additional context, or irrelevant details.
    Do not reply with "ok here is the information" or anything like that, just reply with the information.
    `
      // Call the API to extract the information
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt: systemPrompt,
          userPrompt: `key is ${fieldToExtract.key}, and the prompt is ${fieldToExtract.prompt}\n\nDocument(s):\n${documents.join('\n\n---\n\n')}`,
          model: "google/gemini-2.0-flash-001",
          maxTokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract information');
      }

      const data = await response.json();
      
      // Use the response property which is extracted by the API
      setExtractedInfo(prev => ({
        ...prev,
        [fieldKey]: {
          value: data.response || '',
          reviewed: false
        }
      }));
    } catch (err) {
      console.error('Error extracting information:', err);
      alert('Failed to extract information. Please try again later.');
    } finally {
      setExtractingField(null);
    }
  };

  const handleExtractAll = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one document to extract information from.');
      return;
    }

    setExtractingAll(true);

    try {
      for (const field of fields) {
        await handleExtract(field.key);
      }
    } finally {
      setExtractingAll(false);
    }
  };

  const handleUpdateExtractedValue = (fieldKey: string, value: string) => {
    setExtractedInfo(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        value
      }
    }));
  };

  const handleToggleReviewed = (fieldKey: string) => {
    setExtractedInfo(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        reviewed: !prev[fieldKey]?.reviewed
      }
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <div className="pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-deep-purple">Document Builder</h1>
        <div className="flex items-center space-x-4">
          <Link href="/field-prompt-manager" className="text-purple hover:underline flex items-center">
            <PencilEditIcon size={16} />
            <span className="ml-1">Manage Field-Prompt Templates</span>
          </Link>
          {availableConfigs.length > 0 && (
            <div className="flex items-center">
              <label htmlFor="configSelect" className="mr-2 text-sm font-medium text-gray-700">
                Load Template:
              </label>
              <select
                id="configSelect"
                value={selectedConfig}
                onChange={(e) => handleLoadConfig(e.target.value)}
                className="form-select rounded-md border-gray-300 shadow-sm focus:border-purple focus:ring focus:ring-purple focus:ring-opacity-50"
              >
                <option value="">Select a template</option>
                {availableConfigs.map(config => (
                  <option key={config.id} value={config.id}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-8">
        {/* Document Selection Section */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 transition-all hover:shadow-md">
          <h2 className="text-xl font-semibold text-deep-purple mb-4">Document Management</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <LoaderIcon size={24} />
              <span className="ml-2">Loading documents...</span>
            </div>
          ) : (
            <>
              {userFiles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No documents found. Please upload some documents first.</p>
                  <button
                    onClick={() => router.push('/files')}
                    className="inline-flex items-center px-4 py-2 bg-purple text-white rounded-md hover:bg-opacity-90"
                  >
                    <UploadIcon size={16} />
                    <span className="ml-2">Go to Files Page</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
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
                              selectedFiles.includes(file.pathname) ? 'bg-light-white' : ''
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
                                className="h-4 w-4 text-purple focus:ring-purple border-gray-300 rounded"
                              />
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              {file.pathname}
                              {processingDocuments[file.pathname] && (
                                <span className="ml-2 text-xs text-purple">
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
            <h2 className="text-xl font-semibold text-deep-purple">Information Extraction</h2>
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
                    : 'bg-purple hover:bg-deep-purple'
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
                        className="text-sm font-medium bg-gray-100 border border-gray-300 rounded px-2 py-1 focus:border-purple focus:ring-1 focus:ring-purple focus:outline-none"
                        placeholder="Field Key"
                      />
                      <span className="mx-2 text-gray-400">=</span>
                    </div>
                    <button
                      onClick={() => handleDeleteField(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
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
                        className="w-full h-24 text-sm bg-white border border-gray-300 rounded px-3 py-2 focus:border-purple focus:ring-1 focus:ring-purple focus:outline-none"
                        placeholder="Enter prompt to extract this information"
                      />
                      <div className="mt-2">
                        <button
                          onClick={() => handleExtract(field.key)}
                          disabled={extractingField === field.key || extractingAll || !field.prompt || selectedFiles.length === 0}
                          className={`flex items-center px-3 py-1.5 text-sm rounded text-white transition-colors ${
                            extractingField === field.key || extractingAll || !field.prompt || selectedFiles.length === 0
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-purple hover:bg-deep-purple'
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
                                className="h-3 w-3 mr-1 text-purple focus:ring-purple border-gray-300 rounded"
                              />
                              Reviewed
                            </label>
                          </div>
                        )}
                      </div>
                      <textarea
                        value={extractedInfo[field.key]?.value || ''}
                        onChange={(e) => handleUpdateExtractedValue(field.key, e.target.value)}
                        className="w-full h-24 text-sm bg-white border border-gray-300 rounded px-3 py-2 focus:border-purple focus:ring-1 focus:ring-purple focus:outline-none"
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