"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
    ArrowLeft, Sparkles, Palette, Type, Undo, Redo, Copy, Download,
    Monitor, Tablet, Smartphone, Check, Layout, Image as ImageIcon,
    Sliders, MousePointer2, ChevronDown, Search
} from "lucide-react";
import { SandpackProvider, SandpackPreview, SandpackLayout } from "@codesandbox/sandpack-react";
import { generateChatResponse, suggestImage, suggestImprovements, editReactComponent } from "../actions/ai";
import { MEDIA_LIBRARY } from "./images";
import { EDITOR_FONTS } from "./fonts";
import { sanitizeCodeForPreview } from "@/components/paint/PreviewPane";

// Polyfill for crypto.subtle.digest if not available
if (typeof window !== 'undefined' && (!window.crypto || !window.crypto.subtle || !window.crypto.subtle.digest)) {
    if (!window.crypto) {
        (window as any).crypto = {};
    }
    if (!window.crypto.subtle) {
        (window.crypto as any).subtle = {};
    }
    if (!window.crypto.subtle.digest) {
        // Simple fallback that creates a pseudo-hash
        (window.crypto.subtle as any).digest = async function (algorithm: string, data: BufferSource) {
            // Convert data to string
            const str = new TextDecoder().decode(data);
            // Simple hash function (not cryptographically secure, but works for Sandpack's ID generation)
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            // Return as ArrayBuffer
            const buffer = new ArrayBuffer(4);
            const view = new DataView(buffer);
            view.setInt32(0, hash, false);
            return buffer;
        };
    }
}

// --- UI Helper: Collapsible Section ---
const CollapsibleSection = ({ title, children, defaultOpen = false }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <section className="border-b border-gray-100 last:border-0 pb-4 mb-4 last:pb-0 last:mb-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-2 group"
            >
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer group-hover:text-slate-600 transition-colors">{title}</label>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                {children}
            </div>
        </section>
    );
};

export default function CustomizePage() {
    // ---------------- STATE ----------------
    // History
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Core
    const [code, setCode] = useState<string>("");
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<'design' | 'content' | 'images' | 'ai'>('design');
    const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [copied, setCopied] = useState(false);

    // AI Suggestions
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

    // Content Extraction
    const [textFields, setTextFields] = useState<{ id: string, label: string, value: string, rawValue: string, index: number }[]>([]);

    // Image Search & Selection
    const [imageQuery, setImageQuery] = useState("");
    const [localSearchQuery, setLocalSearchQuery] = useState("");
    const [isSearchingImage, setIsSearchingImage] = useState(false);
    const [detectedImages, setDetectedImages] = useState<string[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // ---------------- EFFECTS ----------------
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedCode = localStorage.getItem('avtarflow_current_code');
            if (savedCode && savedCode.trim().length > 10) {
                // Only load if valid code exists
                console.log("Restoring session from localStorage...");
                setHistory([savedCode]);
                setHistoryIndex(0);
                setCode(savedCode);
            }
        }
    }, []);

    // Save to LocalStorage on Change
    useEffect(() => {
        if (code && code.trim().length > 10) {
            const timeoutId = setTimeout(() => {
                localStorage.setItem('avtarflow_current_code', code);
            }, 1000); // 1s debounce to avoid thrashing
            return () => clearTimeout(timeoutId);
        }
    }, [code]);

    // Load AI Suggestions on AI Tab
    useEffect(() => {
        if (activeTab === 'ai' && aiSuggestions.length === 0 && code) {
            handleLoadSuggestions();
        }
    }, [activeTab]);

    const handleLoadSuggestions = async () => {
        setIsLoadingSuggestions(true);
        try {
            const suggestions = await suggestImprovements(code);
            if (Array.isArray(suggestions)) {
                setAiSuggestions(suggestions);
            }
        } catch (e) {
            console.error("Failed to load suggestions", e);
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

    // Extract Text Content & Images
    useEffect(() => {
        if (!code) return;

        // 1. Text Fields
        const regex = />([^<{]+)</g;
        let match;
        const fields = [];
        let i = 0;

        while ((match = regex.exec(code)) !== null) {
            const rawText = match[1]; // Keep exact whitespace for replacement
            const trimmedText = rawText.trim();
            if (trimmedText.length > 2) {
                fields.push({
                    id: `field-${i}`,
                    label: trimmedText.substring(0, 20) + (trimmedText.length > 20 ? '...' : ''),
                    value: trimmedText, // For display
                    rawValue: rawText,  // For replacement
                    index: i
                });
                i++;
            }
        }
        if (fields.length !== textFields.length || fields[0]?.value !== textFields[0]?.value) {
            setTextFields(fields);
        }

        // 2. Extract Images
        const urls: string[] = [];
        // A. src attributes (generic)
        const srcMatches = code.matchAll(/src="([^"]+)"/g);
        for (const m of srcMatches) {
            if (m[1].match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || m[1].includes('images.unsplash.com')) {
                urls.push(m[1]);
            }
        }

        // B. Inline styles: url('...')
        const urlMatches = code.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g);
        for (const m of urlMatches) urls.push(m[1]);

        // C. Specific Unsplash fallback (for raw text URLs if valid)
        const unsplashMatches = code.matchAll(/(https:\/\/images\.unsplash\.com\/[^"'\)\s>]+)/g);
        for (const m of unsplashMatches) {
            // Avoid dupes from src/url matches
            if (!urls.includes(m[1])) urls.push(m[1]);
        }

        // Unique only & valid http/https
        const uniqueImages = Array.from(new Set(urls)).filter(u => u.startsWith('http'));
        // Only update if changed to avoid loops
        setDetectedImages(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(uniqueImages)) {
                return uniqueImages;
            }
            return prev;
        });

    }, [code]);

    // ---------------- ACTIONS ----------------
    const updateCode = (newCode: string) => {
        if (newCode === code) return;
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newCode);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setCode(newCode);
    };

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setCode(history[historyIndex - 1]);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setCode(history[historyIndex + 1]);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([code], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "App.tsx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleAIEdit = async () => {
        if (!prompt.trim() || !code) return;
        setIsGenerating(true);
        try {
            // Using robust edit component
            const response = await editReactComponent(code, prompt);
            updateCode(response);
            setPrompt("");
            // Clear suggestions to allow re-analysis
            setAiSuggestions([]);
        } catch (error) {
            console.error("AI Edit failed:", error);
            alert("Failed to update code with AI. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Design Helpers ---
    const applyTheme = (color: string) => {
        const updated = code.replace(/(text|bg|border|from|to|via)-(blue|indigo|violet|purple|fuchsia|pink|rose|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|gray|slate|zinc|neutral|stone)-/g, `$1-${color}-`);
        updateCode(updated);
    };

    const applyFont = (fontName: string, fontValue: string, fontUrl: string) => {
        let updated = code;

        // 1. Clean up old text classes (font-sans, font-serif, font-['...']) safely
        updated = updated.replace(/font-['a-zA-Z0-9_]+|font-(sans|serif|mono)/g, ' ');

        // 2. Add 'custom-font' class to main wrapper if not present
        if (!updated.includes('custom-font')) {
            updated = updated.replace(/className="([^"]*)"/, `className="$1 custom-font"`);
        }

        // 3. Inject CSS for .custom-font and Google Fonts Link
        // We will remove old <style> and <link> tags related to fonts first
        updated = updated.replace(/<link[^>]+fonts\.googleapis\.com[^>]+>\s*/g, '');
        updated = updated.replace(/<style id="custom-font-style">[\s\S]*?<\/style>\s*/g, '');

        const fontCss = `
      <link href="${fontUrl || ''}" rel="stylesheet" />
      <style id="custom-font-style">{\`
        .custom-font { font-family: '${fontName}', sans-serif !important; }
      \`}</style>`;

        // Inject new tags at the start of the return statement
        const openTagMatch = updated.match(/return\s*\(\s*(<[a-zA-Z0-9]+|<>)/);
        if (openTagMatch) {
            updated = updated.replace(/(return\s*\(\s*<[^>]+>)/, `$1\n${fontCss}`);
        }

        updateCode(updated);
    };

    const applyRadius = (radius: string) => {
        const updated = code.replace(/rounded-(none|sm|md|lg|xl|2xl|3xl|full|DEFAULT)/g, `rounded-${radius}`);
        updateCode(updated);
    };

    // --- Content Helpers ---
    const handleTextChange = (originalRawValue: string, newValue: string) => {
        if (!originalRawValue) return; // Guard against stale state
        // We use the raw captured value to find the exact spot in the code
        // originalRawValue includes the whitespace surrounding the text in the code
        // e.g. code is <h1>  Hello  </h1>, matched "  Hello  "
        // We replace "  Hello  " with "  newValue  " (or just newValue if we want to trim, but safer is preserving space context if it was markup)
        // Actually, user wants "newValue". If they typed it, they probably want that exact string.

        let updated = code;

        // Escape special regex chars in the raw value to find it strictly
        const escaped = originalRawValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Match strict occurence >rawValue<
        const regex = new RegExp(`>${escaped}<`, 'g');

        if (regex.test(updated)) {
            updated = updated.replace(regex, `>${newValue}<`);
            updateCode(updated);
        } else {
            console.warn("Could not find text to replace:", originalRawValue);
            // Fallback: try finding it with trimmed whitespace flexibility if exact match failed logic?
            // But extraction logic guarantees we found it. The only risk is if multiple identical texts exist, ALL replace.
        }
    };

    // --- Shadow & Animation Helpers ---
    const applyShadow = (shadowSize: string) => {
        const updated = code.replace(/shadow-(sm|md|lg|xl|2xl|inner|none)/g, `shadow-${shadowSize}`);
        updateCode(updated);
    };

    const applyAnimation = (animateClass: string) => {
        // Naive replace/append
        let updated = code;
        if (!updated.includes(animateClass)) {
            updated = updated.replace(/className="([^"]*)"/, `className="$1 ${animateClass}"`);
        }
        updateCode(updated);
    };

    // --- Image Helpers ---
    const handleImageReplace = (newUrl: string) => {
        // Case A: User selected a specific image to replace
        if (selectedImage) {
            updateCode(code.replaceAll(selectedImage, newUrl));
            setSelectedImage(newUrl);
            return;
        }

        // Case B: No image selected
        // B1: Only 1 image total -> Auto-replace
        if (detectedImages.length === 1) {
            updateCode(code.replaceAll(detectedImages[0], newUrl));
            setSelectedImage(newUrl);
            return;
        }

        // B2: Multiple images -> Force selection
        if (detectedImages.length > 1) {
            alert("Please select which image to replace from the 'Active Images' list above.");
            return;
        }

        // Case C: No detected images (Fallback)
        // Try global replace of likely detected patterns that might have been missed or direct injection
        let updated = code;
        let changed = false;

        // Try replacing first src
        if (!changed) {
            const srcRegex = /src="([^"]+)"/i;
            if (srcRegex.test(updated)) {
                updated = updated.replace(srcRegex, `src="${newUrl}"`);
                changed = true;
            }
        }

        // Try replacing hero background
        if (!changed) {
            const bgMatch = /url\(['"]?([^'"\)]+)['"]?\)/i;
            if (bgMatch.test(updated)) {
                updated = updated.replace(bgMatch, `url('${newUrl}')`);
                changed = true;
            }
        }

        if (changed) {
            updateCode(updated);
            // Re-run detection will update list
        } else {
            alert("Could not find a suitable image location to replace. Try adding an image node first.");
        }
    };

    const handleImageSearch = async () => {
        if (!imageQuery.trim()) return;
        setIsSearchingImage(true);
        try {
            const url = await suggestImage(imageQuery);
            if (url) {
                handleImageReplace(url);
                setImageQuery(""); // Clear after successful add
            } else {
                alert("No image found. Try a different term.");
            }
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setIsSearchingImage(false);
        }
    };

    // ---------------- UI COMPONENTS ----------------

    return (
        <div className="flex h-screen w-full bg-[#f8f9fb] font-sans overflow-hidden text-slate-900">
            {/* ---------------- PROFESSIONAL SIDEBAR ---------------- */}
            <div className="w-[340px] bg-white border-r border-gray-200 flex flex-col shrink-0 z-30 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                {/* Header */}
                <div className="h-14 border-b border-gray-100 flex items-center justify-between px-4 bg-white">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="p-1.5 hover:bg-slate-50 rounded-md text-slate-400 hover:text-slate-700 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <span className="font-semibold text-sm text-slate-900 tracking-tight">Editor</span>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Icon Rail */}
                    <div className="w-14 items-center flex flex-col border-r border-gray-100 py-4 bg-slate-50/50 gap-1">
                        {[
                            { id: 'design', icon: Sliders, label: 'Design' },
                            { id: 'content', icon: Type, label: 'Content' },
                            { id: 'images', icon: ImageIcon, label: 'Media' },
                            { id: 'ai', icon: Sparkles, label: 'AI' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 group relative ${activeTab === tab.id
                                    ? 'bg-white shadow text-indigo-600 ring-1 ring-gray-200'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                                    }`}
                                title={tab.label}
                            >
                                <tab.icon className="w-5 h-5" />
                                {activeTab === tab.id && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-indigo-600 rounded-r-full -ml-[1px]" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Panel Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                        <div className="p-5 min-h-full">
                            {/* --- DESIGN PANEL --- */}
                            {activeTab === 'design' && (
                                <div className="space-y-8 animate-in slide-in-from-left-2 duration-200">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-bold text-slate-900">Design System</h2>
                                        <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">Global</span>
                                    </div>

                                    {/* Colors */}
                                    <CollapsibleSection title="Color Palette" defaultOpen={false}>
                                        <div className="grid grid-cols-6 gap-2">
                                            {[
                                                { name: 'slate', class: 'bg-slate-500 hover:ring-slate-400' },
                                                { name: 'red', class: 'bg-red-500 hover:ring-red-400' },
                                                { name: 'orange', class: 'bg-orange-500 hover:ring-orange-400' },
                                                { name: 'amber', class: 'bg-amber-500 hover:ring-amber-400' },
                                                { name: 'yellow', class: 'bg-yellow-500 hover:ring-yellow-400' },
                                                { name: 'lime', class: 'bg-lime-500 hover:ring-lime-400' },
                                                { name: 'green', class: 'bg-green-500 hover:ring-green-400' },
                                                { name: 'emerald', class: 'bg-emerald-500 hover:ring-emerald-400' },
                                                { name: 'teal', class: 'bg-teal-500 hover:ring-teal-400' },
                                                { name: 'cyan', class: 'bg-cyan-500 hover:ring-cyan-400' },
                                                { name: 'sky', class: 'bg-sky-500 hover:ring-sky-400' },
                                                { name: 'blue', class: 'bg-blue-500 hover:ring-blue-400' },
                                                { name: 'indigo', class: 'bg-indigo-500 hover:ring-indigo-400' },
                                                { name: 'violet', class: 'bg-violet-500 hover:ring-violet-400' },
                                                { name: 'fuchsia', class: 'bg-fuchsia-500 hover:ring-fuchsia-400' },
                                                { name: 'pink', class: 'bg-pink-500 hover:ring-pink-400' },
                                                { name: 'rose', class: 'bg-rose-500 hover:ring-rose-400' },
                                            ].map((colorObj) => (
                                                <button
                                                    key={colorObj.name}
                                                    onClick={() => applyTheme(colorObj.name)}
                                                    className={`w-8 h-8 rounded-full ${colorObj.class} shadow-sm hover:scale-110 transition-all ring-1 ring-slate-200 ring-offset-1`}
                                                    title={colorObj.name}
                                                />
                                            ))}
                                        </div>
                                    </CollapsibleSection>

                                    <hr className="border-dashed border-gray-100 mb-6" />

                                    {/* Typography Dropdown */}
                                    <CollapsibleSection title="Typography" defaultOpen={false}>
                                        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {EDITOR_FONTS.map((font) => (
                                                <button
                                                    key={font.name}
                                                    onClick={() => applyFont(font.name, font.value, font.url)}
                                                    className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-transparent hover:bg-slate-50 hover:border-gray-200 transition-all group"
                                                >
                                                    <span className="text-sm text-slate-700">{font.name}</span>
                                                    <span className="text-[10px] text-slate-400 group-hover:text-indigo-500 font-medium">{font.type}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </CollapsibleSection>

                                    {/* Radius */}
                                    <CollapsibleSection title="Border Radius" defaultOpen={true}>
                                        <div className="flex bg-slate-100 p-1 rounded-lg">
                                            {[
                                                { id: 'none', label: 'Square' },
                                                { id: 'md', label: 'Soft' },
                                                { id: 'full', label: 'Round' },
                                            ].map((r) => (
                                                <button
                                                    key={r.id}
                                                    onClick={() => applyRadius(r.id)}
                                                    className="flex-1 py-1.5 text-xs font-medium text-slate-600 rounded-md hover:bg-white hover:shadow-sm transition-all active:scale-95 focus:bg-white focus:shadow-sm"
                                                >
                                                    {r.label}
                                                </button>
                                            ))}
                                        </div>
                                    </CollapsibleSection>

                                    {/* Shadows */}
                                    <CollapsibleSection title="Shadows" defaultOpen={false}>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['none', 'sm', 'md', 'lg', 'xl', '2xl'].map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => applyShadow(s)}
                                                    className={`py-2 px-2 text-xs border rounded transition-all hover:bg-slate-50 ${s === 'none' ? 'border-gray-200 text-slate-400' : 'border-gray-200 text-slate-600'}`}
                                                    style={{ boxShadow: s === 'none' ? 'none' : `var(--tw-shadow-${s === 'sm' ? '' : s})` }} // Simplified visual hint
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </CollapsibleSection>

                                    {/* Animations */}
                                    <CollapsibleSection title="Animations" defaultOpen={false}>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'animate-in fade-in duration-700', label: 'Fade In' },
                                                { id: 'animate-in slide-in-from-bottom-4 duration-700', label: 'Slide Up' },
                                                { id: 'animate-in slide-in-from-left-4 duration-700', label: 'Slide Right' },
                                                { id: 'animate-in zoom-in duration-500', label: 'Zoom In' },
                                            ].map((anim) => (
                                                <button
                                                    key={anim.id}
                                                    onClick={() => applyAnimation(anim.id)}
                                                    className="py-2 px-3 text-xs border border-gray-200 rounded text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                                                >
                                                    {anim.label}
                                                </button>
                                            ))}
                                        </div>
                                    </CollapsibleSection>

                                </div>
                            )}

                            {/* --- CONTENT PANEL --- */}
                            {activeTab === 'content' && (
                                <div className="space-y-6 animate-in slide-in-from-left-2 duration-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <h2 className="text-sm font-bold text-slate-900">Text Content</h2>
                                    </div>

                                    {textFields.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-gray-200 rounded-xl bg-slate-50/50">
                                            <Layout className="w-8 h-8 text-gray-300 mb-2" />
                                            <p className="text-xs text-gray-400 font-medium">No editable fields detected.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {textFields.map((field, idx) => (
                                                <div key={idx} className="group relative">
                                                    <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block truncate group-hover:text-indigo-600 transition-colors">
                                                        {field.label}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        defaultValue={field.value}
                                                        onBlur={(e) => handleTextChange(field.rawValue || field.value, e.target.value)}
                                                        className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all placeholder:text-slate-300"
                                                        placeholder="Enter content..."
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* --- IMAGES PANEL --- */}
                            {activeTab === 'images' && (
                                <div className="space-y-6 animate-in slide-in-from-left-2 duration-200">

                                    {/* --- Active Images Selector --- */}
                                    {detectedImages.length > 0 && (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Select Image to Replace</h2>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 mb-6">
                                                {detectedImages.map((url, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setSelectedImage(url)}
                                                        className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${selectedImage === url
                                                            ? 'border-indigo-600 ring-2 ring-indigo-200'
                                                            : 'border-transparent hover:border-slate-300'
                                                            }`}
                                                    >
                                                        <img
                                                            src={url}
                                                            alt={`Active ${i}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        {selectedImage === url && (
                                                            <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                                                                <Check className="w-4 h-4 text-white drop-shadow-md" />
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="h-px bg-gray-100 my-4" />
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mb-2">
                                        <h2 className="text-sm font-bold text-slate-900">Media Library ({MEDIA_LIBRARY.length}+)</h2>
                                    </div>

                                    {/* Local Search Input */}
                                    <div className="relative mb-2">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search library (e.g., 'office', 'nature')..."
                                            value={localSearchQuery}
                                            onChange={(e) => setLocalSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                                        {MEDIA_LIBRARY
                                            .filter(img =>
                                                !localSearchQuery ||
                                                img.label.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
                                                img.tags.some(t => t.toLowerCase().includes(localSearchQuery.toLowerCase()))
                                            )
                                            .map((img, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleImageReplace(img.url)}
                                                    className="group relative aspect-video rounded-lg overflow-hidden bg-slate-100 ring-1 ring-black/5 hover:ring-2 hover:ring-indigo-500 transition-all hover:shadow-lg"
                                                >
                                                    <img src={img.url} alt={img.label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                                        <span className="text-xs font-bold text-white tracking-wide bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/30 shadow-sm">
                                                            Use Image
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-gray-200">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Custom URL or Ask AI</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Paste URL or ask AI for 'mountains'..."
                                                value={imageQuery}
                                                onChange={(e) => setImageQuery(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleImageSearch()}
                                                className="flex-1 px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            />
                                            {/* AI Search Button */}
                                            <button
                                                onClick={handleImageSearch}
                                                disabled={isSearchingImage || !imageQuery}
                                                className="px-3 bg-fuchsia-500 text-white rounded-lg text-xs font-bold hover:bg-fuchsia-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 min-w-[32px]"
                                                title="AI Search & Add"
                                            >
                                                {isSearchingImage ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                            </button>

                                            {/* Standard Add Button */}
                                            <button
                                                onClick={() => {
                                                    if (imageQuery) handleImageReplace(imageQuery);
                                                }}
                                                className="px-3 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm shrink-0"
                                            >
                                                Use
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- AI PANEL --- */}
                            {activeTab === 'ai' && (
                                <div className="space-y-4 animate-in slide-in-from-left-2 duration-200 h-full flex flex-col">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-bold text-slate-900">AI Assistant</h2>
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                                            <Sparkles className="w-3 h-3" />
                                            <span className="text-[10px] font-bold">Pro</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-gradient-to-b from-indigo-50/50 to-white border border-indigo-50 rounded-xl p-4 flex flex-col">
                                        <p className="text-xs text-indigo-900/60 font-medium mb-auto leading-relaxed">
                                            {isLoadingSuggestions
                                                ? "Analyzing your code for improvements..."
                                                : "AI-powered suggestions based on your current design."}
                                        </p>

                                        <div className="space-y-3 mt-4 overflow-y-auto max-h-[400px] pr-2 scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent">
                                            {isLoadingSuggestions ? (
                                                <div className="space-y-2">
                                                    {[1, 2, 3].map(i => (
                                                        <div key={i} className="h-8 bg-indigo-100/50 rounded-lg animate-pulse" />
                                                    ))}
                                                </div>
                                            ) : (
                                                (aiSuggestions.length > 0 ? aiSuggestions : [
                                                    "Make it dark mode",
                                                    "Add a contact form",
                                                    "Make buttons pill shaped",
                                                    "Improve accessibility colors",
                                                    "Add a sticky navbar",
                                                    "Use a better color palette",
                                                    "Add loading skeletons",
                                                    "Implement responsive grid",
                                                    "Add hover effects to cards",
                                                    "Increase whitespace",
                                                    "Use a serif font for headings",
                                                    "Add a 'Back to Top' button",
                                                    "Add a newsletter signup",
                                                    "Create a testimonial section",
                                                    "Add social media icons",
                                                    "Use a gradient background",
                                                    "Add a pricing table",
                                                    "Add a search bar",
                                                    "Improve form validation",
                                                    "Add a cookie consent banner"
                                                ]).map((suggestion, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setPrompt(suggestion)}
                                                        className="w-full text-left px-3 py-2 text-[11px] text-indigo-600 bg-white border border-indigo-100 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all flex items-center gap-2 group"
                                                    >
                                                        <Sparkles className="w-3 h-3 text-indigo-400 shrink-0 group-hover:text-indigo-600 transition-colors" />
                                                        <span className="truncate">{suggestion}</span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder="What should we change?"
                                            className="w-full h-32 p-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none shadow-sm transition-all placeholder:text-slate-300"
                                        />
                                        <button
                                            onClick={handleAIEdit}
                                            disabled={isGenerating || !prompt.trim()}
                                            className="w-full mt-3 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 transition shadow-md shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    <span>PROCESSING...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>GENERATE CHANGES</span>
                                                    <Sparkles className="w-3.5 h-3.5 opacity-80" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ---------------- MAIN PREVIEW AREA ---------------- */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#f8f9fb]">
                <div className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
                    {/* Viewport Toggles */}
                    <div className="flex bg-gray-100/80 p-0.5 rounded-lg border border-gray-200/50">
                        <button
                            onClick={() => setPreviewMode('desktop')}
                            className={`p-1.5 px-3 rounded-md transition-all flex items-center gap-2 ${previewMode === 'desktop' ? 'bg-white shadow-sm text-slate-900 border border-gray-200/50' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Monitor className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setPreviewMode('tablet')}
                            className={`p-1.5 px-3 rounded-md transition-all flex items-center gap-2 ${previewMode === 'tablet' ? 'bg-white shadow-sm text-slate-900 border border-gray-200/50' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Tablet className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setPreviewMode('mobile')}
                            className={`p-1.5 px-3 rounded-md transition-all flex items-center gap-2 ${previewMode === 'mobile' ? 'bg-white shadow-sm text-slate-900 border border-gray-200/50' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Smartphone className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
                            <button
                                onClick={undo}
                                disabled={historyIndex <= 0}
                                className="p-1.5 px-2.5 hover:bg-slate-50 text-slate-500 rounded-md disabled:opacity-30 transition-colors border-r border-gray-100"
                            >
                                <Undo className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={redo}
                                disabled={historyIndex >= history.length - 1}
                                className="p-1.5 px-2.5 hover:bg-slate-50 text-slate-500 rounded-md disabled:opacity-30 transition-colors"
                            >
                                <Redo className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-gray-200"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? "Copied" : "Copy"}
                        </button>
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-sm hover:shadow"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Export
                        </button>
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 overflow-auto relative flex flex-col items-center justify-start py-8 px-4">
                    {code ? (
                        <div
                            className={`bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-xl border border-gray-200/80 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col ${previewMode === 'mobile' ? 'w-[375px] aspect-[375/812] my-auto' :
                                previewMode === 'tablet' ? 'w-[768px] aspect-[768/1024] my-auto' :
                                    'w-full h-full'
                                }`}
                        >
                            {previewMode !== 'mobile' && (
                                <div className="h-6 bg-slate-50 border-b border-gray-200/60 flex items-center px-3 gap-1.5 shrink-0">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300/80"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300/80"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300/80"></div>
                                </div>
                            )}

                            <div className="flex-1 relative min-h-0 bg-white">
                                <SandpackProvider
                                    key={code}
                                    template="react-ts"
                                    theme="light"
                                    files={{ "/App.tsx": { code: sanitizeCodeForPreview(code), active: true }, }}
                                    customSetup={{
                                        dependencies: {
                                            "react": "18.2.0",
                                            "react-dom": "18.2.0",
                                            "lucide-react": "latest",
                                            "clsx": "latest",
                                            "tailwind-merge": "latest",
                                            "react-xarrows": "2.0.2",
                                            "react-use-gesture": "9.1.3",
                                            "framer-motion": "10.16.4",
                                            "react-router-dom": "6.22.3",
                                            "typed.js": "2.0.12",
                                            "recharts": "2.12.0",
                                            "date-fns": "latest"
                                        }
                                    }}
                                    options={{
                                        externalResources: ["https://cdn.tailwindcss.com"],
                                        classes: { "sp-wrapper": "h-full w-full", "sp-layout": "h-full w-full" }
                                    }}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <SandpackLayout style={{ height: "100%", width: "100%", borderRadius: 0, border: 'none' }}>
                                        <SandpackPreview
                                            style={{ height: "100%", width: "100%" }}
                                            showOpenInCodeSandbox={false}
                                            showRefreshButton={false}
                                            showNavigator={false}
                                        />
                                    </SandpackLayout>
                                </SandpackProvider>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400 mt-20">
                            <div className="w-10 h-10 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                            <span className="text-sm font-medium">Loading Preview...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
