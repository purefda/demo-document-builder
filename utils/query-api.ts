/**
 * Utility for making requests to the Query API
 */

export interface QueryAPIRequest {
  systemPrompt?: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
}

export interface QueryAPIResponse {
  id: string;
  choices: {
    message: {
      content: string;
      role: string;
    };
    index: number;
    finish_reason: string;
  }[];
  model: string;
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
  error?: string;
}

export async function queryAPI(params: QueryAPIRequest): Promise<QueryAPIResponse> {
  try {
    const response = await fetch('/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to query API');
    }

    return await response.json();
  } catch (error) {
    console.error('Error querying API:', error);
    throw error;
  }
}

/**
 * Helper function to extract the response text from the API response
 */
export function extractResponseText(response: QueryAPIResponse): string {
  if (response.error) {
    throw new Error(response.error);
  }
  
  if (!response.choices || response.choices.length === 0) {
    throw new Error('No response received from the model');
  }
  
  return response.choices[0].message.content;
} 