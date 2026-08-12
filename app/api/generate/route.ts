import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generatePagePrompt } from '@/lib/prompts';
import { optimizePrompt } from '@/lib/prompt-optimizer';
import { parseAIResponse } from '@/lib/file-parser';
import { withRetry, hasApiKey } from '@/lib/gemini-client';

export async function POST(request: NextRequest) {
    try {
        const { prompt } = await request.json();

        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json(
                { error: 'Prompt is required' },
                { status: 400 }
            );
        }

        if (!hasApiKey()) {
            console.error('No Gemini API keys found in environment variables');
            return NextResponse.json(
                { error: 'GEMINI_API_KEY not configured. Please add it to .env.local and restart the server' },
                { status: 500 }
            );
        }

        // Optimize prompt to reduce token usage
        const optimizedPrompt = optimizePrompt(prompt);

        // Generate the full prompt with system instructions
        const fullPrompt = generatePagePrompt(optimizedPrompt);

        // Create a streaming response using withRetry for key rotation
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    await withRetry(
                        {
                            model: 'gemini-2.5-flash',
                            generationConfig: {
                                temperature: 0.7,
                                topP: 0.95,
                                topK: 40,
                                maxOutputTokens: 8192,
                            },
                        },
                        async (model) => {
                            // Generate content with streaming
                            const result = await model.generateContentStream(fullPrompt);

                            let fullResponse = '';

                            // Stream the response
                            for await (const chunk of result.stream) {
                                const text = chunk.text();
                                fullResponse += text;

                                // Send chunk to client
                                controller.enqueue(
                                    encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`)
                                );
                            }

                            // Extract and validate files with structure
                            const { files, structure, database } = parseAIResponse(fullResponse);

                            // Send final files with structure
                            controller.enqueue(
                                encoder.encode(
                                    `data: ${JSON.stringify({
                                        done: true,
                                        files,
                                        structure,
                                        database,
                                        fullResponse
                                    })}\n\n`
                                )
                            );

                            controller.close();
                        }
                    );
                } catch (error) {
                    console.error('Streaming error:', error);
                    controller.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({
                                error: error instanceof Error ? error.message : 'Generation failed'
                            })}\n\n`
                        )
                    );
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
