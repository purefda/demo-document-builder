import { NextRequest, NextResponse } from 'next/server';

// Default model as specified in the PRD
const DEFAULT_MODEL = 'google/gemini-2.0-flash-001:online';

export async function POST(request: NextRequest) {
  try {
    const { systemPrompt, userPrompt, model, maxTokens } = await request.json();

    // Validation
    if (!userPrompt) {
      return NextResponse.json(
        { error: 'User prompt is required' },
        { status: 400 }
      );
    }

    // Use default model if not specified
    const modelToUse = model || DEFAULT_MODEL;
    const tokensToUse = maxTokens || 1024; // Default max tokens

    // Prepare request to OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'Document Information Extractor and Builder'
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: userPrompt }
        ],
        max_tokens: tokensToUse,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to get response from AI model' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Extract the actual response text for easier consumption by the client
    const responseText = data.choices && 
                        data.choices[0] && 
                        data.choices[0].message && 
                        data.choices[0].message.content || '';
    
    return NextResponse.json({
      response: responseText,
      rawResponse: data // Include the raw response for debugging
    });
  } catch (error) {
    console.error('Query API error:', error);
    return NextResponse.json(
      { error: 'Failed to process the request' },
      { status: 500 }
    );
  }
} 