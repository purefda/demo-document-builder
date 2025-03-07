import { put, list, del, head } from '@vercel/blob';

export interface FieldPrompt {
  key: string;
  prompt: string;
}

export interface FieldPromptConfig {
  id: string;
  name: string;
  fields: FieldPrompt[];
  userEmail: string;
  createdAt: Date;
  updatedAt: Date;
  isShared?: boolean; // Flag to indicate shared configuration
}

// Constant for shared configurations storage path
export const SHARED_CONFIG_PATH = 'field-prompts/shared';

/**
 * Save a field-prompt configuration to Vercel Blob Storage
 */
export async function saveFieldPromptConfig(
  config: Omit<FieldPromptConfig, 'updatedAt'>, 
  userEmail: string
): Promise<FieldPromptConfig> {
  const configToSave = {
    ...config,
    userEmail,
    updatedAt: new Date()
  };

  // Determine the storage path based on whether it's shared or not
  const storagePath = configToSave.isShared 
    ? `${SHARED_CONFIG_PATH}/${configToSave.id}.json` 
    : `field-prompts/${userEmail}/${configToSave.id}.json`;

  // Store the configuration as a JSON file
  const configBlob = new Blob([JSON.stringify(configToSave)], { type: 'application/json' });
  const file = new File([configBlob], `${configToSave.id}.json`, { type: 'application/json' });
  
  await put(storagePath, file, {
    access: 'public',
    addRandomSuffix: false,
  });

  return configToSave;
}

/**
 * List all field-prompt configurations for a user, including shared ones
 */
export async function listFieldPromptConfigs(userEmail: string): Promise<FieldPromptConfig[]> {
  try {
    // Get user-specific configurations
    const { blobs: userBlobs } = await list({ prefix: `field-prompts/${userEmail}/` });
    
    // Get shared configurations
    const { blobs: sharedBlobs } = await list({ prefix: `${SHARED_CONFIG_PATH}/` });
    
    const allBlobs = [...userBlobs, ...sharedBlobs];
    
    if (!allBlobs.length) {
      return [];
    }

    const configs: FieldPromptConfig[] = [];
    
    for (const blob of allBlobs) {
      try {
        const response = await fetch(blob.url);
        if (!response.ok) continue;
        
        const config = await response.json();
        configs.push(config);
      } catch (error) {
        console.error(`Error fetching config ${blob.url}:`, error);
      }
    }
    
    return configs;
  } catch (error) {
    console.error('Error listing field-prompt configs:', error);
    return [];
  }
}

/**
 * Get a specific field-prompt configuration by ID
 */
export async function getFieldPromptConfig(configId: string, userEmail: string): Promise<FieldPromptConfig | null> {
  try {
    // Try to get user-specific config first
    let { blobs } = await list({ prefix: `field-prompts/${userEmail}/${configId}.json` });
    
    // If not found, try shared configs
    if (!blobs.length) {
      blobs = (await list({ prefix: `${SHARED_CONFIG_PATH}/${configId}.json` })).blobs;
    }
    
    if (!blobs.length) {
      return null;
    }
    
    const response = await fetch(blobs[0].url);
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error getting field-prompt config ${configId}:`, error);
    return null;
  }
}

/**
 * Delete a field-prompt configuration
 */
export async function deleteFieldPromptConfig(configId: string, userEmail: string): Promise<boolean> {
  try {
    // Try to find the config in user-specific storage
    let { blobs } = await list({ prefix: `field-prompts/${userEmail}/${configId}.json` });
    
    // If not found there, try shared storage (only admins should be able to delete shared configs)
    if (!blobs.length) {
      blobs = (await list({ prefix: `${SHARED_CONFIG_PATH}/${configId}.json` })).blobs;
    }
    
    if (!blobs.length) {
      return false;
    }
    
    await del(blobs[0].url);
    return true;
  } catch (error) {
    console.error(`Error deleting field-prompt config ${configId}:`, error);
    return false;
  }
}

/**
 * List all shared field-prompt configurations
 */
export async function listSharedFieldPromptConfigs(): Promise<FieldPromptConfig[]> {
  try {
    // Get shared configurations
    const { blobs: sharedBlobs } = await list({ prefix: `${SHARED_CONFIG_PATH}/` });
    
    if (!sharedBlobs.length) {
      return [];
    }

    const configs: FieldPromptConfig[] = [];
    
    for (const blob of sharedBlobs) {
      try {
        const response = await fetch(blob.url);
        if (!response.ok) continue;
        
        const config = await response.json();
        configs.push(config);
      } catch (error) {
        console.error(`Error fetching shared config ${blob.url}:`, error);
      }
    }
    
    return configs;
  } catch (error) {
    console.error('Error listing shared field-prompt configs:', error);
    return [];
  }
} 