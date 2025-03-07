"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { TrashIcon, LoaderIcon, PencilEditIcon, InfoIcon, CheckedSquare } from "./icons";
import { FieldPrompt } from "@/utils/field-prompt-service";

interface Config {
  id: string;
  name: string;
  fields: FieldPrompt[];
  createdAt?: Date;
  updatedAt?: Date;
  isShared?: boolean;
  userEmail?: string;
}

export function FieldPromptManager() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [currentConfig, setCurrentConfig] = useState<Config | null>(null);
  const [configName, setConfigName] = useState<string>("");
  const [isJsonView, setIsJsonView] = useState<boolean>(false);
  const [jsonConfig, setJsonConfig] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isShared, setIsShared] = useState<boolean>(false);

  // Default fields when creating a new configuration
  const DEFAULT_FIELDS = useMemo<FieldPrompt[]>(() => [
    { key: "MANUFACTURER_NAME", prompt: "Provide the manufacturer name" },
    { key: "DEVICE_NAME", prompt: "Provide the full name of the medical device" },
    { key: "MODEL_NUMBER", prompt: "Extract the model number of the device" },
    { key: "INDICATION_FOR_USE", prompt: "Write the indication for use for this device" },
    { key: "CONTRAINDICATIONS", prompt: "List all contraindications for this device" },
  ], []);

  const fetchConfigs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/field-prompts');
      
      if (!response.ok) {
        if (response.status === 401) {
          setError("You must be signed in to view field-prompt configurations");
        } else {
          throw new Error(`Failed to fetch configurations: ${response.status}`);
        }
        return;
      }
      
      const parsedConfigs = await response.json();
      setConfigs(parsedConfigs);
      
      if (parsedConfigs.length > 0) {
        setCurrentConfig(parsedConfigs[0]);
        setConfigName(parsedConfigs[0].name);
        setIsShared(!!parsedConfigs[0].isShared);
      } else {
        // Initialize with a default config if none exists
        // Instead of calling handleCreateNewConfig, create a new config directly
        const newConfig: Config = {
          id: `config-${Date.now()}`,
          name: "New Configuration",
          fields: [...DEFAULT_FIELDS],
          isShared: false,
        };
        setCurrentConfig(newConfig);
        setConfigName(newConfig.name);
        setIsEditing(true);
      }
    } catch (err) {
      console.error("Error fetching configs:", err);
      setError("Failed to load configurations. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [DEFAULT_FIELDS]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  useEffect(() => {
    if (currentConfig) {
      setJsonConfig(JSON.stringify(currentConfig.fields, null, 2));
      setIsShared(!!currentConfig.isShared);
    }
  }, [currentConfig, isJsonView]);

  const handleConfigChange = (configId: string) => {
    const selected = configs.find(config => config.id === configId);
    if (selected) {
      setCurrentConfig(selected);
      setConfigName(selected.name);
      setIsShared(!!selected.isShared);
    }
  };

  const handleCreateNewConfig = () => {
    const newConfig: Config = {
      id: `config-${Date.now()}`,
      name: "New Configuration",
      fields: [...DEFAULT_FIELDS],
      isShared: false,
    };
    setCurrentConfig(newConfig);
    setConfigName(newConfig.name);
    setIsShared(false);
    setIsEditing(true);
  };

  const handleSaveConfig = async () => {
    if (!currentConfig) return;
    
    setIsSaving(true);
    setError(null);
    try {
      // Prepare the config with latest data
      const configToSave = {
        ...currentConfig,
        name: configName,
        isShared: isShared,
        fields: isJsonView ? JSON.parse(jsonConfig) : currentConfig.fields
      };
      
      // API call to save the config
      const response = await fetch('/api/field-prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configToSave),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save configuration: ${response.status}`);
      }
      
      const savedConfig = await response.json();
      
      // Update state with the saved config
      setConfigs(prev => {
        const existingIndex = prev.findIndex(c => c.id === savedConfig.id);
        if (existingIndex >= 0) {
          // Update existing config
          return prev.map(c => c.id === savedConfig.id ? savedConfig : c);
        } else {
          // Add new config
          return [...prev, savedConfig];
        }
      });
      
      setCurrentConfig(savedConfig);
      setIsEditing(false);
      alert("Configuration saved successfully!");
    } catch (err) {
      console.error("Error saving config:", err);
      setError("Failed to save configuration. Please try again later.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    if (configs.length <= 1) {
      setError("Cannot delete the only configuration");
      return;
    }
    
    if (confirm("Are you sure you want to delete this configuration?")) {
      setIsDeleting(true);
      setError(null);
      try {
        const response = await fetch(`/api/field-prompts/${configId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete configuration: ${response.status}`);
        }
        
        // Update state after successful deletion
        const updatedConfigs = configs.filter(config => config.id !== configId);
        setConfigs(updatedConfigs);
        
        // Select another config if the current one was deleted
        if (currentConfig?.id === configId) {
          if (updatedConfigs.length > 0) {
            setCurrentConfig(updatedConfigs[0]);
            setConfigName(updatedConfigs[0].name);
          } else {
            setCurrentConfig(null);
            setConfigName("");
          }
        }
        
      } catch (err) {
        console.error("Error deleting config:", err);
        setError("Failed to delete configuration. Please try again later.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleAddField = () => {
    if (!currentConfig) return;
    
    const newField: FieldPrompt = { key: "", prompt: "" };
    setCurrentConfig({
      ...currentConfig,
      fields: [...currentConfig.fields, newField]
    });
  };

  const handleUpdateField = (index: number, property: 'key' | 'prompt', value: string) => {
    if (!currentConfig) return;
    
    const updatedFields = [...currentConfig.fields];
    updatedFields[index] = {
      ...updatedFields[index],
      [property]: value
    };
    
    setCurrentConfig({
      ...currentConfig,
      fields: updatedFields
    });
  };

  const handleDeleteField = (index: number) => {
    if (!currentConfig) return;
    
    const updatedFields = currentConfig.fields.filter((_, i) => i !== index);
    setCurrentConfig({
      ...currentConfig,
      fields: updatedFields
    });
  };

  const handleJsonChange = (json: string) => {
    setJsonConfig(json);
    try {
      // Validate JSON format
      JSON.parse(json);
      setError(null);
    } catch (err) {
      setError("Invalid JSON format");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoaderIcon size={24} />
        <span className="ml-2">Loading configurations...</span>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-deep-purple">Field-Prompt Manager</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsJsonView(!isJsonView)}
            className="px-4 py-2 text-sm font-medium text-white bg-purple rounded-md hover:bg-opacity-90 transition"
          >
            {isJsonView ? "Switch to Normal View" : "Switch to JSON View"}
          </button>
          <button
            onClick={handleCreateNewConfig}
            className="px-4 py-2 text-sm font-medium text-white bg-purple rounded-md hover:bg-opacity-90 transition"
          >
            Create New
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 text-sm text-red-800 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-1">
          <h2 className="text-lg font-medium mb-3 text-deep-purple">Configurations</h2>
          <div className="border rounded-md overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {configs.map(config => (
                <li 
                  key={config.id} 
                  className={`flex items-center justify-between p-3 cursor-pointer hover:bg-light-white ${
                    currentConfig?.id === config.id ? 'bg-light-white' : ''
                  }`}
                  onClick={() => handleConfigChange(config.id)}
                >
                  <div>
                    <div className="font-medium">{config.name}</div>
                    <div className="text-xs text-gray-500">
                      {config.fields?.length || 0} fields
                      {config.isShared && 
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Shared
                        </span>
                      }
                    </div>
                    {config.userEmail && 
                      <div className="text-xs text-gray-500">
                        Created by: {config.userEmail}
                      </div>
                    }
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConfig(config.id);
                    }}
                    className="p-1 text-gray-500 hover:text-red-500"
                    disabled={isDeleting}
                  >
                    {isDeleting ? <LoaderIcon size={16} /> : <TrashIcon size={16} />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-span-3">
          {currentConfig ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-1 mr-4">
                  <input
                    type="text"
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Configuration Name"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center mr-4">
                    <input
                      type="checkbox"
                      id="shared-checkbox"
                      checked={isShared}
                      onChange={(e) => setIsShared(e.target.checked)}
                      disabled={!isEditing}
                      className="mr-2 h-4 w-4 text-purple focus:ring-purple rounded"
                    />
                    <label htmlFor="shared-checkbox" className="text-sm text-gray-700">
                      Make available to all users
                    </label>
                  </div>
                  
                  {isEditing ? (
                    <button
                      onClick={handleSaveConfig}
                      className="px-4 py-2 text-sm font-medium text-white bg-purple rounded-md hover:bg-opacity-90 transition flex items-center"
                      disabled={isSaving}
                    >
                      {isSaving && <LoaderIcon size={16} />}
                      <span className="ml-2">Save Configuration</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 text-sm font-medium text-white bg-purple rounded-md hover:bg-opacity-90 transition"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {isJsonView ? (
                <div className="border rounded-md">
                  <textarea
                    value={jsonConfig}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    disabled={!isEditing}
                    className="w-full h-96 p-4 font-mono text-sm"
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Field-Prompt Pairs</h3>
                    <button
                      onClick={handleAddField}
                      className="px-4 py-2 text-sm font-medium text-white bg-purple rounded-md hover:bg-opacity-90 transition"
                    >
                      Add Field
                    </button>
                  </div>
                  
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field Key</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prompt</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentConfig.fields.map((field, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={field.key}
                                onChange={(e) => handleUpdateField(index, 'key', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple focus:border-transparent"
                                placeholder="Field Key"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <textarea
                                value={field.prompt}
                                onChange={(e) => handleUpdateField(index, 'prompt', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple focus:border-transparent"
                                placeholder="Prompt"
                                rows={2}
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleDeleteField(index)}
                                className="text-red-600 hover:text-red-800 p-1"
                              >
                                <TrashIcon size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No configuration selected. Please select or create a new configuration.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 