"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { withRetry, hasApiKey } from "@/lib/gemini-client";
import { decomposeFlowchart, composeSections } from "@/lib/master-agent";
import { generateSection } from "@/lib/slave-agent";

export const generateChatResponse = async (history: { role: "user" | "model"; parts: string }[], message: string) => {
  if (!hasApiKey()) {
    return "Error: GEMINI_API_KEY is not set in .env.local";
  }

  try {
    return await withRetry(
      {
        model: "gemini-3.6-flash",
        systemInstruction: `
            You are the "AI Architect" for AvatarFlowX. Your ONLY job is to translate user app ideas into detailed Architecture Flowcharts.
            You DO NOT write React code. You ONLY output Flowchart JSON.

            CRITICAL RULES:
            - You MUST return a strict JSON object wrapped in \`\`\`json\`\`\` code block.
            - The JSON structure must be: { "nodes": [{ "id": "...", "type": "default", "position": { "x": 0, "y": 0 }, "data": { "label": "...", "color": "#...", "description": "DETAILED SPECS HERE" } }], "edges": [{ "id": "...", "source": "...", "target": "..." }] }.
            - **STRICT JSON (CRITICAL)**: You must output 100% valid JSON. ALL property names must be wrapped in double quotes (e.g. "nodes": [], NOT nodes: []).
            - **MANDATORY**: Every node MUST have a 'description' field in 'data' with FINE DETAILS (e.g., "Hero section with h1 text 'Welcome' and a CTA button. Use glassmorphism.").
            - **Granularity**: Break app flows into detailed steps. Instead of just "Login", generate "Login Form" -> "Auth API" -> "Success Toast" -> "Redirect".
            - **BALANCED LAYOUT (CRITICAL)**: Do NOT create a single long linear sequence of nodes. Design the flowchart as a balanced tree or hub-and-spoke model. Branch out multiple parallel paths from central nodes to balance the graph vertically and horizontally.
            - Keep node labels concise. Use vibrant colors (hex codes) for nodes.
            - Spread nodes out visually so they don't overlap (increase x/y coordinates significantly).
            
            NEVER OUTPUT REACT CODE. ONLY OUTPUT JSON FLOWCHARTS.
            `
      },
      async (model) => {
        // Convert history to Gemini format (ensure role is 'user' or 'model')
        const chat = model.startChat({
          history: history.map(h => ({
            role: h.role, // Logic simplified as input is typed "user" | "model"
            parts: [{ text: h.parts }]
          })),
          generationConfig: {
            maxOutputTokens: 8192,
          },
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        return response.text();
      }
    );
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    return `AI Error: ${error.message}`;
  }
};

export const generateAppBoilerplate = async (flowData: any) => {
  if (!hasApiKey()) {
    return "// Error: GEMINI_API_KEY is not set.";
  }

  try {
    const toonString = typeof flowData === 'string' ? flowData : JSON.stringify(flowData);
    
    // Phase 1: Decompose
    const blueprint = await decomposeFlowchart(toonString);
    
    // Phase 2: Parallel Generation
    const sectionPromises = blueprint.sections.map((section, index) => {
        return new Promise<any>(resolve => setTimeout(resolve, index * 1000)).then(() => {
            return generateSection(blueprint, section)
                .then(code => ({ id: section.id, code, success: true }))
                .catch(error => {
                    console.error(`[Slave Agent] Failed to generate section ${section.id}:`, error);
                    const compName = section.id.split(/[-_\s]+/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
                    return { 
                        id: section.id, 
                        code: `const ${compName} = () => <div className="p-4 border border-red-500 bg-red-50 text-red-700">Failed to generate ${section.label}</div>;`, 
                        success: false 
                    };
                });
        });
    });
    
    const results = await Promise.all(sectionPromises);
    
    const sectionCodes: Record<string, string> = {};
    results.forEach(res => {
        sectionCodes[res.id] = res.code;
    });
    
    // Phase 3: Compose
    const composedCode = composeSections(blueprint, sectionCodes);
    
    try {
        require('fs').writeFileSync('.avtarflow_last_generated.tsx', composedCode);
    } catch(e) {}

    return composedCode;

  } catch (error: any) {
    console.error("Master-Slave Generation Error:", error);
    return `// Error generating code: ${error.message}\nexport default function App() { return <div className="p-8 text-red-500">Generation Failed: ${error.message}</div>; }`;
  }
};

export const suggestImage = async (query: string) => {
  if (!hasApiKey()) return null;

  try {
    return await withRetry(
      { model: "gemini-3.6-flash" },
      async (model) => {
        const prompt = `
        You are an image search assistant.
        The user wants an image for: "${query}".
        Return A SINGLE valid, high-quality Unsplash image URL that matches this description.
        Prefer general, high-resolution images.
        Format: ONLY the URL string. No text, no markdown.
        Example: https://images.unsplash.com/photo-123456789...
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        return text.startsWith("http") ? text : null;
      }
    );
  } catch (error) {
    console.error("Image Suggestion Error:", error);
    return null; // Return null on failure
  }
}

export const generateFlowFromImage = async (base64Image: string) => {
  if (!hasApiKey()) return null;

  try {
    return await withRetry(
      { model: "gemini-3.6-flash" },
      async (model) => {
        const prompt = `
        Analyze this flowchart/diagram image and extract the nodes and edges into a JSON format compatible with React Flow.
        
        The JSON structure must be: 
        { 
            "nodes": [{ "id": "1", "type": "default", "position": { "x": 100, "y": 100 }, "data": { "label": "Start", "description": "Details about this step" } }], 
            "edges": [{ "id": "e1-2", "source": "1", "target": "2" }] 
        }

        CRITICAL:
        - Return ONLY the raw JSON. No markdown.
        - **LAYOUT SPACING (MANDATORY)**:
          - Use MASSIVE spacing between nodes to prevent overlap.
          - Vertical gap (y-axis) must be at least **150 pixels**.
          - Horizontal gap (x-axis) must be at least **300 pixels**.
          - Do not cluster nodes. Spread them out widely.
        - "description" is important. If the image has text like "Login Page with Google Auth", put that in description.
        - Make sure "source" and "target" in edges match the "id" of nodes.
        `;

        // Split the base64 string to get the mime type and data
        // Expected format: "data:image/png;base64,..."
        const match = base64Image.match(/^data:(image\/[a-z]+);base64,(.+)$/);

        if (!match) {
          throw new Error("Invalid image format");
        }

        const mimeType = match[1];
        const data = match[2];

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: data,
              mimeType: mimeType
            }
          }
        ]);

        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return null;
      }
    );
  } catch (error) {
    console.error("Flow Image Generation Error:", error);
    return null;
  }
};

export const suggestImprovements = async (code: string) => {
  if (!hasApiKey()) return ["Error: API Key missing"];

  try {
    return await withRetry(
      { model: "gemini-3.6-flash" },
      async (model) => {
        const prompt = `
        Analyze the following React component code and suggest 20 specific, high-impact improvements or features.
        Focus on UX, UI, or missing standard functionality.
        
        CODE:
        ${code.substring(0, 15000)} // Limit context

        RETURN STRICT JSON ARRAY OF STRINGS:
        ["Add dark mode support", "Improve button contrast", "Add a footer section", "Add form validation", ...]
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleaned = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
      }
    );
  } catch (e) {
    console.error("Suggestion Error", e);
    return ["Add more content sections", "Improve color scheme", "Add interactive elements"];
  }
};

export const editReactComponent = async (code: string, userPrompt: string) => {
  if (!hasApiKey()) return code;

  try {
    return await withRetry(
      { model: "gemini-3.6-flash" },
      async (model) => {
        const prompt = `
        You are a Senior React Engineer.
        Using the existing code below, implement the following request: "${userPrompt}"

        CRITICAL RULES:
        1. Return the FULL, VALID, RUNNABLE React component code.
        2. Do NOT truncate or skip sections ("... same as before"). WRite the whole file.
        3. Maintain all existing imports (lucide-react, framer-motion, etc.).
        4. If the user asks for a specific feature (e.g. "Dark Mode"), implement it fully using Tailwind classes and State.
        5. DO NOT remove existing functionality unless explicitly asked.
        6. **NO EXTERNAL LIBRARIES**: Do NOT use 'react-hook-form', 'zod', or 'react-toastify'. Use standard \`useState\`.

        IMAGE SEARCH CAPABILITY (CRITICAL):
        If the user asks to "find an image", "add a photo", or "replace image with X", WITHOUT EXCEPTION, use one of these VERIFIED Unsplash URLs. DO NOT hallucinate IDs.
        
        - Abstract/Tech: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80"
        - Nature: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80"
        - Business: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80"
        - Food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80"
        - Animals: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80" (Cat), "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800&q=80" (Dog)
        - Travel: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80"
        
        If the user asks for something not listed, pick the closest category or use a generic "Abstract" one. NEVER leave src="" empty.

        EXISTING CODE:
        ${code}
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Robust extraction of code block
        const match = text.match(/```(?:tsx|jsx|javascript|typescript)?\s*([\s\S]*?)```/);
        if (match && match[1]) {
          return match[1].trim();
        }

        // Fallback: cleanup if no strict block found
        return text.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim();
      }
    );
  } catch (e) {
    console.error("Edit Error", e);
    throw e;
  }
};
