'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { SubmissionChecklistConfig, ChecklistItem } from '@/utils/submission-checklist-service';

export function SubmissionChecklist() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checklists, setChecklists] = useState<SubmissionChecklistConfig[]>([]);
  const [selectedChecklistId, setSelectedChecklistId] = useState<string | null>(null);
  const [selectedChecklistItems, setSelectedChecklistItems] = useState<ChecklistItem[]>([]);
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [assessing, setAssessing] = useState<Record<string, boolean>>({});
  const [documentSelections, setDocumentSelections] = useState<Record<string, string[]>>({});

  // Fetch checklists
  useEffect(() => {
    if (!session?.user?.email) return;
    
    const fetchChecklists = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/submission-checklists');
        if (!response.ok) throw new Error('Failed to fetch checklists');
        
        const data = await response.json();
        setChecklists(data);
        
        // Auto-select the first checklist if available
        if (data.length > 0 && !selectedChecklistId) {
          setSelectedChecklistId(data[0].id);
          setSelectedChecklistItems(data[0].items);
          
          // Initialize document selections for each item
          const initialSelections: Record<string, string[]> = {};
          data[0].items.forEach((item: ChecklistItem) => {
            initialSelections[item.id] = item.documents || [];
          });
          setDocumentSelections(initialSelections);
        }
      } catch (err) {
        setError('Failed to load checklists');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChecklists();
  }, [session, selectedChecklistId]);

  // Fetch user files
  useEffect(() => {
    if (!session?.user?.email) return;
    
    const fetchUserFiles = async () => {
      try {
        const response = await fetch('/api/files/list');
        if (!response.ok) throw new Error('Failed to fetch files');
        
        const data = await response.json();
        setUserFiles(data);
      } catch (err) {
        console.error('Failed to load files:', err);
      }
    };
    
    fetchUserFiles();
  }, [session]);

  // Handle checklist selection
  const handleChecklistChange = (checklistId: string) => {
    const selectedChecklist = checklists.find(cl => cl.id === checklistId);
    if (selectedChecklist) {
      setSelectedChecklistId(checklistId);
      setSelectedChecklistItems(selectedChecklist.items);
      
      // Initialize document selections for each item
      const initialSelections: Record<string, string[]> = {};
      selectedChecklist.items.forEach(item => {
        initialSelections[item.id] = item.documents || [];
      });
      setDocumentSelections(initialSelections);
    }
  };

  // Handle document selection for a checklist item
  const handleDocumentSelection = (itemId: string, documentPath: string, isSelected: boolean) => {
    setDocumentSelections(prev => {
      const currentDocs = prev[itemId] || [];
      if (isSelected) {
        return { ...prev, [itemId]: [...currentDocs, documentPath] };
      } else {
        return { ...prev, [itemId]: currentDocs.filter(path => path !== documentPath) };
      }
    });
  };

  // Assess compliance for a checklist item
  const assessCompliance = async (itemId: string) => {
    if (!selectedChecklistId || !documentSelections[itemId]?.length) return;
    
    try {
      setAssessing(prev => ({ ...prev, [itemId]: true }));
      
      // Get the checklist item
      const item = selectedChecklistItems.find(i => i.id === itemId);
      if (!item) {
        throw new Error('Checklist item not found');
      }
      
      // Get document contents
      const documentContents: Record<string, string> = {};
      for (const docPath of documentSelections[itemId]) {
        try {
          const fileResponse = await fetch(`/api/files/content?pathname=${encodeURIComponent(docPath)}`);
          if (fileResponse.ok) {
            const data = await fileResponse.json();
            documentContents[docPath] = data.content;
          }
        } catch (error) {
          console.error(`Error fetching content for ${docPath}:`, error);
        }
      }
      
      if (Object.keys(documentContents).length === 0) {
        throw new Error('No document content available');
      }
      
      // Combine document content
      const combinedContent = Object.values(documentContents).join('\n\n');
      
      // Create system prompt
      const systemPrompt = `You are an assistant that assesses compliance of documents against requirements.
You must categorize your assessment as one of these: "compliant", "non-compliant", or "needs-review".
Format your response with "Assessment:" followed by your category, then "Explanation:" followed by your reasoning.`;
      
      // Create user prompt
      const userPrompt = `Requirement: ${item.requirement}

Document content:
${combinedContent}

Please analyze the document content against the requirement and provide your assessment.`;
      
      // Call the API directly like document-builder.tsx and chat-with-docs.tsx
      const queryResponse = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt,
          userPrompt,
          model: "google/gemini-2.0-flash-001",
          maxTokens: 1000,
        }),
      });
      
      if (!queryResponse.ok) {
        throw new Error('Failed to assess compliance: API error');
      }
      
      const data = await queryResponse.json();
      
      if (!data || !data.response) {
        throw new Error('Invalid API response');
      }
      
      // Parse the response
      const responseText = data.response;
      let status: ChecklistItem['status'] = 'needs-review';
      
      // Extract status from the assessment line
      const assessmentMatch = responseText.match(/Assessment:\s*(compliant|non-compliant|needs-review)/i);
      if (assessmentMatch) {
        const assessment = assessmentMatch[1].toLowerCase();
        if (assessment === 'compliant') {
          status = 'compliant';
        } else if (assessment === 'non-compliant') {
          status = 'non-compliant';
        } else {
          status = 'needs-review';
        }
      } else {
        // Fallback parsing if the format isn't followed
        if (responseText.toLowerCase().includes('compliant') && !responseText.toLowerCase().includes('non-compliant')) {
          status = 'compliant';
        } else if (responseText.toLowerCase().includes('non-compliant')) {
          status = 'non-compliant';
        }
      }

      // Update the checklist item with assessment results
      setSelectedChecklistItems(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, status, comments: responseText } 
            : item
        )
      );
      
      // Update the checklist in the server
      updateChecklist(itemId, status, responseText);
    } catch (err) {
      console.error('Error assessing compliance:', err);
    } finally {
      setAssessing(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // Assess all checklist items
  const assessAllItems = async () => {
    if (!selectedChecklistId) return;
    
    // Process each item one by one to avoid overwhelming the server
    for (const item of selectedChecklistItems) {
      if (documentSelections[item.id]?.length) {
        await assessCompliance(item.id);
      }
    }
  };

  // Update checklist in the server after assessment
  const updateChecklist = async (itemId: string, status: ChecklistItem['status'], comments: string) => {
    if (!selectedChecklistId) return;
    
    try {
      // Update via the API
      const response = await fetch(`/api/submission-checklists/${selectedChecklistId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          status,
          comments,
          documentPaths: documentSelections[itemId] || [],
          operation: 'update_assessment'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update checklist');
      }
      
      // No need to update local state since it's already updated in assessCompliance
    } catch (err) {
      console.error('Error updating checklist:', err);
    }
  };

  // Redirect to files page for document upload
  const goToFilesPage = () => {
    window.location.href = '/files';
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    if (status === 'compliant') {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-medium">Compliant</span>;
    } else if (status === 'non-compliant') {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-md text-xs font-medium">Non-Compliant</span>;
    } else if (status === 'needs-review') {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs font-medium">Needs Review</span>;
    } else {
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs font-medium">Not Checked</span>;
    }
  };

  if (loading) {
    return <div className="p-6">Loading submission checklists...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }

  if (checklists.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          <h2 className="text-2xl font-bold mb-4 text-deep-purple">Submission Checklist</h2>
          <p className="mb-4">No checklists available. Please create a checklist in the Submission Checklist Config Manager.</p>
          <button 
            onClick={() => window.location.href = '/submission-checklist-config'} 
            className="bg-purple text-white py-2 px-4 rounded-md hover:bg-deep-purple transition-colors"
          >
            Go to Checklist Config Manager
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-deep-purple">Submission Checklist</h2>
        
        {/* Checklist selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Checklist</label>
          <select 
            value={selectedChecklistId || ''} 
            onChange={(e) => handleChecklistChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple"
          >
            {checklists.map((checklist) => (
              <option key={checklist.id} value={checklist.id}>
                {checklist.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Description */}
        {selectedChecklistId && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-1">Description</h3>
            <p className="text-gray-700">
              {checklists.find(cl => cl.id === selectedChecklistId)?.description || 'No description available.'}
            </p>
          </div>
        )}
        
        {/* Assess All button */}
        <div className="mb-6 flex justify-end">
          <button 
            onClick={assessAllItems}
            className="bg-purple text-white py-2 px-4 rounded-md hover:bg-deep-purple transition-colors"
            disabled={!selectedChecklistId}
          >
            Assess All Items
          </button>
        </div>

        {/* Checklist items */}
        {selectedChecklistItems.length > 0 ? (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Checklist Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-2 px-4 border-b text-left">Item</th>
                    <th className="py-2 px-4 border-b text-left">Requirement</th>
                    <th className="py-2 px-4 border-b text-left">Documents</th>
                    <th className="py-2 px-4 border-b text-left">Status</th>
                    <th className="py-2 px-4 border-b text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedChecklistItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-3 px-4">{item.name}</td>
                      <td className="py-3 px-4">{item.requirement}</td>
                      <td className="py-3 px-4">
                        <div className="mb-2">
                          <select 
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple"
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleDocumentSelection(item.id, e.target.value, true);
                                e.target.value = "";
                              }
                            }}
                          >
                            <option value="">Select document to add...</option>
                            {userFiles.map((file: any) => (
                              <option 
                                key={file.pathname} 
                                value={file.pathname}
                                disabled={(documentSelections[item.id] || []).includes(file.pathname)}
                              >
                                {file.pathname}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Selected documents */}
                        <div className="space-y-1">
                          {(documentSelections[item.id] || []).map((docPath) => (
                            <div key={docPath} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-sm">
                              <span className="truncate max-w-[220px]">{docPath}</span>
                              <button 
                                onClick={() => handleDocumentSelection(item.id, docPath, false)}
                                className="text-red-500 hover:text-red-700 ml-2"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                        
                        {(documentSelections[item.id] || []).length === 0 && (
                          <button 
                            onClick={goToFilesPage}
                            className="text-sm text-purple hover:text-deep-purple"
                          >
                            Upload new documents
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {renderStatusBadge(item.status || 'not-checked')}
                        {item.comments && (
                          <div className="mt-2 text-sm text-gray-700 max-h-24 overflow-y-auto">
                            <div className="font-medium">Comments:</div>
                            <p>{item.comments}</p>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button 
                          onClick={() => assessCompliance(item.id)}
                          disabled={!documentSelections[item.id]?.length || assessing[item.id]}
                          className="bg-purple text-white py-1 px-3 rounded text-sm hover:bg-deep-purple transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {assessing[item.id] ? 'Assessing...' : 'Assess'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          selectedChecklistId && (
            <div className="text-gray-500 italic mb-6">No checklist items available.</div>
          )
        )}
      </div>
    </div>
  );
} 