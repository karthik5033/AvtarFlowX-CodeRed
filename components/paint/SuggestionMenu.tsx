"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Search, Command, Zap } from "lucide-react";

interface SuggestionMenuProps {
    position: { x: number; y: number } | null;
    onSelect: (action: string) => void;
    onClose: () => void;
    context?: string; // Content of the source node
}

export default function SuggestionMenu({ position, onSelect, onClose, context = "" }: SuggestionMenuProps) {
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [adjustedPos, setAdjustedPos] = useState(position);

    // Auto-focus input
    useEffect(() => {
        if (position) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setQuery("");
        }
    }, [position]);

    // Use LayoutEffect to measure before painting to avoid flicker
    React.useLayoutEffect(() => {
        if (position && menuRef.current) {
            const menuRect = menuRef.current.getBoundingClientRect();
            let { x, y } = position;
            const viewportHeight = window.innerHeight;

            // Check right edge
            if (x + menuRect.width > window.innerWidth) {
                x = window.innerWidth - menuRect.width - 20;
            }

            // Check bottom edge constraint
            const spaceBelow = viewportHeight - y;
            if (spaceBelow < menuRect.height + 20) {
                // If not enough space below, force it to fit or move up
                if (y > menuRect.height) {
                    // Move up if space above
                    y = y - menuRect.height;
                } else {
                    // Shift to bottom edge
                    y = viewportHeight - menuRect.height - 10;
                }
            }

            setAdjustedPos({ x, y });
        } else {
            setAdjustedPos(position);
        }
    }, [position]);

    if (!position || !adjustedPos) return null;

    // 🔹 Mock Logic for Recommendations
    const getRecommendations = (prevNodeLabel: string) => {
        const lower = prevNodeLabel.toLowerCase();
        let recs = [];
        if (lower.includes("input") || lower.includes("form")) recs = ["Save to Database", "Validate Input", "Send Email"];
        else if (lower.includes("button") || lower.includes("trigger")) recs = ["Navigate to Page", "Show Alert", "API Call"];
        else if (lower.includes("condition") || lower.includes("logic")) recs = ["Terminate", "Update Record", "Loop"];
        else if (lower.includes("database") || lower.includes("save")) recs = ["Show Success Message", "Redirect"];
        else recs = ["Log Output", "Condition"];

        return [...recs, "Delete Node"];
    };

    const recommendations = context ? getRecommendations(context) : [];

    // Default Actions
    const allActions = [
        { label: "Send Email", icon: "📧", category: "App Logic" },
        { label: "Create Record", icon: "📝", category: "Data" },
        { label: "API Call", icon: "🌐", category: "External" },
        { label: "Condition", icon: "🔀", category: "Logic" },
        { label: "Show Alert", icon: "🔔", category: "Interface" },
        { label: "Navigate", icon: "🔗", category: "Navigation" },
    ];

    // Filtered by search
    const filteredActions = allActions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            // If valid specific action matches precisely, select it, else treat as custom AI prompt
            const match = filteredActions.find(a => a.label.toLowerCase() === query.toLowerCase());
            onSelect(match ? match.label : `AI_PROMPT:${query}`);
        }
        if (e.key === "Escape") onClose();
    };

    return (
        <div
            ref={menuRef}
            className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-200 w-80 overflow-hidden animate-in fade-in zoom-in-95 duration-100 font-sans"
            style={{ left: adjustedPos.x, top: adjustedPos.y }}
        >
            {/* Header / AI Input */}
            <div className="bg-white p-3 border-b border-gray-100">
                <div className="relative flex items-center">
                    <Sparkles className={`w-4 h-4 absolute left-3 ${query.length > 0 ? "text-primary animate-pulse" : "text-gray-400"}`} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask AI or search actions..."
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-gray-400 text-gray-800"
                    />
                </div>
                {query.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-primary font-medium px-1">
                        <Command className="w-3 h-3" />
                        <span>Press Enter to generate node from prompt</span>
                    </div>
                )}
            </div>

            <div className="max-h-[320px] overflow-y-auto custom-scrollbar p-2">
                {/* 🔹 Recommendations Section (Only if context exists and no search query) */}
                {context && query.length === 0 && recommendations.length > 0 && (
                    <div className="mb-3">
                        <div className="px-2 py-1.5 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <Zap className="w-3 h-3 text-yellow-500" />
                            Suggested Next Steps
                        </div>
                        {recommendations.map(rec => (
                            <button
                                key={rec}
                                onClick={() => onSelect(rec)}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-primary/10 hover:text-primary rounded-md flex items-center gap-2 transition-colors border border-transparent hover:border-primary/20"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                {rec}
                            </button>
                        ))}
                    </div>
                )}

                {/* 🔹 All Actions List */}
                <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {query.length > 0 ? "Search Results" : "All Actions"}
                </div>

                {filteredActions.length === 0 && query.length > 0 && (
                    <button onClick={() => onSelect(`AI_PROMPT:${query}`)} className="w-full text-left px-3 py-3 text-sm text-gray-600 hover:bg-primary/5 rounded-md border border-dashed border-gray-300 hover:border-primary/30 flex items-center gap-3">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span>Generate "<strong>{query}</strong>" with AI</span>
                    </button>
                )}

                {filteredActions.map((action) => (
                    <button
                        key={action.label}
                        onClick={() => onSelect(action.label)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-3 transition-colors"
                    >
                        <span className="text-base">{action.icon}</span>
                        <span>{action.label}</span>
                    </button>
                ))}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 p-2 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400 px-3">
                <span>↑↓ to navigate</span>
                <span>ESC to close</span>
            </div>
        </div>
    );
}
