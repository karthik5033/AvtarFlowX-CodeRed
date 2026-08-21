import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAvailableKey, markKeyRateLimited } from "./gemini-pool";

export interface ComponentSection {
  id: string;
  label: string;
  nodes: string[];
  description: string;
  dependsOn: string[];
}

export interface ComponentBlueprint {
  appName: string;
  sections: ComponentSection[];
  sharedState: string[];
  sharedTypes: string[];
}

const MAX_RETRIES = 5;

// Helper to use an available key for directed calls
export async function callWithKey(
    systemInstruction: string,
    prompt: string,
    responseJson: boolean = false
): Promise<string> {
    let lastError: any = null;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const key = getAvailableKey('gemini');
        
        try {
            const genAI = new GoogleGenerativeAI(key.value);
            const model = genAI.getGenerativeModel({
                model: "gemini-3.6-flash",
                systemInstruction: systemInstruction,
                generationConfig: {
                    temperature: 0.2,
                    ...(responseJson ? { responseMimeType: "application/json" } : {})
                }
            });
            
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error: any) {
            lastError = error;
            console.warn(`[MasterAgent] callWithKey failed (key: ${key.id}, attempt: ${attempt + 1}/${MAX_RETRIES}):`, error.message?.substring(0, 100));
            
            const msg = error.message || error.toString();
            if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('quota')) {
                // Rate limited, mark it
                markKeyRateLimited(key.id, 15);
                continue; // Try next key
            }
            throw error; // If it's not rate limited, just throw
        }
    }
    
    throw lastError;
}

export async function decomposeFlowchart(toonData: string): Promise<ComponentBlueprint> {
    const systemInstruction = `You are a Principal Software Architect. Your job is to decompose a React application flowchart into 4-5 logical, independent component sections. 

Input Format: TOON (Nodes and Edges).
Output Format: STRICT JSON matching this schema:
{
  "appName": "Name of app",
  "sections": [
    {
      "id": "unique-id",
      "label": "Human readable label",
      "nodes": ["node_id_1", "node_id_2"],
      "description": "DETAILED description of what to render, aggregating the node descriptions.",
      "dependsOn": ["other_section_id"]
    }
  ],
  "sharedState": ["currentPage", "isDark"],
  "sharedTypes": []
}

CRITICAL RULES:
- Aim for 4-5 sections (e.g., Navbar, Hero, MainContent, Forms, Footer).
- EVERY node from the input MUST be assigned to exactly ONE section.
- Combine closely related nodes (e.g., a "Dashboard" node and a "Chart" node) into the same section if they are visually related.
- The "description" for each section must contain all styling and behavior specs from the nodes. This is what the code generator will use.
`;

    const prompt = `Decompose this flowchart into sections:\n\n${toonData}`;
    
    const resultText = await callWithKey(systemInstruction, prompt, true);
    
    try {
        const blueprint = JSON.parse(resultText) as ComponentBlueprint;
        return blueprint;
    } catch (e) {
        console.error("Failed to parse blueprint JSON:", resultText);
        throw new Error("Failed to parse Component Blueprint from LLM.");
    }
}

function toPascalCase(str: string): string {
    if (!str) return '';
    return str.split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

export function composeSections(blueprint: ComponentBlueprint, sectionCodes: Record<string, string>): string {
    const reactNamed = new Set<string>(['useState', 'useEffect', 'useRef']);
    const lucideNamed = new Set<string>();
    const framerNamed = new Set<string>(['motion', 'AnimatePresence']);
    
    let sectionsString = '';
    let componentsToRender = '';

    const importRegex = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?/g;

    blueprint.sections.forEach(section => {
        const compName = toPascalCase(section.id);
        const code = sectionCodes[section.id] || `const ${compName} = () => <div className="p-4 border text-red-500">Error generating ${section.id}</div>;`;
        
        let codeWithoutImports = code;
        const matches = Array.from(code.matchAll(importRegex));
        
        matches.forEach(match => {
            const fullImport = match[0];
            const importsPart = match[1]; // e.g. "React, { useState }" or "{ motion }"
            const moduleName = match[2];
            
            const namedMatch = importsPart.match(/\{([\s\S]*?)\}/);
            if (namedMatch) {
                const names = namedMatch[1].split(',').map(n => n.trim()).filter(Boolean);
                if (moduleName === 'react') {
                    names.forEach(n => reactNamed.add(n));
                } else if (moduleName === 'lucide-react') {
                    names.forEach(n => lucideNamed.add(n));
                } else if (moduleName === 'framer-motion') {
                    names.forEach(n => framerNamed.add(n));
                }
            }
            codeWithoutImports = codeWithoutImports.replace(fullImport, '');
        });
        
        sectionsString += `\n// ---- SECTION: ${section.label} ----\n${codeWithoutImports.trim()}\n`;
        componentsToRender += `        <${compName} />\n`;
    });

    const importsString = [
        `import React, { ${Array.from(reactNamed).join(', ')} } from "react";`,
        framerNamed.size > 0 ? `import { ${Array.from(framerNamed).join(', ')} } from "framer-motion";` : '',
        lucideNamed.size > 0 ? `import { ${Array.from(lucideNamed).join(', ')} } from "lucide-react";` : ''
    ].filter(Boolean).join('\n');

    // 3. Assemble App
    const appShell = `
// ---- APP SHELL ----
export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [isDark, setIsDark] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
${componentsToRender}
    </div>
  );
}
`;

    return `${importsString}\n\n${sectionsString}\n${appShell}`;
}

export async function validateAndFix(composedCode: string): Promise<string> {
    // Basic static check: do we have unbalanced braces?
    const openBraces = (composedCode.match(/\{/g) || []).length;
    const closeBraces = (composedCode.match(/\}/g) || []).length;
    
    // Even if balanced, there might be other syntax errors, so we run it through the AI validator.
    const systemInstruction = `You are a syntax validator.
Review the provided React component for SYNTAX ERRORS ONLY (missing braces, unterminated strings, invalid JSX).
If the code is valid, return it EXACTLY AS IS.
If there are errors, FIX THEM and return the FIXED code.
CRITICAL: Return ONLY valid React code wrapped in \`\`\`tsx ... \`\`\`. Do not include any explanations.`;

    const prompt = `Check and fix this code if needed:\n\n\`\`\`tsx\n${composedCode}\n\`\`\``;
    
    let resultText = await callWithKey(systemInstruction, prompt, false);
    
    // Extract code block
    const codeBlockMatch = resultText.match(/```(?:tsx|jsx|javascript|typescript)?\s*([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
        return codeBlockMatch[1].trim();
    }
    
    // Fallback extraction
    return resultText.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim();
}

function capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}
