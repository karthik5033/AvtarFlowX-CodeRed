import { GoogleGenerativeAI } from '@google/generative-ai';
import { getModel, hasApiKey } from './gemini-client';

// Initialize the Gemini AI client with key rotation
const { genAI, model: defaultModel, apiKey } = (() => {
    try {
        return getModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
            },
        });
    } catch {
        // Fallback for when no keys are set (e.g. during build)
        return {
            genAI: new GoogleGenerativeAI(''),
            model: new GoogleGenerativeAI('').getGenerativeModel({ model: 'gemini-2.0-flash-exp' }),
            apiKey: '',
        };
    }
})();

if (!apiKey && typeof window === 'undefined') {
    console.warn('GEMINI_API_KEY is not set in environment variables');
}

export { genAI };
export const model = defaultModel;

export type AIResponse = {
    code: string;
    language: string;
    description?: string;
};
