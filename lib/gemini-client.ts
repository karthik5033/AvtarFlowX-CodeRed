import { GoogleGenerativeAI, GenerativeModel, ModelParams } from '@google/generative-ai';

/**
 * Centralized Gemini client with dual-key rotation and retry on 429 errors.
 * 
 * Both keys are free-tier and can hit quota limits independently.
 * This client automatically tries the second key when the first is rate-limited,
 * and includes exponential backoff with the server-suggested retry delay.
 */

function getApiKeys(): string[] {
    const keys: string[] = [];
    const key1 = process.env.GEMINI_API_KEY;
    const key2 = process.env.NEW_GEMINI_API_KEY;
    console.log("CHECKING API KEYS:", { key1: key1 ? "present" : "missing", key2: key2 ? "present" : "missing" });
    if (key1) keys.push(key1);
    if (key2) keys.push(key2);
    return keys;
}

// Track which key index to start with (round-robin across requests)
let currentKeyIndex = 0;

/**
 * Extract retry delay from a 429 error message (in seconds).
 * Falls back to a default delay if not parseable.
 */
function extractRetryDelay(errorMessage: string): number {
    const match = errorMessage.match(/retry\s+in\s+([\d.]+)s/i);
    if (match) {
        return Math.ceil(parseFloat(match[1]));
    }
    return 15; // default 15s fallback
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function is429Error(error: any): boolean {
    if (!error) return false;
    const msg = error.message || error.toString();
    return msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('quota');
}

export type GeminiModelConfig = {
    model?: string;
    generationConfig?: {
        temperature?: number;
        topP?: number;
        topK?: number;
        maxOutputTokens?: number;
    };
    systemInstruction?: string;
};

const DEFAULT_MODEL_CONFIG: GeminiModelConfig = {
    model: 'gemini-2.5-flash',
    generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
    },
};

/**
 * Get a GenerativeModel instance with key rotation.
 * Returns { model, genAI, keyUsed } or throws if no keys are available.
 */
export function getModel(config?: GeminiModelConfig): {
    model: GenerativeModel;
    genAI: GoogleGenerativeAI;
    apiKey: string;
} {
    const keys = getApiKeys();
    if (keys.length === 0) {
        throw new Error('No Gemini API keys configured. Set GEMINI_API_KEY or NEW_GEMINI_API_KEY in .env.local');
    }

    const idx = currentKeyIndex % keys.length;
    const apiKey = keys[idx];
    const genAI = new GoogleGenerativeAI(apiKey);

    const merged = { ...DEFAULT_MODEL_CONFIG, ...config };
    const modelParams: ModelParams = {
        model: merged.model || 'gemini-2.5-flash',
        generationConfig: merged.generationConfig,
        ...(merged.systemInstruction ? { systemInstruction: merged.systemInstruction } : {}),
    };

    const model = genAI.getGenerativeModel(modelParams);

    return { model, genAI, apiKey };
}

/**
 * Execute a Gemini API call with automatic key rotation and retry on 429.
 * 
 * @param config - Model configuration
 * @param operation - Async function that receives (model, genAI) and performs the API call
 * @param maxRetries - Maximum number of retries (default: 3, tries each key)
 * @returns The result of the operation
 */
export async function withRetry<T>(
    config: GeminiModelConfig | undefined,
    operation: (model: GenerativeModel, genAI: GoogleGenerativeAI) => Promise<T>,
    maxRetries: number = 3,
): Promise<T> {
    const keys = getApiKeys();
    if (keys.length === 0) {
        throw new Error('No Gemini API keys configured. Set GEMINI_API_KEY or NEW_GEMINI_API_KEY in .env.local');
    }

    let lastError: any = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const keyIdx = (currentKeyIndex + attempt) % keys.length;
        const apiKey = keys[keyIdx];

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const merged = { ...DEFAULT_MODEL_CONFIG, ...config };
            const modelParams: ModelParams = {
                model: merged.model || 'gemini-2.5-flash',
                generationConfig: merged.generationConfig,
                ...(merged.systemInstruction ? { systemInstruction: merged.systemInstruction } : {}),
            };
            const model = genAI.getGenerativeModel(modelParams);

            const result = await operation(model, genAI);

            // Success - advance the round-robin to this key for next time
            currentKeyIndex = keyIdx;
            return result;
        } catch (error: any) {
            lastError = error;
            console.warn(`[GeminiClient] Key #${keyIdx + 1} failed (attempt ${attempt + 1}/${maxRetries}): ${error.message?.substring(0, 120)}`);

            if (is429Error(error)) {
                // Rotate to the next key immediately
                const delaySec = extractRetryDelay(error.message || '');
                console.log(`[GeminiClient] 429 Rate Limited. Rotating key and waiting ${Math.min(delaySec, 5)}s before retry...`);
                // Wait a shorter delay when rotating keys (the other key might not be limited)
                await sleep(Math.min(delaySec, 5) * 1000);
                continue;
            }

            // Non-429 error: don't retry
            throw error;
        }
    }

    // All retries exhausted
    throw lastError;
}

/**
 * Convenience: check if any API key is available.
 */
export function hasApiKey(): boolean {
    return getApiKeys().length > 0;
}

/**
 * Get the raw API key (for use with GoogleAIFileManager etc.)
 * Returns the current round-robin key.
 */
export function getApiKey(): string {
    const keys = getApiKeys();
    if (keys.length === 0) {
        throw new Error('No Gemini API keys configured.');
    }
    return keys[currentKeyIndex % keys.length];
}

/**
 * Advance to the next API key (call after a failure to manually rotate).
 */
export function rotateKey(): void {
    currentKeyIndex++;
}
