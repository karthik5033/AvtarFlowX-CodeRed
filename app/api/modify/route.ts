import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateCustomizationPrompt, generateModificationPrompt } from '@/lib/prompts';
import { parseAIResponse } from '@/lib/file-parser';
import { FileData } from '@/types/ai-builder';
import { withRetry, hasApiKey } from '@/lib/gemini-client';

export async function POST(request: NextRequest) {
    try {
        const { code, files, modification, customizations } = await request.json();

        console.log('[Modify API] Request received:', {
            hasCode: !!code,
            hasFiles: !!files,
            filesCount: files?.length || 0,
            hasModification: !!modification,
            hasCustomizations: !!customizations,
        });

        // Support both old (code) and new (files) format
        let existingCode = code;
        let existingFiles: FileData[] | undefined = files;

        if (!existingCode && !existingFiles) {
            return NextResponse.json(
                { error: 'Code or files are required' },
                { status: 400 }
            );
        }

        // If files provided, combine them for modification
        if (existingFiles) {
            existingCode = existingFiles.map(f =>
                `\`\`\`${f.type}:${f.name}\n${f.content}\n\`\`\``
            ).join('\n\n');
        }

        if (!hasApiKey()) {
            return NextResponse.json(
                { error: 'GEMINI_API_KEY not configured' },
                { status: 500 }
            );
        }

        // Generate prompt based on type of modification
        let prompt: string;
        if (customizations) {
            console.log('[Modify API] Generating customization prompt');
            prompt = generateCustomizationPrompt(existingCode, customizations);
        } else if (modification) {
            console.log('[Modify API] Generating modification prompt for:', modification);
            prompt = generateModificationPrompt(existingCode, modification);
        } else {
            return NextResponse.json(
                { error: 'Either modification or customizations is required' },
                { status: 400 }
            );
        }

        console.log('[Modify API] Calling Gemini API with key rotation...');

        const response = await withRetry(
            {
                model: 'gemini-2.0-flash-exp',
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 8192,
                },
            },
            async (model) => {
                // Generate modified code
                const result = await model.generateContent(prompt);
                console.log('[Modify API] Gemini API response received');
                return result.response.text();
            }
        );

        // Extract files from response
        const { files: modifiedFiles } = parseAIResponse(response);
        console.log('[Modify API] Parsed', modifiedFiles.length, 'files from AI response');

        return NextResponse.json({
            files: modifiedFiles,
            original: existingFiles || [{ name: 'index.html', content: code, type: 'html' as const }],
        });
    } catch (error) {
        console.error('Modification API Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Modification failed' },
            { status: 500 }
        );
    }
}
