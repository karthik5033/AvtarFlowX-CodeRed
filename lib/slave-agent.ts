import { callWithKey, ComponentSection, ComponentBlueprint } from "./master-agent";

export async function generateSection(
    blueprint: ComponentBlueprint, 
    section: ComponentSection
): Promise<string> {
    const systemInstruction = `You are an expert React UI Developer generating a specific component section for a larger application.
You are tasked with building the ${section.label} section.

APP NAME: ${blueprint.appName}
SHARED STATE: ${blueprint.sharedState.join(', ')}

CRITICAL RULES:
1. Return ONLY the component function code. NO markdown formatting, NO \`\`\`tsx tags. JUST the raw code.
2. Use 'lucide-react' for icons and 'framer-motion' for animations. WARNING: DO NOT use brand icons (Github, Twitter, Linkedin, Facebook, etc.) from lucide-react as they have been deprecated and removed. Use generic icons (e.g. Mail, Link, Globe) or SVGs instead.
3. Tailwind CSS for styling. Use modern, premium glassmorphism and bento-grid designs where applicable.
4. Define any necessary sub-components inline. NO EXTERNAL LIBRARIES except react, lucide-react, framer-motion.
5. The main component name must be EXACTLY "${toPascalCase(section.id)}" (Match this EXACT case, do not change "Api" to "API").
6. CRITICAL: You MUST end the file by exporting the main component as default, e.g. \`export default ${toPascalCase(section.id)};\`
7. Be concise. Maximum 80-120 lines of JSX.
8. If the section description mentions forms, use standard \`useState\` and simulate submission using \`window.parent?.postMessage({ type: 'AVTAR_FLOW_DB_INSERT', table: 'app_form_submissions', data: formData }, '*');\`
9. If you need images, use these Unsplash URLs (do not hallucinate):
   - Abstract/Tech: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80"
   - People/Office: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80"
   - Avatars: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
   - Products: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80"
   Never use the same URL twice in a grid.
`;

    const prompt = `Generate the ${section.label} component.

SECTION DESCRIPTION:
${section.description}

Please output ONLY valid React TSX code for the component.`;

    let resultText = await callWithKey(systemInstruction, prompt, false);

    // Better extraction of code blocks
    const match = resultText.match(/```(?:tsx|jsx|typescript|javascript|react)?([\s\S]*?)```/i);
    if (match) {
        resultText = match[1];
    } else {
        resultText = resultText.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "");
    }

    return resultText.trim();
}

function toPascalCase(str: string): string {
    if (!str) return '';
    return str.split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}
