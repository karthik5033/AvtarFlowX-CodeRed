"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { withRetry, hasApiKey } from "@/lib/gemini-client";

export const generateChatResponse = async (history: { role: "user" | "model"; parts: string }[], message: string) => {
  if (!hasApiKey()) {
    return "Error: GEMINI_API_KEY is not set in .env.local";
  }

  try {
    return await withRetry(
      {
        model: "gemini-2.5-flash",
        systemInstruction: `
            You are an expert Frontend AI that builds React+Tailwind apps based on FLOWCHARTS.
    You will receive a compressed format called TOON:
    Nodes: id|type|label|x|y|color|description
    Edges: source|target|label

    THE DESCRIPTION FIELD IS CRITICAL. It contains user Specifications for that step.
    - If a node says "Login" and description says "Use Google Auth button only", you MUST Implement that.
    - If a node says "Dashboard" and description says "Show a line chart of sales", you MUST Implement exactly that.

    CRITICAL RULES:ABILITY: If the user asks to create, switch, or generate a flowchart/workflow, you MUST return a strict JSON object wrapped in \`\`\`json\`\`\` code block.
            - The JSON structure must be: { "nodes": [{ "id": "...", "type": "default", "position": { "x": 0, "y": 0 }, "data": { "label": "...", "color": "#...", "description": "DETAILED SPECS HERE" } }], "edges": [{ "id": "...", "source": "...", "target": "..." }] }.
            - **MANDATORY**: Every node MUST have a 'description' field in 'data' with FINE DETAILS (e.g., "Hero section with h1 text 'Welcome' and a CTA button").
            - **BALANCED LAYOUT (CRITICAL)**: Do NOT create a single long linear sequence of nodes (e.g., A->B->C->D->E->F). This creates an extreme aspect ratio. Instead, design the flowchart as a **balanced tree or hub-and-spoke model**. Branch out multiple parallel paths from central nodes (e.g., 'Dashboard' branches to 'Settings', 'Profile', 'Feed' simultaneously) to balance the graph vertically and horizontally.
            - **CONNECTIVITY**: EVERY single node must be connected via edges. Do NOT generate disconnected nodes.
            - Keep node labels concise. Use vibrant colors (hex codes) for nodes.
            - Spread nodes out visually so they don't overlap.
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
    return await withRetry(
      { model: "gemini-2.5-flash" },
      async (model) => {
        const prompt = `
    You are an expert React/Next.js developer.
    Analyze this workflow JSON and generate a single file React component (using Tailwind CSS) that implements this logic.
    
    Flow Data: ${JSON.stringify(flowData, null, 2)}
    
    CRITICAL RULES:
    1. Return ONLY the code.
    2. Do NOT import custom components. Define everything (Buttons, Cards, Navbar) inside this file.
    3. Use 'lucide-react' for icons.
    4. Use standard HTML/Tailwind classes.
    5. The default export must be named 'App'.
    6. Wrap the code in \`\`\`tsx\`\`\`.
    7. **NO EXTERNAL LIBRARIES**:
       - DO NOT use 'react-hook-form', 'zod', 'react-toastify', or 'yup'.
       - Use simple React \`useState\` for all forms.
       - Use \`framer-motion\` for animations.
    
    WORLD-CLASS DESIGN SYSTEM (MANDATORY):
    Your goal is to win a generic "Best UI of the Year" award.
    
    1. **Aesthetics (Linear/Vercel Style)**:
       - **Typography**: Use 'font-sans' (Inter). Use tight tracking ('tracking-tight') for headings.
       - **Colors**: Use sophisticated palettes. 
         - Light Mode: 'bg-white', 'text-slate-900', border 'border-slate-200'.
         - Accents: Use 'indigo-600' or 'violet-600' for primary actions.
       - **Shadows & Borders**: Use subtle, multi-layer shadows (e.g., 'shadow-sm', 'shadow-xl'). ADD BORDERS to almost everything ('border border-slate-100').
       - **Glassmorphism**: Use 'backdrop-blur-md' and 'bg-white/70' for sticky headers/overlays.
    
    2. **Layout & Spacing**:
       - **Bento Grids**: Use CSS Grid ('grid-cols-1 md:grid-cols-3 gap-4') for dashboard cards.
       - **Whitespace**: Be generous with padding ('p-6', 'p-8'). Don't cram content.
       - **Mobile-First**: Default to 'w-full' and 'flex-col'. Expand to 'flex-row' on 'md:' breakpoints.
       
    3. **Micro-Interactions (Framer Motion)**:
       - Animate ALL page transitions (opacity, y-shift).
       - Animate buttons on hover ('whileHover={{ scale: 1.02 }}').
       - Use 'AnimatePresence' for conditional rendering (modals, tabs).
       
    4. **Components**:
       - **Buttons**: Rounded-lg, font-medium, subtle border.
       - **Cards**: Bg-white, border-slate-100, shadow-sm, rounded-xl.
       - **Inputs**: Bg-slate-50, border-slate-200, focus:ring-2 ring-indigo-500/20.
    
    5. **Content Realism**:
       - Do NOT use "Lorem Ipsum". Write real copy ("Welcome back, Karthik", "Revenue: $12,450").
       - Mock REAL data structures (arrays of objects) and render them.

    6. **Strict Description Adherence**:
       - If the TOON description says "Use red button", YOU MUST DO IT. 
       - Descriptions override these styles.
    
    7. **Stock Image Strategy (MANDATORY)**:
       - NEVER use colored divs for images. Use these High-Quality Unsplash URLs:
       - **Abstract/Tech**: 
         - "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80"
         - "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80"
         - "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80"
         - "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80"
         - "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80"
       - **People/Office**:
         - "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80"
         - "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
         - "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80"
         - "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?auto=format&fit=crop&w=800&q=80"
       - **Avatars**:
         - "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80"
         - "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
         - "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"
         - "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80"
         - "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
       - **Products/Lifestyle**:
         - "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80" (Headphones)
         - "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80" (Camera)
         - "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80" (Shoes)
         - "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80" (Watch)
         - "https://images.unsplash.com/photo-1585386959960-5f9977f09314?auto=format&fit=crop&w=800&q=80" (Perfume)

       **CRITICAL RULE: NO DUPLICATES**
       - You MUST NOT use the same image URL twice in the same component.
       - If you have a grid of 4 items, use 4 DIFFERENT URLs from the list.
       - If you run out of specific category images, use an 'Abstract/Tech' image as a fallback.

    8. **REAL BACKEND INTEGRATION (MANDATORY)**:
       - You MUST persist data when forms are submitted.
       - Use this exact API call for ANY form submission (Contact, Login, Sign Up):
         \`\`\`javascript
         const response = await fetch('/api/database', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             action: 'insert',
             table: 'app_form_submissions',
             data: {
               project_id: 'default',
               form_id: 'form_' + Date.now(),
               data: JSON.stringify(formData) // Ensure formData is a plain object!
             }
           })
         });
         \`\`\`
       - **FormData Handling**: YOU MUST USE THE FOLLOWING EXACT CODE PATTERN for all form submissions:
         
         \`\`\`javascript
         // ADD THIS useEffect AT THE TOP OF YOUR COMPONENT
         useEffect(() => {
            const handleMessage = (e: MessageEvent) => {
              // Listen for success/error from the parent window
              if (e.data.type === 'DB_INSERT_SUCCESS') {
                alert("✅ Success! Data saved.");
                // Optionally reset form state here
              } else if (e.data.type === 'DB_INSERT_ERROR') {
                alert("❌ Error: " + e.data.error);
              }
            };
            window.addEventListener('message', handleMessage);
            return () => window.removeEventListener('message', handleMessage);
         }, []);

         const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
           e.preventDefault();
           setIsLoading(true);
           
           try {
             const formData = new FormData(e.currentTarget);
             const plainData = Object.fromEntries(formData.entries());
             console.log("Submitting:", plainData);

             // SEND VIA BRIDGE (Bypasses CORS/Mixed Content issues)
             // The parent window (Editor) will handle the actual API call
             window.parent.postMessage({ 
               type: 'AVTAR_FLOW_DB_INSERT', 
               table: 'app_form_submissions', 
               data: plainData 
             }, '*');
             
           } catch (err) {
             console.error(err);
             alert("Error preparing data");
           } finally {
             // Simulate network delay since postMessage is async
             setTimeout(() => setIsLoading(false), 1000);
           }
         };
         \`\`\`
       - **Validation**: Forms must turn red if empty.
       
    SCENARIO SPECIFICS:
    - **Portfolio**: Large Hero Image (use Abstract/Tech), Bento Grid of 4 projects (use Product images), Contact Form with Toast.
    - **SaaS**: Sidebar Layout. Dashboard must show a "Revenue Chart" (rechart or CSS bars) and a "Team Members" list using Avatar images.
    - **E-commerce**: Product Grid using Product images. "Add to Cart" must show a "Added!" toast.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("Gemini Raw Output:", text);

        // Regex to extract code block
        const match = text.match(/```(?:typescript|tsx|jsx|javascript|react)?([\s\S]*?)```/i);

        if (match && match[1]) {
          return match[1].trim();
        }

        // Fallback: mostly clean raw text if no block found
        return text.replace(/```(typescript|tsx|jsx|javascript|react)?/gi, "").replace(/```/g, "").trim();
      }
    );
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    return "// Error generating code. Please check server logs.";
  }
};

export const suggestImage = async (query: string) => {
  if (!hasApiKey()) return null;

  try {
    return await withRetry(
      { model: "gemini-2.5-flash" },
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
      { model: "gemini-2.5-flash" },
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
      { model: "gemini-2.5-flash" },
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
      { model: "gemini-2.5-flash" },
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
