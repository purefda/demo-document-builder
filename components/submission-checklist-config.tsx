'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { v4 as uuid } from 'uuid';
import type { SubmissionChecklistConfig, ChecklistItem } from '@/utils/submission-checklist-service';

export function SubmissionChecklistConfig() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checklists, setChecklists] = useState<SubmissionChecklistConfig[]>([]);
  const [selectedChecklistId, setSelectedChecklistId] = useState<string | null>(null);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonEditorValue, setJsonEditorValue] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  
  // Form values
  const [checklistName, setChecklistName] = useState('');
  const [checklistDescription, setChecklistDescription] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  
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
      } catch (err) {
        setError('Failed to load checklists');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChecklists();
  }, [session]);
  
  // Create a new empty checklist
  const createNewChecklist = () => {
    setSelectedChecklistId(null);
    setChecklistName('New Checklist');
    setChecklistDescription('');
    setIsShared(false);
    setChecklistItems([
      {
        id: uuid(),
        name: 'Item 1',
        requirement: 'Requirement description',
        documents: [],
        status: 'not-checked',
        comments: '',
      },
    ]);
    setShowJsonEditor(false);
  };
  
  // Select a checklist to edit
  const selectChecklist = (id: string) => {
    const selected = checklists.find(cl => cl.id === id);
    if (selected) {
      setSelectedChecklistId(id);
      setChecklistName(selected.name);
      setChecklistDescription(selected.description);
      setIsShared(selected.isShared || false);
      setChecklistItems(selected.items);
      setShowJsonEditor(false);
      
      // Update JSON editor value
      setJsonEditorValue(JSON.stringify(selected, null, 2));
    }
  };
  
  // Add a new item to the checklist
  const addChecklistItem = () => {
    const newItem: ChecklistItem = {
      id: uuid(),
      name: `Item ${checklistItems.length + 1}`,
      requirement: 'Requirement description',
      documents: [],
      status: 'not-checked',
      comments: '',
    };
    
    setChecklistItems(prev => [...prev, newItem]);
  };
  
  // Remove an item from the checklist
  const removeChecklistItem = (id: string) => {
    setChecklistItems(prev => prev.filter(item => item.id !== id));
  };
  
  // Update a checklist item
  const updateChecklistItem = (id: string, field: string, value: string) => {
    setChecklistItems(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, [field]: value } 
          : item
      )
    );
  };
  
  // Save checklist
  const saveChecklist = async () => {
    if (!session?.user?.email) return;
    
    try {
      // For a new checklist or full save
      if (!selectedChecklistId || checklistItems.length === 0) {
        const config: Omit<SubmissionChecklistConfig, 'updatedAt'> = {
          id: selectedChecklistId || uuid(),
          name: checklistName,
          description: checklistDescription,
          items: checklistItems,
          userEmail: session.user.email,
          createdAt: new Date(),
          isShared,
        };
        
        const endpoint = isShared 
          ? '/api/submission-checklists/shared' 
          : '/api/submission-checklists';
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config),
        });
        
        if (!response.ok) throw new Error('Failed to save checklist');
        
        const savedConfig = await response.json();
        
        // Update local state
        setChecklists(prev => {
          const index = prev.findIndex(cl => cl.id === savedConfig.id);
          if (index >= 0) {
            return [...prev.slice(0, index), savedConfig, ...prev.slice(index + 1)];
          } else {
            return [...prev, savedConfig];
          }
        });
        
        setSelectedChecklistId(savedConfig.id);
      } else {
        // Handle updates to existing checklist
        // First update basic info
        const baseConfig = {
          id: selectedChecklistId,
          name: checklistName,
          description: checklistDescription,
          userEmail: session.user.email,
          isShared,
        };
        
        const endpoint = isShared 
          ? '/api/submission-checklists/shared' 
          : '/api/submission-checklists';
        
        const baseResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...baseConfig,
            items: [], // Empty items since we'll update them individually
            createdAt: new Date(),
          }),
        });
        
        if (!baseResponse.ok) throw new Error('Failed to save checklist base info');
        
        // Then update each item with the operation flag
        for (const item of checklistItems) {
          await fetch(`/api/submission-checklists/${selectedChecklistId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              itemId: item.id,
              name: item.name,
              requirement: item.requirement,
              documentPaths: item.documents,
              operation: 'update_config', // Specify this is a config update
            }),
          });
        }
        
        // Get the updated config
        const getResponse = await fetch(`/api/submission-checklists/${selectedChecklistId}`);
        if (getResponse.ok) {
          const updatedConfig = await getResponse.json();
          
          // Update local state
          setChecklists(prev => {
            const index = prev.findIndex(cl => cl.id === updatedConfig.id);
            if (index >= 0) {
              return [...prev.slice(0, index), updatedConfig, ...prev.slice(index + 1)];
            } else {
              return [...prev, updatedConfig];
            }
          });
        }
      }
      
      // Show success message
      alert('Checklist saved successfully!');
    } catch (err) {
      console.error('Error saving checklist:', err);
      alert('Failed to save checklist');
    }
  };
  
  // Delete checklist
  const deleteChecklist = async () => {
    if (!selectedChecklistId) return;
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this checklist?')) return;
    
    try {
      const response = await fetch(`/api/submission-checklists/${selectedChecklistId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete checklist');
      
      // Update local state
      setChecklists(prev => prev.filter(cl => cl.id !== selectedChecklistId));
      
      // Reset form
      createNewChecklist();
      
      // Show success message
      alert('Checklist deleted successfully!');
    } catch (err) {
      console.error('Error deleting checklist:', err);
      alert('Failed to delete checklist');
    }
  };
  
  // Toggle JSON editor
  const toggleJsonEditor = () => {
    if (!showJsonEditor) {
      // Prepare JSON data for editing
      const jsonData = {
        id: selectedChecklistId || uuid(),
        name: checklistName,
        description: checklistDescription,
        items: checklistItems,
        isShared,
      };
      setJsonEditorValue(JSON.stringify(jsonData, null, 2));
    }
    
    setShowJsonEditor(!showJsonEditor);
    setJsonError(null);
  };
  
  // Apply JSON changes
  const applyJsonChanges = () => {
    try {
      const parsedJson = JSON.parse(jsonEditorValue);
      
      // Validate required fields
      if (!parsedJson.name) throw new Error('Checklist name is required');
      if (!Array.isArray(parsedJson.items)) throw new Error('Items must be an array');
      
      // Apply changes
      setChecklistName(parsedJson.name);
      setChecklistDescription(parsedJson.description || '');
      setIsShared(parsedJson.isShared || false);
      
      // Ensure items have all required fields
      const validatedItems = parsedJson.items.map((item: any) => ({
        id: item.id || uuid(),
        name: item.name || 'Unnamed Item',
        requirement: item.requirement || '',
        documents: Array.isArray(item.documents) ? item.documents : [],
        status: item.status || 'not-checked',
        comments: item.comments || '',
      }));
      
      setChecklistItems(validatedItems);
      setJsonError(null);
      setShowJsonEditor(false);
    } catch (err) {
      setJsonError((err as Error).message);
    }
  };
  
  if (loading) {
    return <div className="p-6">Loading submission checklist configurations...</div>;
  }
  
  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-deep-purple">Submission Checklist Config Manager</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left sidebar - Checklist list */}
          <div className="md:col-span-1 border-r pr-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Checklists</h3>
              <button 
                onClick={createNewChecklist}
                className="bg-purple text-white py-1 px-3 rounded text-sm hover:bg-deep-purple transition-colors"
              >
                + New
              </button>
            </div>
            
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {checklists.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No checklists available.</p>
              ) : (
                checklists.map(checklist => (
                  <div 
                    key={checklist.id}
                    onClick={() => selectChecklist(checklist.id)}
                    className={`p-2 rounded cursor-pointer ${
                      selectedChecklistId === checklist.id 
                        ? 'bg-purple text-white' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-medium truncate">{checklist.name}</div>
                    <div className="text-xs truncate">
                      {checklist.isShared ? 'Shared • ' : ''}
                      {checklist.items.length} items
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Main content - Checklist editor */}
          <div className="md:col-span-2">
            {/* Editor toggle */}
            <div className="flex justify-end mb-4">
              <button 
                onClick={toggleJsonEditor}
                className="text-purple hover:text-deep-purple text-sm font-medium"
              >
                {showJsonEditor ? 'Switch to Form Editor' : 'Switch to JSON Editor'}
              </button>
            </div>
            
            {showJsonEditor ? (
              /* JSON editor */
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Edit JSON Configuration</label>
                  <textarea 
                    value={jsonEditorValue}
                    onChange={(e) => setJsonEditorValue(e.target.value)}
                    className="w-full h-[500px] border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple"
                  />
                  {jsonError && (
                    <p className="text-red-500 text-sm mt-1">{jsonError}</p>
                  )}
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button 
                    onClick={applyJsonChanges}
                    className="bg-purple text-white py-2 px-4 rounded hover:bg-deep-purple transition-colors"
                  >
                    Apply Changes
                  </button>
                </div>
              </div>
            ) : (
              /* Form editor */
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Checklist Name</label>
                  <input 
                    type="text"
                    value={checklistName}
                    onChange={(e) => setChecklistName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple"
                    placeholder="Enter checklist name"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea 
                    value={checklistDescription}
                    onChange={(e) => setChecklistDescription(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple"
                    placeholder="Enter checklist description"
                    rows={3}
                  />
                </div>
                
                <div className="mb-4 flex items-center">
                  <input 
                    type="checkbox"
                    id="isShared"
                    checked={isShared}
                    onChange={(e) => setIsShared(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="isShared" className="text-sm font-medium text-gray-700">
                    Share this checklist with all users
                  </label>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Checklist Items</label>
                    <button 
                      onClick={addChecklistItem}
                      className="bg-purple text-white py-1 px-3 rounded text-sm hover:bg-deep-purple transition-colors"
                    >
                      + Add Item
                    </button>
                  </div>
                  
                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {checklistItems.map((item, index) => (
                      <div key={item.id} className="border border-gray-200 rounded-md p-3">
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-medium">Item {index + 1}</div>
                          <button 
                            onClick={() => removeChecklistItem(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                            <input 
                              type="text"
                              value={item.name}
                              onChange={(e) => updateChecklistItem(item.id, 'name', e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple"
                              placeholder="Enter item name"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Requirement</label>
                            <textarea 
                              value={item.requirement}
                              onChange={(e) => updateChecklistItem(item.id, 'requirement', e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple"
                              placeholder="Enter requirement details"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {checklistItems.length === 0 && (
                      <p className="text-sm text-gray-500 italic">No items in this checklist. Click &quot;Add Item&quot; to add your first item.</p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <button 
                    onClick={deleteChecklist}
                    disabled={!selectedChecklistId}
                    className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Delete
                  </button>
                  
                  <button 
                    onClick={saveChecklist}
                    className="bg-purple text-white py-2 px-4 rounded hover:bg-deep-purple transition-colors"
                  >
                    Save Checklist
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 