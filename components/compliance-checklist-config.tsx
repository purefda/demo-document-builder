"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Define types for the compliance checklist config
interface ChecklistItem {
  serial: string;
  requirement: string;
  appliedStandards: string;
  complyingDocuments: string;
  criteria: string;
  introSummary?: string;
}

interface ChecklistConfig {
  id?: string;
  name: string;
  config: {
    items: ChecklistItem[];
  };
  isShared: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: string;
}

export default function ComplianceChecklistConfig() {
  const { data: session } = useSession();
  const [configs, setConfigs] = useState<ChecklistConfig[]>([]);
  const [sharedConfigs, setSharedConfigs] = useState<ChecklistConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<ChecklistConfig | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isNewConfig, setIsNewConfig] = useState<boolean>(false);
  const [isJsonMode, setIsJsonMode] = useState<boolean>(false);
  const [jsonString, setJsonString] = useState<string>('');
  const [jsonError, setJsonError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [exampleConfig, setExampleConfig] = useState<ChecklistConfig>({
    name: 'GSPR Compliance Matrix',
    config: {
      items: [
        {
          serial: '1',
          requirement: 'Devices shall achieve the performance intended by their manufacturer and shall be designed and manufactured in such a way that, during normal conditions of use, they are suitable for their intended purpose. They shall be safe and effective and shall not compromise the clinical condition or the safety of patients, or the safety and health of users or, where applicable, other persons, provided that any risks which may be associated with their use constitute acceptable risks when weighed against the benefits to the patient and are compatible with a high level of protection of health and safety, taking into account the generally acknowledged state of the art.',
          appliedStandards: 'EN ISO 13485:2016/A11:2021 EN ISO 14971:2019/A11:2021 EN 13641: 2002',
          complyingDocuments: 'ISO 13485 Certificate Quality Manual, Design & Development File/Design History File Medical Device File/Device Master Record Risk Management Report Performance Evaluation Report',
          criteria: 'Device achieves intended performance and is suitable for its intended purpose during normal conditions of use based on manufacturer\'s specifications.',
          introSummary: 'Devices must consistently meet their intended performance, ensuring safety, effectiveness, and acceptable risk/benefit profiles under normal usage conditions while adhering to state of the art practices.'
        },
        {
          serial: '2',
          requirement: 'The requirement in this Annex to reduce risks as far as possible means the reduction of risks as far as possible without adversely affecting the benefit-risk ratio.',
          appliedStandards: 'EN ISO 14971:2019/A11:2021',
          complyingDocuments: 'Risk Management Report',
          criteria: 'Implement a documented risk management process to systematically identify, analyze, evaluate, and control risks associated with the IVD, consistent with state-of-the-art.',
          introSummary: 'Risk reduction efforts must be balanced against the intended benefits of the IVD device, ensuring the benefit-risk ratio remains favorable.'
        }
      ]
    },
    isShared: false
  });

  // Fetch configs on load
  useEffect(() => {
    if (!session?.user) return;

    const fetchConfigs = async () => {
      setLoading(true);
      try {
        // Fetch personal configs
        const personalResponse = await fetch('/api/compliance-checklists');
        if (personalResponse.ok) {
          const personalData = await personalResponse.json();
          setConfigs(personalData.checklists || []);
        }

        // Fetch shared configs
        const sharedResponse = await fetch('/api/compliance-checklists?shared=true');
        if (sharedResponse.ok) {
          const sharedData = await sharedResponse.json();
          setSharedConfigs(sharedData.checklists || []);
        }
      } catch (error) {
        console.error('Error fetching configs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfigs();
  }, [session]);

  // Update JSON string when selected config changes
  useEffect(() => {
    if (selectedConfig) {
      setJsonString(JSON.stringify(selectedConfig.config, null, 2));
    } else {
      setJsonString('');
    }
  }, [selectedConfig]);

  // Handle config selection
  const handleSelectConfig = async (configId: string, isShared: boolean = false) => {
    setIsEditing(false);
    setIsNewConfig(false);
    setJsonError('');
    
    try {
      const response = await fetch(`/api/compliance-checklists/${configId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedConfig(data.checklist);
        setJsonString(JSON.stringify(data.checklist.config, null, 2));
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  // Create new config
  const handleNewConfig = () => {
    setSelectedConfig(exampleConfig);
    setIsEditing(true);
    setIsNewConfig(true);
    setJsonString(JSON.stringify(exampleConfig.config, null, 2));
    setJsonError('');
  };

  // Delete config
  const handleDeleteConfig = async () => {
    if (!selectedConfig?.id || !confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/compliance-checklists/${selectedConfig.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update the configs list
        setConfigs(configs.filter(config => config.id !== selectedConfig.id));
        setSelectedConfig(null);
      } else {
        alert('Failed to delete configuration');
      }
    } catch (error) {
      console.error('Error deleting config:', error);
      alert('An error occurred while deleting the configuration');
    }
  };

  // Save config
  const handleSaveConfig = async () => {
    if (!selectedConfig?.name) {
      alert('Please provide a name for the configuration');
      return;
    }

    let configToSave: ChecklistConfig;

    if (isJsonMode) {
      try {
        const parsedJson = JSON.parse(jsonString);
        configToSave = {
          ...selectedConfig,
          config: parsedJson
        };
      } catch (error) {
        setJsonError('Invalid JSON format');
        return;
      }
    } else {
      configToSave = selectedConfig;
    }

    try {
      let response;
      
      if (isNewConfig) {
        // Create new config
        response = await fetch('/api/compliance-checklists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: configToSave.name,
            config: configToSave.config,
            isShared: configToSave.isShared
          }),
        });
      } else {
        // Update existing config
        response = await fetch(`/api/compliance-checklists/${configToSave.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: configToSave.name,
            config: configToSave.config,
            isShared: configToSave.isShared
          }),
        });
      }

      if (response.ok) {
        const data = await response.json();
        
        // Update local state
        if (isNewConfig) {
          setConfigs([...configs, data.checklist]);
        } else {
          setConfigs(configs.map(c => c.id === data.checklist.id ? data.checklist : c));
        }
        
        setSelectedConfig(data.checklist);
        setIsEditing(false);
        setIsNewConfig(false);
        alert('Configuration saved successfully');
      } else {
        alert('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('An error occurred while saving the configuration');
    }
  };

  // Add new checklist item
  const handleAddItem = () => {
    if (!selectedConfig) return;
    
    const newItem: ChecklistItem = {
      serial: `${selectedConfig.config.items.length + 1}`,
      requirement: '',
      appliedStandards: '',
      complyingDocuments: '',
      criteria: '',
      introSummary: ''
    };
    
    const updatedConfig = {
      ...selectedConfig,
      config: {
        ...selectedConfig.config,
        items: [...selectedConfig.config.items, newItem]
      }
    };
    
    setSelectedConfig(updatedConfig);
  };

  // Update checklist item
  const handleUpdateItem = (index: number, field: keyof ChecklistItem, value: string) => {
    if (!selectedConfig) return;
    
    const updatedItems = [...selectedConfig.config.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    const updatedConfig = {
      ...selectedConfig,
      config: {
        ...selectedConfig.config,
        items: updatedItems
      }
    };
    
    setSelectedConfig(updatedConfig);
  };

  // Delete checklist item
  const handleDeleteItem = (index: number) => {
    if (!selectedConfig) return;
    
    const updatedItems = selectedConfig.config.items.filter((_, i) => i !== index);
    // Renumber the serials
    const renumberedItems = updatedItems.map((item, i) => ({
      ...item,
      serial: `${i + 1}`
    }));
    
    const updatedConfig = {
      ...selectedConfig,
      config: {
        ...selectedConfig.config,
        items: renumberedItems
      }
    };
    
    setSelectedConfig(updatedConfig);
  };

  // Handle JSON edit
  const handleJsonEdit = (value: string) => {
    setJsonString(value);
    setJsonError('');
    
    try {
      const parsedJson = JSON.parse(value);
      // This won't execute if JSON is invalid
    } catch (error) {
      setJsonError('Invalid JSON format (changes will not be applied until fixed)');
    }
  };

  // Apply JSON changes to the selected config
  const handleApplyJsonChanges = () => {
    try {
      const parsedJson = JSON.parse(jsonString);
      setSelectedConfig({
        ...selectedConfig!,
        config: parsedJson
      });
      setJsonError('');
    } catch (error) {
      setJsonError('Invalid JSON format');
    }
  };

  // Toggle between JSON and form view
  const handleToggleJsonMode = () => {
    if (isJsonMode && jsonError) {
      if (!confirm('There are JSON errors. Switching to form view will lose your changes. Continue?')) {
        return;
      }
    }
    setIsJsonMode(!isJsonMode);
    setJsonError('');
  };

  return (
    <div className="container p-4 mx-auto">
      <h1 className="mb-6 text-2xl font-bold text-[#2f59cf]">Compliance Checklist Configuration Manager</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Configs List */}
        <div className="md:col-span-1">
          <div className="p-4 border rounded-lg shadow-sm bg-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-[#00185c]">My Configurations</h2>
              <button
                onClick={handleNewConfig}
                className="px-3 py-1 bg-[#2f59cf] text-white rounded-md hover:bg-[#00185c]"
              >
                New
              </button>
            </div>
            
            {loading ? (
              <p className="text-gray-500">Loading configurations...</p>
            ) : (
              <>
                {configs.length > 0 ? (
                  <ul className="mb-4 space-y-2 max-h-60 overflow-y-auto">
                    {configs.map(config => (
                      <li 
                        key={config.id} 
                        className={`p-2 hover:bg-[#f6f8fd] cursor-pointer rounded-md flex justify-between items-center ${selectedConfig?.id === config.id ? 'bg-[#f6f8fd]' : ''}`}
                        onClick={() => handleSelectConfig(config.id!)}
                      >
                        <span className="flex-1">{config.name}</span>
                        {config.isShared && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                            Shared
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 mb-4">No personal configurations found</p>
                )}
                
                <h3 className="text-lg font-semibold mb-2 text-[#00185c]">Shared Configurations</h3>
                {sharedConfigs.length > 0 ? (
                  <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {sharedConfigs.map(config => (
                      <li 
                        key={config.id} 
                        className={`p-2 hover:bg-[#f6f8fd] cursor-pointer rounded-md ${selectedConfig?.id === config.id ? 'bg-[#f6f8fd]' : ''}`}
                        onClick={() => handleSelectConfig(config.id!, true)}
                      >
                        {config.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No shared configurations found</p>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Config Editor */}
        <div className="md:col-span-2">
          {selectedConfig ? (
            <div className="p-4 border rounded-lg shadow-sm bg-white">
              <div className="flex justify-between items-center mb-4">
                <div className="flex-1">
                  {isEditing ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={selectedConfig.name}
                        onChange={(e) => setSelectedConfig({...selectedConfig, name: e.target.value})}
                        className="w-full p-2 border rounded-md"
                        placeholder="Configuration Name"
                      />
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="isShared"
                          checked={selectedConfig.isShared}
                          onChange={(e) => setSelectedConfig({...selectedConfig, isShared: e.target.checked})}
                          className="mr-2"
                        />
                        <label htmlFor="isShared">Shared</label>
                      </div>
                    </div>
                  ) : (
                    <h2 className="text-xl font-semibold text-[#00185c]">{selectedConfig.name}</h2>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={handleToggleJsonMode}
                    className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    {isJsonMode ? 'Form View' : 'JSON View'}
                  </button>
                  
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveConfig}
                        className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setIsNewConfig(false);
                          if (selectedConfig.id) {
                            handleSelectConfig(selectedConfig.id);
                          } else {
                            setSelectedConfig(null);
                          }
                        }}
                        className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1 bg-[#2f59cf] text-white rounded-md hover:bg-[#00185c]"
                      >
                        Edit
                      </button>
                      {!isNewConfig && selectedConfig.id && (
                        <button
                          onClick={handleDeleteConfig}
                          className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {selectedConfig.version && (
                <div className="mb-4 text-sm text-gray-500">
                  Version: {selectedConfig.version}
                </div>
              )}
              
              {isJsonMode ? (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-[#00185c]">JSON Editor</h3>
                    {isEditing && (
                      <button
                        onClick={handleApplyJsonChanges}
                        disabled={!!jsonError}
                        className={`px-3 py-1 text-white rounded-md ${jsonError ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#2f59cf] hover:bg-[#00185c]'}`}
                      >
                        Apply Changes
                      </button>
                    )}
                  </div>
                  
                  {jsonError && (
                    <div className="p-2 mb-2 text-red-700 bg-red-100 rounded-md">
                      {jsonError}
                    </div>
                  )}
                  
                  <textarea
                    value={jsonString}
                    onChange={(e) => handleJsonEdit(e.target.value)}
                    disabled={!isEditing}
                    className="w-full h-96 p-2 font-mono text-sm border rounded-md"
                  />
                </div>
              ) : (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-[#00185c]">Checklist Items</h3>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-3 py-1 text-white bg-[#2f59cf] rounded-md hover:bg-[#00185c]"
                      >
                        Add Item
                      </button>
                    )}
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#f6f8fd] text-[#00185c]">
                          <th className="p-3 text-left border">Serial</th>
                          <th className="p-3 text-left border">General Requirement</th>
                          <th className="p-3 text-left border">Applied Standards</th>
                          <th className="p-3 text-left border">Complying Documents</th>
                          <th className="p-3 text-left border">Compliance Criteria</th>
                          <th className="p-3 text-left border">Introductory Summary</th>
                          {isEditing && <th className="p-3 text-center border w-20">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedConfig.config.items.map((item, index) => (
                          <tr key={index} className="border-t hover:bg-[#f6f8fd]">
                            <td className="p-3 border align-top">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={item.serial}
                                  onChange={(e) => handleUpdateItem(index, 'serial', e.target.value)}
                                  className="w-full p-1 border border-gray-300 rounded"
                                />
                              ) : (
                                item.serial
                              )}
                            </td>
                            <td className="p-3 border align-top">
                              {isEditing ? (
                                <textarea
                                  value={item.requirement}
                                  onChange={(e) => handleUpdateItem(index, 'requirement', e.target.value)}
                                  className="w-full p-1 border border-gray-300 rounded"
                                  rows={4}
                                />
                              ) : (
                                <div className="whitespace-pre-line">{item.requirement}</div>
                              )}
                            </td>
                            <td className="p-3 border align-top">
                              {isEditing ? (
                                <textarea
                                  value={item.appliedStandards}
                                  onChange={(e) => handleUpdateItem(index, 'appliedStandards', e.target.value)}
                                  className="w-full p-1 border border-gray-300 rounded"
                                  rows={4}
                                />
                              ) : (
                                <div className="whitespace-pre-line">{item.appliedStandards}</div>
                              )}
                            </td>
                            <td className="p-3 border align-top">
                              {isEditing ? (
                                <textarea
                                  value={item.complyingDocuments}
                                  onChange={(e) => handleUpdateItem(index, 'complyingDocuments', e.target.value)}
                                  className="w-full p-1 border border-gray-300 rounded"
                                  rows={4}
                                />
                              ) : (
                                <div className="whitespace-pre-line">{item.complyingDocuments}</div>
                              )}
                            </td>
                            <td className="p-3 border align-top">
                              {isEditing ? (
                                <textarea
                                  value={item.criteria}
                                  onChange={(e) => handleUpdateItem(index, 'criteria', e.target.value)}
                                  className="w-full p-1 border border-gray-300 rounded"
                                  rows={4}
                                />
                              ) : (
                                <div className="whitespace-pre-line">{item.criteria}</div>
                              )}
                            </td>
                            <td className="p-3 border align-top">
                              {isEditing ? (
                                <textarea
                                  value={item.introSummary || ''}
                                  onChange={(e) => handleUpdateItem(index, 'introSummary', e.target.value)}
                                  className="w-full p-1 border border-gray-300 rounded"
                                  rows={4}
                                />
                              ) : (
                                <div className="whitespace-pre-line">{item.introSummary}</div>
                              )}
                            </td>
                            {isEditing && (
                              <td className="p-3 border text-center align-top">
                                <button
                                  onClick={() => handleDeleteItem(index)}
                                  className="p-1 text-red-600 hover:text-red-800 focus:outline-none"
                                  title="Delete Item"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 border rounded-lg shadow-sm bg-white">
              <p className="text-gray-500">Select a configuration to view or edit, or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 