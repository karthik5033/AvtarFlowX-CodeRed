// lib/gemini-pool.ts
export type KeyType = 'gemini' | 'groq';

export interface ApiKey {
    id: string; // e.g., GOOGLE_API_KEY_3
    value: string;
    type: KeyType;
    isRateLimited: boolean;
    rateLimitResetTime: number; // timestamp when it can be used again
}

let geminiKeys: ApiKey[] = [];
let groqKeys: ApiKey[] = [];
let currentGeminiIndex = 0;
let currentGroqIndex = 0;

export function initializePool() {
    geminiKeys = [];
    groqKeys = [];
    currentGeminiIndex = 0;
    currentGroqIndex = 0;

    // Load Gemini keys
    if (process.env.GEMINI_API_KEY) {
        geminiKeys.push({ id: 'GEMINI_API_KEY', value: process.env.GEMINI_API_KEY, type: 'gemini', isRateLimited: false, rateLimitResetTime: 0 });
    }
    if (process.env.GOOGLE_API_KEY) {
        geminiKeys.push({ id: 'GOOGLE_API_KEY', value: process.env.GOOGLE_API_KEY, type: 'gemini', isRateLimited: false, rateLimitResetTime: 0 });
    }
    for (let i = 1; i <= 12; i++) {
        const key = process.env[`GOOGLE_API_KEY_${i}`];
        if (key) {
            geminiKeys.push({ id: `GOOGLE_API_KEY_${i}`, value: key, type: 'gemini', isRateLimited: false, rateLimitResetTime: 0 });
        }
    }

    // Load Groq keys
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`GROQ_API_KEY_${i}`];
        if (key) {
            groqKeys.push({ id: `GROQ_API_KEY_${i}`, value: key, type: 'groq', isRateLimited: false, rateLimitResetTime: 0 });
        }
    }
    
    console.log(`[GeminiPool] Initialized: ${geminiKeys.length} Gemini keys, ${groqKeys.length} Groq keys.`);
}

export function getAvailableKey(type: KeyType): ApiKey {
    if (geminiKeys.length === 0 && groqKeys.length === 0) {
        initializePool();
    }

    const keys = type === 'gemini' ? geminiKeys : groqKeys;
    if (keys.length === 0) {
        throw new Error(`No API keys available for type: ${type}`);
    }

    const now = Date.now();
    let startIndex = type === 'gemini' ? currentGeminiIndex : currentGroqIndex;
    let index = startIndex;

    do {
        const key = keys[index];
        // If it was rate limited but the reset time has passed, clear the flag
        if (key.isRateLimited && now > key.rateLimitResetTime) {
            key.isRateLimited = false;
        }

        if (!key.isRateLimited) {
            // Found a good key. Advance index for next time (round-robin)
            if (type === 'gemini') {
                currentGeminiIndex = (index + 1) % keys.length;
            } else {
                currentGroqIndex = (index + 1) % keys.length;
            }
            return key;
        }

        index = (index + 1) % keys.length;
    } while (index !== startIndex);

    // If all keys are rate limited, we have to wait or throw.
    const soonestReset = Math.min(...keys.map(k => k.rateLimitResetTime));
    const waitTimeMs = Math.max(0, soonestReset - now);
    
    throw new Error(`ALL_${type.toUpperCase()}_KEYS_RATE_LIMITED|Wait ${Math.ceil(waitTimeMs/1000)}s`);
}

export function markKeyRateLimited(id: string, waitSeconds: number = 60) {
    const key = geminiKeys.find(k => k.id === id) || groqKeys.find(k => k.id === id);
    if (key) {
        key.isRateLimited = true;
        key.rateLimitResetTime = Date.now() + (waitSeconds * 1000);
        console.warn(`[KeyPool] Marked key ${id} as rate-limited for ${waitSeconds}s.`);
    }
}

export function getAllGeminiKeys(): string[] {
    if (geminiKeys.length === 0) initializePool();
    return geminiKeys.map(k => k.value);
}
