import { put, list, del } from '@vercel/blob';
import { ComplianceChecklist } from '@/schema';

/**
 * Service for managing compliance checklist configurations in Vercel Blob storage
 */
export class ComplianceChecklistService {
  /**
   * Saves a compliance checklist configuration to Vercel Blob storage
   * @param config The configuration to save
   * @param userEmail The email of the user
   * @param isShared Whether the configuration should be shared
   * @returns The saved configuration with its ID
   */
  static async saveConfig(
    config: Omit<ComplianceChecklist, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    userEmail: string,
    isShared: boolean = false
  ): Promise<ComplianceChecklist> {
    try {
      const configId = crypto.randomUUID();
      const configToSave = {
        ...config,
        id: configId,
        createdBy: userEmail,
        createdAt: new Date(),
        updatedAt: new Date(),
        isShared
      };

      const path = isShared 
        ? `compliance-checklists/shared/${configId}.json`
        : `compliance-checklists/${userEmail}/${configId}.json`;

      await put(path, JSON.stringify(configToSave), {
        access: 'public',
        addRandomSuffix: false,
      });

      return configToSave as ComplianceChecklist;
    } catch (error) {
      console.error('Error saving compliance checklist:', error);
      throw new Error('Failed to save compliance checklist');
    }
  }

  /**
   * Gets a list of compliance checklist configurations
   * @param userEmail The email of the user
   * @param isShared Whether to fetch shared configurations
   * @returns A list of configurations
   */
  static async listConfigs(
    userEmail: string,
    isShared: boolean = false
  ): Promise<ComplianceChecklist[]> {
    try {
      const prefix = isShared 
        ? 'compliance-checklists/shared'
        : `compliance-checklists/${userEmail}`;

      const { blobs } = await list({ prefix });
      
      const configs: ComplianceChecklist[] = [];
      
      for (const blob of blobs) {
        const response = await fetch(blob.url);
        if (response.ok) {
          const config = await response.json();
          configs.push(config);
        }
      }
      
      return configs;
    } catch (error) {
      console.error('Error listing compliance checklists:', error);
      throw new Error('Failed to list compliance checklists');
    }
  }

  /**
   * Gets a specific compliance checklist configuration
   * @param configId The ID of the configuration to get
   * @param userEmail The email of the user
   * @param isShared Whether the configuration is shared
   * @returns The requested configuration
   */
  static async getConfig(
    configId: string,
    userEmail: string,
    isShared: boolean = false
  ): Promise<ComplianceChecklist | null> {
    try {
      const path = isShared 
        ? `compliance-checklists/shared/${configId}.json`
        : `compliance-checklists/${userEmail}/${configId}.json`;

      const { blobs } = await list({ prefix: path });
      
      if (blobs.length === 0) {
        if (isShared) {
          // Try to find in the user's private configs
          return this.getConfig(configId, userEmail, false);
        }
        return null;
      }
      
      const response = await fetch(blobs[0].url);
      if (response.ok) {
        const config = await response.json();
        return config as ComplianceChecklist;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting compliance checklist:', error);
      throw new Error('Failed to get compliance checklist');
    }
  }

  /**
   * Deletes a compliance checklist configuration
   * @param configId The ID of the configuration to delete
   * @param userEmail The email of the user
   * @param isShared Whether the configuration is shared
   * @returns Whether the deletion was successful
   */
  static async deleteConfig(
    configId: string,
    userEmail: string,
    isShared: boolean = false
  ): Promise<boolean> {
    try {
      const path = isShared 
        ? `compliance-checklists/shared/${configId}.json`
        : `compliance-checklists/${userEmail}/${configId}.json`;

      const { blobs } = await list({ prefix: path });
      
      if (blobs.length === 0) {
        return false;
      }
      
      await del(blobs[0].url);
      return true;
    } catch (error) {
      console.error('Error deleting compliance checklist:', error);
      throw new Error('Failed to delete compliance checklist');
    }
  }

  /**
   * Updates a compliance checklist configuration
   * @param config The configuration to update
   * @param userEmail The email of the user
   * @param isShared Whether the configuration is shared
   * @returns The updated configuration
   */
  static async updateConfig(
    config: ComplianceChecklist,
    userEmail: string,
    isShared: boolean = false
  ): Promise<ComplianceChecklist> {
    try {
      const configId = config.id;
      
      // Check if config exists
      const existingConfig = await this.getConfig(configId, userEmail, isShared);
      if (!existingConfig) {
        throw new Error('Configuration not found');
      }
      
      // Update the config
      const updatedConfig = {
        ...config,
        updatedAt: new Date(),
        isShared
      };
      
      const path = isShared 
        ? `compliance-checklists/shared/${configId}.json`
        : `compliance-checklists/${userEmail}/${configId}.json`;

      await put(path, JSON.stringify(updatedConfig), {
        access: 'public',
        addRandomSuffix: false,
      });

      return updatedConfig as ComplianceChecklist;
    } catch (error) {
      console.error('Error updating compliance checklist:', error);
      throw new Error('Failed to update compliance checklist');
    }
  }
} 