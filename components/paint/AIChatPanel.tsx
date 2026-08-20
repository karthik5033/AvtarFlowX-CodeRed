"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Bot, Wand2, Terminal } from "lucide-react";
import { Node, Edge } from "reactflow";

import { generateChatResponse } from "../../app/actions/ai";

interface AIChatPanelProps {
    onApplyFlow?: (nodes: Node[], edges: Edge[]) => void;
    forceMessage?: string | null;
    onOpenTemplates?: () => void;
}

const GENERATING_STEPS = [
    "Thinking & analyzing requirements...",
    "Architecting workflow logic...",
    "Designing component nodes...",
    "Generating step specifications...",
    "Connecting logic pathways...",
    "Optimizing flowchart layout..."
];

export default function AIChatPanel({ onApplyFlow, forceMessage, onOpenTemplates }: AIChatPanelProps) {
    const [messages, setMessages] = useState<{ role: "user" | "ai" | "model"; text: string }[]>([
        { role: "ai", text: "Hi! I'm your AvatarFlow Agent. I can help you build workflows, generate boilerplate, or explain concepts. What are we building today?" }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [typingStepIndex, setTypingStepIndex] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isTyping) {
            setTypingStepIndex(0);
            return;
        }
        const interval = setInterval(() => {
            setTypingStepIndex((prev) => (prev + 1) % GENERATING_STEPS.length);
        }, 1800);
        return () => clearInterval(interval);
    }, [isTyping]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Handle external messages (e.g. from Sidebar clicks)
    useEffect(() => {
        if (forceMessage) {
            handleSend(forceMessage);
        }
    }, [forceMessage]);

    const handleSend = async (text = input) => {
        if (!text.trim()) return;

        const userMsg = { role: "user" as const, text: text };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        try {
            // Prepare history for API
            // Gemini ERROR fix: History must start with 'user'. We strictly remove the first message if it's the default AI greeting or any AI message at the start.
            // We also filter out the *current* user message from history because 'sendMessage' handles it.
            let historyMessages = messages;

            // 1. Remove the current (last) user message which we just added to state
            // (Actually, 'messages' state might not have updated yet in this closure if it was just set? 
            // no, 'messages' is from the render scope, so it's the *previous* state before the setMessages call above?
            // Wait, setMessages((prev)...) updates state for *next* render. 
            // The 'messages' variable here is still the *old* one.
            // So 'messages' contains [AI Greeting, Previous User, Previous AI...].
            // It does NOT contain the 'text' we are sending right now. Perfect.

            // 2. Filter leading AI messages
            while (historyMessages.length > 0 && historyMessages[0].role === 'ai') {
                historyMessages = historyMessages.slice(1);
            }

            const history = historyMessages.map(m => ({
                role: (m.role === 'user' ? 'user' : 'model') as "user" | "model",
                parts: m.text
            }));

            const responseText = await generateChatResponse(history, text);

            // 🔹 Extract JSON Flow Data using brace counting
            const extractBalancedJSON = (text: string): string | null => {
                const startIndex = text.indexOf('{');
                if (startIndex === -1) return null;

                let braceCount = 0;
                let inString = false;
                let escape = false;
                let endIndex = -1;

                for (let i = startIndex; i < text.length; i++) {
                    const char = text[i];

                    if (!escape && char === '"') {
                        inString = !inString;
                    }

                    if (!inString) {
                        if (char === '{') {
                            braceCount++;
                        } else if (char === '}') {
                            braceCount--;
                            if (braceCount === 0) {
                                endIndex = i;
                                break;
                            }
                        }
                    }

                    if (char === '\\' && !escape) {
                        escape = true;
                    } else {
                        escape = false;
                    }
                }

                if (endIndex !== -1) {
                    return text.substring(startIndex, endIndex + 1);
                }
                return null;
            };

            const extractedJson = extractBalancedJSON(responseText);

            if (extractedJson && onApplyFlow) {
                try {
                    const flowData = JSON.parse(extractedJson);

                    if (flowData.nodes && flowData.edges) {
                        onApplyFlow(flowData.nodes, flowData.edges);

                        // Success! Show a clean confirmation instead of the raw JSON
                        const successMsg = "✅ Canvas updated with the requested flow.\n\n" +
                            (responseText.replace(extractedJson, "").trim() || "You can now edit the nodes or generate the app.");

                        setMessages((prev) => [...prev, { role: "ai", text: successMsg }]);
                        return;
                    }
                } catch (e) {
                    console.error("Failed to parse AI flow JSON", e);
                    // Fallthrough to show raw text if parsing failed so user can see what happened
                }
            }

            setMessages((prev) => [...prev, { role: "ai", text: responseText }]);
        } catch (error) {
            setMessages((prev) => [...prev, { role: "ai", text: "Sorry, I'm having trouble connecting right now." }]);
        } finally {
            setIsTyping(false);
        }
    };

    const QuickAction = ({ icon, label, prompt }: { icon: any, label: string, prompt: string }) => (
        <button
            onClick={() => handleSend(prompt)}
            className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition text-left"
        >
            {icon}
            <span>{label}</span>
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-background border-t border-border font-sans">
            <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                        <Bot className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-bold text-foreground uppercase tracking-wide">AI Agent</span>
                </div>
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] text-muted-foreground font-medium">Online</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background custom-scrollbar">
                {messages.map((msg, idx) => {
                    const isAi = msg.role === "ai" || msg.role === "model";
                    // Clean up trailing empty JSON blocks sometimes generated by the AI
                    const cleanText = msg.text.replace(/```json\s*```/g, '').replace(/```\s*```/g, '').trim();

                    return (
                        <div key={idx} className={`flex gap-3 ${!isAi ? "flex-row-reverse" : ""}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border shadow-sm ${
                                isAi 
                                    ? "bg-background border-border text-emerald-600" 
                                    : "bg-[#0a6636] border-transparent text-white"
                            }`}>
                                {isAi ? <Sparkles className="w-4 h-4" /> : <span className="text-[10px] font-bold tracking-wider">You</span>}
                            </div>
                            <div className={`p-3 rounded-2xl text-[13px] leading-relaxed max-w-[85%] shadow-sm ${
                                isAi
                                    ? "bg-muted/30 text-foreground border border-border rounded-tl-none"
                                    : "bg-[#0a6636] text-white border-transparent rounded-tr-none"
                                }`}>
                                {cleanText}
                            </div>
                        </div>
                    );
                })}

                {isTyping && (
                    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-sm flex-shrink-0">
                            <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
                        </div>
                        <div className="p-3.5 bg-card border border-primary/20 rounded-2xl rounded-tl-none shadow-md flex flex-col gap-2 max-w-[88%]">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1 items-center">
                                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span className="text-xs font-semibold text-primary">AI Agent Thinking</span>
                            </div>
                            <div className="text-xs text-muted-foreground transition-all duration-300 flex items-center gap-1.5 font-medium">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                                <span>{GENERATING_STEPS[typingStepIndex]}</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-background border-t border-border space-y-3">
                {/* Templates Prompt */}
                <div className="flex items-center justify-center gap-2 text-xs">
                    <span className="text-muted-foreground">Don't know what to build?</span>
                    <button onClick={onOpenTemplates} className="text-primary font-semibold hover:underline inline-flex items-center gap-1">
                        <Wand2 className="w-3 h-3" />
                        Choose an idea
                    </button>
                </div>

                {/* Quick Actions */}
                {messages.length < 3 && (
                    <div className="grid grid-cols-2 gap-2">
                        <QuickAction icon={<Wand2 className="w-3 h-3" />} label="Generate Flow" prompt="Generate a boilerplate user registration flow." />
                        <QuickAction icon={<Terminal className="w-3 h-3" />} label="Explain Logic" prompt="Explain the logic of the currently selected nodes." />
                    </div>
                )}

                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Describe a workflow to build..."
                        className="w-full pl-4 pr-10 py-2.5 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground"
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={!input.trim()}
                        className="absolute right-1.5 top-1.5 p-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
