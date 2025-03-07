"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Define types for the compliance checklist
interface Document {
  id: string;
  pathname: string;
  url: string;
  size: number;
  uploadedAt: Date;
}

interface ChecklistItem {
  serial: string;
  requirement: string;
  appliedStandards: string;
  complyingDocuments: string;
  complianceStatus: 'Y' | 'N' | 'NA' | '';
  location: string;
  criteria: string;
  comments: string;
  introSummary?: string;
}

interface ChecklistConfig {
  id: string;
  name: string;
  config: {
    items: ChecklistItem[];
  };
}

export default function ComplianceChecklist() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [configs, setConfigs] = useState<{ id: string; name: string }[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [checklistResults, setChecklistResults] = useState<ChecklistItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch documents and checklist configurations
  const fetchDocumentsAndConfigs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch documents
      const docsResponse = await fetch('/api/files/list');
      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        setDocuments(docsData || []);
      } else {
        setError('Failed to fetch documents. Please try again later.');
      }

      // Fetch configs
      const configsResponse = await fetch('/api/compliance-checklists');
      if (configsResponse.ok) {
        const configsData = await configsResponse.json();
        setConfigs(configsData.checklists || []);
      } else {
        setError('Failed to fetch checklist configurations. Please try again later.');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch documents and checklist configs on load
  useEffect(() => {
    if (!session?.user) return;
    fetchDocumentsAndConfigs();
  }, [session]);

  // Load config when selected
  useEffect(() => {
    if (!selectedConfig) {
      setChecklistItems([]);
      return;
    }

    const loadConfig = async () => {
      try {
        const response = await fetch(`/api/compliance-checklists/${selectedConfig}`);
        if (response.ok) {
          const data = await response.json();
          setChecklistItems(data.checklist.config.items || []);
          // Reset results when loading a new config
          setChecklistResults([]);
        }
      } catch (error) {
        console.error('Error loading config:', error);
      }
    };

    loadConfig();
  }, [selectedConfig]);

  // Run compliance check
  const runComplianceCheck = async () => {
    if (!selectedDocuments.length || !checklistItems.length) {
      alert('Please select documents and a checklist configuration.');
      return;
    }

    setLoading(true);
    const results = [];

    try {
      // Get the full document objects from the selected IDs
      const selectedDocs = documents.filter(doc => selectedDocuments.includes(doc.url));
      
      // Run each checklist item through the query API
      for (const item of checklistItems) {
        try {
          // Prepare the system prompt for the API
          const systemPrompt = `
            You are a compliance assessment expert for medical devices. 
            Analyze the documents to determine if they meet the following requirement: 
            ${item.requirement}
            
            The applied standards are: ${item.appliedStandards}
            
            The compliance criteria is: ${item.criteria}
            
            Relevant documents that should be analyzed: ${item.complyingDocuments}
            
            Use only the document content provided to make your assessment.
            
            You must categorize your assessment as one of these: "Y" for compliant, "N" for non-compliant, or "NA" for not applicable.
            
            Your response MUST be in JSON format with the following structure:
            {
              "complianceStatus": "Y", "N", or "NA",
              "location": "Specific section(s) or page(s) that support compliance (if applicable)",
              "comments": "Detailed explanation of your assessment (100-200 words)"
            }
            
            Return only valid JSON - no markdown formatting or other text.
          `;
          
          // Prepare user prompt
          const userPrompt = `
            I need to assess compliance for requirement #${item.serial}:
            "${item.requirement}"
            
            Based on the documents: ${selectedDocs.map(d => d.pathname).join(', ')}
            
            I need to determine if these documents demonstrate compliance with the requirement above.
            For this assessment, I need:
            
            1. A compliance status:
               - Use "Y" if the documents show clear compliance
               - Use "N" if the documents indicate non-compliance
               - Use "NA" if compliance cannot be determined from these documents
               
            2. Specific locations in the documents that support this assessment (if any)
            
            3. A detailed explanation (100-200 words) justifying the compliance determination
            
            Please format your response ONLY as a JSON object as specified, with no markdown or other text.
          `;
          
          // Call the query API
          let response;
          try {
            response = await fetch('/api/query', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                systemPrompt,
                userPrompt,
                model: 'google/gemini-2.0-flash-001:online',
                documents: selectedDocuments,
              }),
              // Add timeout to prevent hanging request
              signal: AbortSignal.timeout(60000), // 60 second timeout
            });
          } catch (fetchError: any) {
            console.error(`Fetch error for item ${item.serial}:`, fetchError);
            results.push({
              ...item,
              complianceStatus: 'NA',
              location: '',
              comments: `API connection error: ${fetchError.message || 'Could not connect to assessment service'}`
            });
            continue; // Skip to the next item
          }
          
          if (response.ok) {
            const data = await response.json();
            console.log(`Raw API response for item ${item.serial}:`, data.response);
            
            try {
              // Try to parse the response as JSON
              let jsonResponse = null;
              const responseText = data.response || '';
              
              // First approach: Try direct JSON parsing
              try {
                if (typeof responseText === 'string') {
                  // Clean up the response: remove any markdown code block markers and trim whitespace
                  const cleanedResponse = responseText.replace(/```json|```/g, '').trim();
                  jsonResponse = JSON.parse(cleanedResponse);
                } else {
                  jsonResponse = responseText;
                }
              } catch (parseError) {
                console.error(`JSON parse error for item ${item.serial}, trying regex approach:`, parseError);
                
                // Second approach: Extract JSON object using regex
                const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
                if (jsonMatch) {
                  try {
                    jsonResponse = JSON.parse(jsonMatch[0]);
                  } catch (error) {
                    console.error(`Regex JSON extraction failed for item ${item.serial}:`, error);
                  }
                }
                
                // Third approach: Text-based extraction like Submission Checklist
                if (!jsonResponse) {
                  console.log(`Attempting text-based extraction for item ${item.serial}`);
                  
                  // Default values
                  const extractedResponse = {
                    complianceStatus: 'NA',
                    location: '',
                    comments: responseText.substring(0, 500) // Use the response as comments
                  };
                  
                  // Try to determine compliance status from text
                  if (responseText.toLowerCase().includes('compliant') && !responseText.toLowerCase().includes('non-compliant')) {
                    extractedResponse.complianceStatus = 'Y';
                  } else if (responseText.toLowerCase().includes('non-compliant')) {
                    extractedResponse.complianceStatus = 'N';
                  }
                  
                  jsonResponse = extractedResponse;
                }
              }
              
              console.log(`Final parsed response for item ${item.serial}:`, jsonResponse);
              
              // Use the extracted data
              if (jsonResponse) {
                results.push({
                  ...item,
                  complianceStatus: jsonResponse.complianceStatus || 'NA',
                  location: jsonResponse.location || '',
                  comments: jsonResponse.comments || 'No detailed assessment provided by the model.'
                });
              } else {
                // Fallback if all parsing approaches fail
                results.push({
                  ...item,
                  complianceStatus: 'NA',
                  location: '',
                  comments: `Unable to parse response: ${responseText.substring(0, 200)}...`
                });
              }
            } catch (e) {
              console.error(`Error processing response for item ${item.serial}:`, e);
              // If parsing fails, extract what we can from the raw response
              const rawResponse = typeof data.response === 'string' ? data.response : JSON.stringify(data.response);
              
              results.push({
                ...item,
                complianceStatus: 'NA',
                location: '',
                comments: `The model provided a response but it couldn't be properly processed. Raw response: ${rawResponse.substring(0, 200)}...`
              });
            }
          } else {
            console.error(`API error for item ${item.serial}:`, response.statusText);
            results.push({
              ...item,
              complianceStatus: 'NA',
              location: '',
              comments: `Error calling assessment API: ${response.status} ${response.statusText}`
            });
          }
        } catch (itemError: any) {
          console.error(`Error processing item ${item.serial}:`, itemError);
          results.push({
            ...item,
            complianceStatus: 'NA',
            location: '',
            comments: `An error occurred while processing this requirement: ${itemError.message}`
          });
        }
      }
      
    } catch (error) {
      console.error('Error running compliance check:', error);
      alert('An error occurred while running the compliance check.');
    } finally {
      setChecklistResults(results);
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <div className="container p-4 mx-auto">
      <h1 className="mb-6 text-2xl font-bold text-[#2f59cf]">Compliance Checklist</h1>
      
      {/* Document Selection */}
      <div className="p-4 mb-6 border rounded-lg shadow-sm bg-white">
        <h2 className="mb-4 text-xl font-semibold text-[#00185c]">Select Documents</h2>
        {loading ? (
          <div className="flex justify-center items-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#2f59cf]"></div>
          </div>
        ) : error ? (
          <div className="p-6 text-red-600 text-center">
            {error}
            <button
              onClick={() => fetchDocumentsAndConfigs()}
              className="ml-2 text-[#2f59cf] hover:underline"
            >
              Retry
            </button>
          </div>
        ) : documents.length > 0 ? (
          <div className="mb-4 max-h-60 overflow-y-auto">
            {documents.map((doc) => (
              <div key={doc.url} className="flex items-center p-2 hover:bg-[#f6f8fd]">
                <input
                  type="checkbox"
                  id={doc.url}
                  checked={selectedDocuments.includes(doc.url)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDocuments([...selectedDocuments, doc.url]);
                    } else {
                      setSelectedDocuments(selectedDocuments.filter(id => id !== doc.url));
                    }
                  }}
                  className="mr-3 h-4 w-4 text-[#2f59cf]"
                />
                <label htmlFor={doc.url} className="flex-1 cursor-pointer">
                  {doc.pathname} <span className="text-xs text-gray-500 ml-2">({formatFileSize(doc.size)})</span>
                </label>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500">No documents found. Please upload documents in the Files page.</p>
            <a href="/files" className="inline-block mt-3 px-4 py-2 bg-[#2f59cf] text-white rounded-md hover:bg-[#00185c]">
              Go to Files Page
            </a>
          </div>
        )}
        
        {documents.length > 0 && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">{selectedDocuments.length} documents selected</span>
            {selectedDocuments.length > 0 && (
              <button
                onClick={() => setSelectedDocuments([])}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Clear Selection
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Checklist Configuration */}
      <div className="p-4 mb-6 border rounded-lg shadow-sm bg-white">
        <h2 className="mb-4 text-xl font-semibold text-[#00185c]">Checklist Configuration</h2>
        <div className="mb-4">
          <label htmlFor="configSelect" className="block mb-2 text-sm font-medium text-gray-700">
            Select a Compliance Checklist
          </label>
          <select
            id="configSelect"
            value={selectedConfig}
            onChange={(e) => setSelectedConfig(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#2f59cf] focus:border-[#2f59cf]"
          >
            <option value="">Select a configuration...</option>
            {configs.map(config => (
              <option key={config.id} value={config.id}>{config.name}</option>
            ))}
          </select>
        </div>
        
        <div className="flex justify-between">
          <a href="/compliance-checklist-config" className="text-sm text-[#2f59cf] hover:text-[#00185c]">
            Manage Checklist Configurations
          </a>
        </div>
      </div>
      
      {/* Run Assessment Button */}
      {selectedConfig && selectedDocuments.length > 0 && (
        <div className="flex justify-center mb-6">
          <button
            onClick={runComplianceCheck}
            disabled={loading}
            className="px-6 py-2 font-semibold text-white bg-[#2f59cf] rounded-md hover:bg-[#00185c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2f59cf] disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Running Assessment...</span>
              </>
            ) : (
              'Run Compliance Assessment'
            )}
          </button>
        </div>
      )}
      
      {/* Results Table */}
      {checklistResults.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-[#00185c]">Compliance Assessment Results</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f6f8fd] text-[#00185c]">
                  <th className="p-3 text-left border">Serial</th>
                  <th className="p-3 text-left border">General Requirement</th>
                  <th className="p-3 text-left border">Applied Standards</th>
                  <th className="p-3 text-left border">Complying Documents</th>
                  <th className="p-3 text-center border w-24">Comply (Y/N/NA)</th>
                  <th className="p-3 text-left border">Location</th>
                  <th className="p-3 text-left border">Compliance Criteria</th>
                  <th className="p-3 text-left border">Comments</th>
                </tr>
              </thead>
              <tbody>
                {checklistResults.map((item, index) => (
                  <React.Fragment key={index}>
                    <tr className="border-t hover:bg-[#f6f8fd]">
                      <td className="p-3 border align-top">{item.serial}</td>
                      <td className="p-3 border align-top">
                        {item.introSummary && (
                          <div className="mb-2 italic text-sm text-gray-600">
                            {item.introSummary}
                          </div>
                        )}
                        {item.requirement}
                      </td>
                      <td className="p-3 border align-top whitespace-pre-line">{item.appliedStandards}</td>
                      <td className="p-3 border align-top whitespace-pre-line">{item.complyingDocuments}</td>
                      <td className={`p-3 border align-top text-center font-semibold ${
                        item.complianceStatus === 'Y' ? 'text-green-600' : 
                        item.complianceStatus === 'N' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {item.complianceStatus}
                      </td>
                      <td className="p-3 border align-top whitespace-pre-line">{item.location}</td>
                      <td className="p-3 border align-top whitespace-pre-line">{item.criteria}</td>
                      <td className="p-3 border align-top whitespace-pre-line">
                        {item.comments.startsWith('No assessment') || item.comments.startsWith('The model') ? (
                          <div className="text-yellow-600">{item.comments}</div>
                        ) : (
                          item.comments
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                const csvContent = [
                  ['Serial', 'General Requirement', 'Applied Standards', 'Complying Documents', 'Comply (Y/N/NA)', 'Location', 'Compliance Criteria', 'Comments'].join(','),
                  ...checklistResults.map(item => [
                    `"${item.serial}"`,
                    `"${item.requirement.replace(/"/g, '""')}"`,
                    `"${item.appliedStandards.replace(/"/g, '""')}"`,
                    `"${item.complyingDocuments.replace(/"/g, '""')}"`,
                    `"${item.complianceStatus}"`,
                    `"${item.location.replace(/"/g, '""')}"`,
                    `"${item.criteria.replace(/"/g, '""')}"`,
                    `"${item.comments.replace(/"/g, '""')}"`
                  ].join(','))
                ].join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'compliance_assessment_results.csv');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="px-4 py-2 text-white bg-[#2f59cf] rounded hover:bg-[#00185c]"
            >
              Export to CSV
            </button>
          </div>
        </div>
      )}
      
      {/* No Results Message */}
      {selectedConfig && selectedDocuments.length > 0 && !loading && checklistResults.length === 0 && (
        <div className="p-6 mt-6 text-center bg-[#f6f8fd] rounded-lg">
          <p className="text-gray-600">
            Click "Run Compliance Assessment" to evaluate the selected documents against the chosen checklist.
          </p>
        </div>
      )}
    </div>
  );
} 