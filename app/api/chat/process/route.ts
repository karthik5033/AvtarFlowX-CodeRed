import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { getApiKey, rotateKey } from '@/lib/gemini-client';

export async function POST(req: Request) {
    let tempFilePath = '';
    let apiKey = '';
    try { apiKey = getApiKey(); } catch { apiKey = ''; }

    try {
        const formData = await req.formData();
        const audioFile = formData.get('audio') as File;
        const streamId = formData.get('streamId') as string;
        const systemPrompt = formData.get('systemPrompt') as string;
        const sessionId = formData.get('sessionId') as string;
        const mimeType = formData.get('mimeType') as string || 'audio/webm';
        const knowledgeBase = formData.get('knowledgeBase') as string;
        const creativity = parseFloat(formData.get('creativity') as string || '0.7');

        console.log(`[ChatProcess] Params: StreamID=${streamId}, SessionID=${sessionId}, AudioSize=${audioFile?.size}, MimeType=${mimeType}`);

        if (!audioFile || !streamId || !sessionId) {
            return NextResponse.json({ error: 'Missing audio or session data' }, { status: 400 });
        }

        if (!apiKey) {
            console.error("[ChatProcess] Missing GEMINI_API_KEY");
            return NextResponse.json({ error: 'Server missing GEMINI_API_KEY' }, { status: 500 });
        }

        // Initialize Clients
        const genAI = new GoogleGenerativeAI(apiKey);
        const fileManager = new GoogleAIFileManager(apiKey);

        // 1. Save buffer to temp file
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const uniqueId = Math.random().toString(36).substring(7);
        tempFilePath = join(tmpdir(), `upload_${Date.now()}_${uniqueId}.webm`); // Force webm ext for consistency if widely compatible

        await writeFile(tempFilePath, buffer);
        console.log(`[ChatProcess] Saved temp file: ${tempFilePath}`);

        // 2. Upload to Gemini
        const cleanMimeType = mimeType.split(';')[0].trim(); // Remove ';codecs=...'
        console.log(`[ChatProcess] Uploading with MimeType: ${cleanMimeType} (Original: ${mimeType})`);

        const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: cleanMimeType,
            displayName: "Audio Prompt",
        });
        console.log(`[ChatProcess] Uploaded file: ${uploadResult.file.uri}`);

        // 2.5 Wait for processing to complete
        let file = await fileManager.getFile(uploadResult.file.name);
        while (file.state === FileState.PROCESSING) {
            console.log(`[ChatProcess] Processing file...`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            file = await fileManager.getFile(uploadResult.file.name);
        }

        if (file.state === FileState.FAILED) {
            throw new Error("Audio processing failed.");
        }
        console.log(`[ChatProcess] File ready: ${file.uri} State: ${file.state}`);

        // 3. Call Gemini
        console.log("[ChatProcess] Calling Gemini 2.0 Flash...");
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                temperature: creativity // Use the creativity/temperature setting
            }
        });

        const baseSystem = "You are a professional AI avatar. Provide a concise, engaging response to the user's audio input. Keep it under 2 sentences.";
        let finalPrompt = baseSystem;

        if (systemPrompt || knowledgeBase) {
            finalPrompt = `Your Persona/Context: ${systemPrompt || "Professional AI Assistant"}\n`;
            if (knowledgeBase) {
                finalPrompt += `\nKnowledge Base (Use this to answer): ${knowledgeBase}\n`;
            }
            finalPrompt += `\nTask: Reply to the audio input acting as this persona. Keep it concise (under 2 sentences) for conversation.`;
        }

        const result = await model.generateContent([
            finalPrompt,
            {
                fileData: {
                    fileUri: file.uri,
                    mimeType: file.mimeType,
                },
            },
        ]);

        const responseText = result.response.text();
        console.log("[ChatProcess] Gemini Response:", responseText);

        // 4. Send to D-ID
        console.log("[ChatProcess] Sending to D-ID Talk...");
        const didApiKey = process.env.DID_API_KEY || process.env['D-ID_KEY'];
        const authHeader = didApiKey?.startsWith('Basic ') ? didApiKey : `Basic ${Buffer.from(didApiKey || '').toString('base64')}`;

        const talkRes = await fetch(`https://api.d-id.com/talks/streams/${streamId}`, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                script: {
                    type: 'text',
                    subtitles: false,
                    provider: { type: 'microsoft', voice_id: 'en-US-JennyNeural' },
                    input: responseText
                },
                config: {
                    fluent: true,
                    pad_audio: 0
                },
                // session_id: sessionId // Removing explicit session_id as it appears to be capturing cookie data and is optional for Stream Talk
            })
        });

        if (!talkRes.ok) {
            const talkErr = await talkRes.text();
            console.error("D-ID Talk Error:", talkErr);
            throw new Error(`D-ID Talk Failed: ${talkErr}`); // This will go to catch block
        }

        return NextResponse.json({ text: responseText, status: 'speaking' });

    } catch (error: any) {
        console.error('Chat Processing Exception:', error);
        // Rotate API key on 429 so the next request uses a different one
        const msg = error.message || '';
        if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('quota')) {
            rotateKey();
            console.log('[ChatProcess] Rotated API key for next request due to 429');
        }
        return NextResponse.json({
            error: 'Gemini Generation Failed',
            details: error.message
        }, { status: 500 });
    } finally {
        // Cleanup temp file
        if (tempFilePath) {
            try {
                await unlink(tempFilePath);
                console.log(`[ChatProcess] Deleted temp file: ${tempFilePath}`);
            } catch (e) {
                console.error("Temp cleanup failed:", e);
            }
        }
    }
}
