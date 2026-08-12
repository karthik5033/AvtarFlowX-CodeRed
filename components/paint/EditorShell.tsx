"use client";

import React, { useState, useEffect } from "react";
import { Node, Edge, ReactFlowInstance } from "reactflow";
import { Play, Search, Settings, ChevronRight, ChevronDown, Monitor, Smartphone, Maximize2, Plus, Undo, Redo, Wand2, Sparkles, Bot } from "lucide-react";
import Link from "next/link";

import FlowCanvas from "./FlowCanvas";
import NodeEditorModal from "./NodeEditorModal";
import PreviewPane from "./PreviewPane";
import SuggestionMenu from "./SuggestionMenu";
import AIChatPanel from "./AIChatPanel";

import { toTOON } from "../../utils/toon";
import { generateAppBoilerplate, generateFlowFromImage } from "../../app/actions/ai";
import { PanelResizeHandle, Panel, PanelGroup } from "react-resizable-panels";
import { Upload } from "lucide-react";
import { useHistory } from "@/hooks/useHistory";

import DatabaseViewer from "../ai-builder/DatabaseViewer";

/* ------------------ PALETTE COMPONENTS ------------------ */
function PaletteSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-8">
            <h3 className="text-[13px] font-semibold text-gray-900 mb-3 px-1">{title}</h3>
            <div className="space-y-1">{children}</div>
        </div>
    );
}

function PaletteItem({ label, icon, onClick }: { label: string; icon: any; onClick?: () => void }) {
    return (
        <div
            onClick={onClick}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 cursor-pointer transition-all group"
        >
            <div className="w-6 h-6 flex items-center justify-center text-gray-500 group-hover:text-gray-900">
                {typeof icon === 'string' ? <span className="text-lg leading-none">{icon}</span> : icon}
            </div>
            <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">{label}</span>
            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus className="w-3 h-3 text-gray-400" />
            </div>
        </div>
    );
}

export default function EditorShell() {
    /* 🔹 UI State */
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCode, setGeneratedCode] = useState<string | undefined>(undefined);
    const [pendingChatMsg, setPendingChatMsg] = useState<string | null>(null);
    const [tokenStats, setTokenStats] = useState<{ jsonSize: number; toonSize: number; savedPercent: number } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [activeRightTab, setActiveRightTab] = useState<'preview' | 'database'>('preview');
    const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);

    // File Input Ref
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    /* 🔹 ReactFlow Instance for fitView control */
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

    /* 🔹 History management for undo/redo */
    const { pushHistory, undo, redo, canUndo, canRedo } = useHistory();

    /* 🔹 ReactFlow State */
    const [nodes, setNodes] = useState<Node[]>([
        {
            id: "start-trigger",
            type: "default",
            position: { x: 100, y: 100 },
            data: { label: "Input Node (Form)" },
            style: {
                width: 240,
                backgroundColor: "#ffffff",
                borderColor: "#e2e8f0",
                borderRadius: "8px",
                padding: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                color: "#1e293b",
                fontWeight: "500",
                fontSize: "14px"
            },
        },
        {
            id: "ai-logic",
            type: "default",
            position: { x: 400, y: 100 },
            data: { label: "AI Logic Node" },
            style: {
                width: 240,
                backgroundColor: "#ffffff",
                borderColor: "#e2e8f0",
                borderRadius: "8px",
                padding: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                color: "#1e293b",
                fontWeight: "500",
                fontSize: "14px"
            },
        },
        {
            id: "output-node",
            type: "default",
            position: { x: 700, y: 100 },
            data: { label: "Output Node (Result)" },
            style: {
                width: 240,
                backgroundColor: "#ffffff",
                borderColor: "#e2e8f0",
                borderRadius: "8px",
                padding: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                color: "#1e293b",
                fontWeight: "500",
                fontSize: "14px"
            },
        }
    ]);
    const [edges, setEdges] = useState<Edge[]>([
        { id: 'e1-2', source: 'start-trigger', target: 'ai-logic', animated: true, style: { stroke: '#cbd5e1' } },
        { id: 'e2-3', source: 'ai-logic', target: 'output-node', animated: true, style: { stroke: '#cbd5e1' } }
    ]);

    /* 🔹 UI State */
    const [editNode, setEditNode] = useState<Node | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [suggestionPos, setSuggestionPos] = useState<{ x: number; y: number } | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    React.useEffect(() => {
        setMounted(true);
        // Restore from LocalStorage
        if (typeof window !== 'undefined') {
            const savedNodes = localStorage.getItem('avtarflow_nodes');
            const savedEdges = localStorage.getItem('avtarflow_edges');
            const savedCode = localStorage.getItem('avtarflow_generated_code');

            if (savedNodes) {
                try {
                    const parsedNodes = JSON.parse(savedNodes);
                    if (Array.isArray(parsedNodes) && parsedNodes.length > 0) setNodes(parsedNodes);
                } catch (e) { console.error("Failed to parse nodes", e); }
            }
            if (savedEdges) {
                try {
                    const parsedEdges = JSON.parse(savedEdges);
                    if (Array.isArray(parsedEdges)) setEdges(parsedEdges);
                } catch (e) { console.error("Failed to parse edges", e); }
            }
            if (savedCode) {
                setGeneratedCode(savedCode);
            }
        }
    }, []);

    // Auto-Save Nodes & Edges & Code
    React.useEffect(() => {
        if (!mounted) return;
        const timeoutId = setTimeout(() => {
            localStorage.setItem('avtarflow_nodes', JSON.stringify(nodes));
            localStorage.setItem('avtarflow_edges', JSON.stringify(edges));
            if (generatedCode) {
                localStorage.setItem('avtarflow_generated_code', generatedCode);
            }
        }, 1000);
        return () => clearTimeout(timeoutId);
    }, [nodes, edges, generatedCode, mounted]);

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+Z or Cmd+Z for undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                const prevState = undo();
                if (prevState) {
                    setNodes(prevState.nodes);
                    setEdges(prevState.edges);
                }
            }
            // Ctrl+Shift+Z or Cmd+Shift+Z or Ctrl+Y for redo
            if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
                e.preventDefault();
                const nextState = redo();
                if (nextState) {
                    setNodes(nextState.nodes);
                    setEdges(nextState.edges);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    // Track node/edge changes for undo/redo with debouncing (for drag operations)
    const prevNodesRef = React.useRef<Node[]>(nodes);
    const prevEdgesRef = React.useRef<Edge[]>(edges);

    useEffect(() => {
        const timeout = setTimeout(() => {
            // Only push to history if there's an actual change
            const nodesChanged = JSON.stringify(prevNodesRef.current) !== JSON.stringify(nodes);
            const edgesChanged = JSON.stringify(prevEdgesRef.current) !== JSON.stringify(edges);

            if (nodesChanged || edgesChanged) {
                pushHistory(prevNodesRef.current, prevEdgesRef.current);
                prevNodesRef.current = nodes;
                prevEdgesRef.current = edges;
            }
        }, 500); // Debounce for 500ms to avoid capturing every drag frame

        return () => clearTimeout(timeout);
    }, [nodes, edges, pushHistory]);

    /* 🔹 Handlers */
    const handleAddNode = (label: string) => {
        // Push current state to history before making changes
        pushHistory(nodes, edges);

        const newNode: Node = {
            id: `node-${Date.now()}`,
            type: "default",
            position: { x: 250, y: 250 },
            data: { label },
            style: {
                width: 240,
                backgroundColor: "#ffffff",
                borderColor: "#e2e8f0",
                borderRadius: "8px",
                padding: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                color: "#1e293b",
                fontWeight: "500",
                fontSize: "14px"
            }
        };
        setNodes((nds) => [...nds, newNode]);
        return newNode;
    };

    const handleUndo = () => {
        const prevState = undo();
        if (prevState) {
            setNodes(prevState.nodes);
            setEdges(prevState.edges);
        }
    };

    const handleRedo = () => {
        const nextState = redo();
        if (nextState) {
            setNodes(nextState.nodes);
            setEdges(nextState.edges);
        }
    };

    const handleNodeClick = (node: Node | null) => {
        if (node) {
            setSelectedNodeId(node.id);
        } else {
            setSelectedNodeId(null);
            setSuggestionPos(null);
        }
    };

    const toggleSuggestionMenu = (e: React.MouseEvent | { clientX: number, clientY: number }) => {
        if (e && 'preventDefault' in e && typeof e.preventDefault === 'function') {
            e.preventDefault();
            e.stopPropagation();
        }
        setSuggestionPos({ x: ('clientX' in e ? e.clientX : 500), y: ('clientY' in e ? e.clientY : 300) });
    };

    const handleActionSelect = (actionLabel: string) => {
        // Handle "Delete Node" specially
        if (actionLabel === "Delete Node" && selectedNodeId) {
            setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
            setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
            setSelectedNodeId(null); // Clear selection
            setSuggestionPos(null);
            return;
        }

        const newNode = handleAddNode(actionLabel);
        if (selectedNodeId) {
            const parentNode = nodes.find(n => n.id === selectedNodeId);
            if (parentNode) {
                newNode.position = {
                    x: parentNode.position.x + 300,
                    y: parentNode.position.y
                };
            }
            const newEdge: Edge = {
                id: `edge-${selectedNodeId}-${newNode.id}`,
                source: selectedNodeId,
                target: newNode.id,
                animated: true,
                style: { stroke: '#cbd5e1', strokeWidth: 2 }
            };
            setEdges((eds) => [...eds, newEdge]);
            setSelectedNodeId(newNode.id);
        }
        setNodes((nds) => nds.map(n => n.id === newNode.id ? newNode : n));
        setSuggestionPos(null);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // Convert to Base64
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                console.log("Image uploaded, sending to Gemini...");

                const flowData = await generateFlowFromImage(base64);
                if (flowData && flowData.nodes && flowData.edges) {
                    setNodes(flowData.nodes);
                    setEdges(flowData.edges);
                    if (reactFlowInstance) {
                        setTimeout(() => reactFlowInstance.fitView(), 500);
                    }
                } else {
                    alert("Could not generate flow from image. Try a clearer image.");
                }
                setIsUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error(error);
            setIsUploading(false);
            alert("Upload failed.");
        }
    };

    return (
        <div className="flex flex-col h-screen w-full bg-white text-slate-900 font-sans">

            {/* ---------------- GLOBAL HEADER ---------------- */}
            <header className="h-16 px-6 border-b border-gray-100 flex items-center justify-between bg-white/90 backdrop-blur-md z-50 sticky top-0">
                {/* 1. BRAND */}
                <div className="flex flex-col w-48">
                    <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        AvatarFlowX
                        <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] uppercase font-bold tracking-wider">Builder</span>
                    </h1>
                </div>

                {/* 2. CENTER NAVIGATION */}
                <div className="flex items-center p-1 bg-slate-100/50 rounded-xl border border-slate-200/60">
                    <Link href="/visual-builder">
                        <button className="px-4 py-1.5 text-sm font-medium text-slate-700 rounded-lg hover:bg-white hover:shadow-sm transition-all flex items-center gap-2">
                            <Wand2 className="w-3.5 h-3.5" />
                            Visual
                        </button>
                    </Link>
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    <Link href="/ai-builder">
                        <button className="px-4 py-1.5 text-sm font-medium text-slate-700 rounded-lg hover:bg-white hover:shadow-sm transition-all flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5" />
                            AI Architect
                        </button>
                    </Link>
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    <Link href="/interview">
                        <button className="px-4 py-1.5 text-sm font-medium text-pink-700 bg-pink-50/50 rounded-lg hover:bg-white hover:shadow-sm transition-all flex items-center gap-2">
                            <Bot className="w-3.5 h-3.5" />
                            Avatar Studio
                        </button>
                    </Link>
                </div>

                {/* 3. ACTIONS TOOLBAR */}
                <div className="flex items-center gap-3 w-48 justify-end">
                    {/* History Group */}
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                        <button
                            onClick={handleUndo}
                            disabled={!canUndo}
                            title="Undo (Ctrl+Z)"
                            className="p-2 hover:bg-white rounded-md transition-all disabled:opacity-30"
                        >
                            <Undo className="w-4 h-4 text-slate-600" />
                        </button>
                        <div className="w-px h-3 bg-slate-300 mx-0.5"></div>
                        <button
                            onClick={handleRedo}
                            disabled={!canRedo}
                            title="Redo (Ctrl+Shift+Z)"
                            className="p-2 hover:bg-white rounded-md transition-all disabled:opacity-30"
                        >
                            <Redo className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>

                    <div className="h-6 w-px bg-slate-200"></div>

                    {/* Toggle Preview */}
                    <button
                        onClick={() => setActiveRightTab(activeRightTab === 'preview' ? 'database' : 'preview')}
                        className={`p-2 rounded-lg transition-colors border ${activeRightTab === 'database'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'
                            }`}
                        title={activeRightTab === 'database' ? 'Show Preview' : 'Show Database'}
                    >
                        <Monitor className="w-4 h-4" />
                    </button>

                    {/* Primary Action */}
                    <button
                        onClick={async () => {
                            // ... (existing logic)
                            try {
                                setIsGenerating(true);
                                setActiveRightTab('preview');
                                const toonData = toTOON(nodes, edges);
                                const code = await generateAppBoilerplate(toonData);
                                setGeneratedCode(code);
                                setIsGenerating(false);
                            } catch (e) {
                                setIsGenerating(false);
                                alert("Failed.");
                            }
                        }}
                        disabled={isGenerating}
                        className="px-4 py-2 text-sm font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                        {isGenerating ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                        Run
                    </button>
                </div>
            </header>

            {/* ---------------- MAIN CONTENT ---------------- */}
            <div className="flex-1 overflow-hidden">
                {!mounted ? (
                    <div className="flex items-center justify-center h-full bg-slate-50">
                        <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                    </div>
                ) : (
                    <PanelGroup direction="horizontal">
                        {/* ---------------- LEFT SIDEBAR ---------------- */}
                        <Panel defaultSize={28} minSize={15} maxSize={35} className="flex flex-col bg-gradient-to-b from-slate-50 to-white border-r border-slate-200">
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

                                {/* Flow Builder Intro */}
                                <div className="mb-8 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100 shadow-sm">
                                    <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                                        </svg>
                                        Workflow Builder
                                    </h2>
                                    <p className="text-sm text-slate-600 leading-relaxed">Select components to build your app logic.</p>
                                </div>

                                {/* Common Workflows - Accordion Style */}
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-2">Common Workflows</h3>
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                                    </div>
                                    <div className="space-y-2">
                                        {[
                                            {
                                                category: "Portfolio & Business",
                                                icon: "💼",
                                                workflows: [
                                                    { label: "Portfolio Website", prompt: "Create a detailed flowchart for a modern Portfolio website with a Hero section, About Me, Project Gallery (grid), and Contact Form." },
                                                    { label: "Company Website", prompt: "Build a corporate website flowchart with Navbar, Hero Banner, Services Section (3 columns), Team Grid, and Contact Page." },
                                                    { label: "Personal Blog", prompt: "Design a blog flowchart with Header, Blog Post List (cards), Individual Post View with comments, and Sidebar with categories." },
                                                    { label: "Agency Landing Page", prompt: "Create an agency landing page with Sticky Nav, Hero CTA, Case Studies carousel, Client Logos, and Footer with links." },
                                                    { label: "Consulting Site", prompt: "Build a consultant website with Service Offerings, Testimonial Section, Booking Calendar, and Lead Capture Form." }
                                                ]
                                            },
                                            {
                                                category: "E-commerce & Retail",
                                                icon: "🛒",
                                                workflows: [
                                                    { label: "E-commerce Store", prompt: "Generate an E-commerce flowchart: Product Listing Page with filters → Product Details → Shopping Cart → Checkout." },
                                                    { label: "Product Catalog", prompt: "Create a product catalog with Grid/List toggle, Category Navigation, Search/Filter, and Quick View modals." },
                                                    { label: "Checkout Flow", prompt: "Design a multi-step checkout: Cart Review → Shipping Info → Payment → Order Confirmation with email." },
                                                    { label: "Marketplace", prompt: "Build a marketplace flowchart with Vendor Listings, Product Search, Reviews/Ratings, and Seller Dashboard." },
                                                    { label: "Digital Store", prompt: "Create a digital products store with Instant Downloads, License Keys, Purchase History, and File Management." }
                                                ]
                                            },
                                            {
                                                category: "SaaS & Dashboards",
                                                icon: "📊",
                                                workflows: [
                                                    { label: "SaaS Dashboard", prompt: "Build a flowchart for a comprehensive SaaS Dashboard with a sidebar, top metrics cards, revenue chart, and recent activity table." },
                                                    { label: "Analytics Dashboard", prompt: "Create an analytics dashboard with Real-time Stats, Line/Bar Charts, Data Tables, and Export functionality." },
                                                    { label: "Admin Panel", prompt: "Design an admin panel with User Management Table, Settings Pages, Activity Logs, and Notification Center." },
                                                    { label: "Project Dashboard", prompt: "Build a project management dashboard with Task Overview, Team Members, Progress Charts, and Calendar View." },
                                                    { label: "CRM Dashboard", prompt: "Create a CRM dashboard with Sales Pipeline, Contact List, Deal Tracker, and Performance Metrics." }
                                                ]
                                            },
                                            {
                                                category: "Social & Community",
                                                icon: "👥",
                                                workflows: [
                                                    { label: "Social Media Feed", prompt: "Design a flowchart for a social media feed with a 'Post Input' area, infinite scroll stream of posts (avatar + content), and a right sidebar for trends." },
                                                    { label: "Community Forum", prompt: "Create a forum with Thread List, Post Detail View, Reply System, User Profiles, and Moderation Tools." },
                                                    { label: "Chat Application", prompt: "Build a real-time chat app with Contacts List, Message Threads, Typing Indicators, and File Sharing." },
                                                    { label: "Event Platform", prompt: "Design an events platform with Calendar View, Event Details, RSVP System, and Attendee List." },
                                                    { label: "Membership Site", prompt: "Create a membership site with Login Wall, Member Directory, Content Library, and Discussion Boards." }
                                                ]
                                            },
                                            {
                                                category: "Productivity & Tools",
                                                icon: "⚡",
                                                workflows: [
                                                    { label: "Task Manager (Kanban)", prompt: "Create a flowchart for a Kanban-style Task Manager with columns for 'To Do', 'In Progress', and 'Done', including drag-and-drop visuals." },
                                                    { label: "Note Taking App", prompt: "Build a notes app with Sidebar Navigation, Rich Text Editor, Search, Tags, and Cloud Sync indicator." },
                                                    { label: "Calendar & Scheduling", prompt: "Design a calendar app with Month/Week/Day views, Event Creation Modal, Reminders, and Google Calendar Sync." },
                                                    { label: "Document Manager", prompt: "Create a document manager with Folder Tree, File Grid/List, Upload Area, Preview Panel, and Version History." },
                                                    { label: "Time Tracker", prompt: "Build a time tracking app with Timer Widget, Project Selection, Activity Log, Reports, and Billing Integration." }
                                                ]
                                            },
                                            {
                                                category: "Authentication & Onboarding",
                                                icon: "🔐",
                                                workflows: [
                                                    { label: "Login & Auth Flow", prompt: "Build a secure Authentication flowchart: Login Screen with social buttons → Forgot Password → Two-Factor Verification." },
                                                    { label: "Signup & Onboarding", prompt: "Create a multi-step signup: Email/Password → Profile Setup → Preferences → Welcome Tour with tooltips." },
                                                    { label: "User Profile", prompt: "Design a user profile page with Avatar Upload, Bio Editor, Account Settings, Privacy Controls, and Activity History." },
                                                    { label: "Password Reset", prompt: "Build password reset flow: Email Input → Verification Code → New Password → Success Confirmation." },
                                                    { label: "Social Login", prompt: "Create social auth integration with Google/Facebook/GitHub buttons, Account Linking, and Permission Requests." }
                                                ]
                                            },
                                            {
                                                category: "Marketing & Landing Pages",
                                                icon: "🚀",
                                                workflows: [
                                                    { label: "Landing Page (Startup)", prompt: "Create a high-conversion Startup Landing Page flowchart with: Sticky Navbar, Value Prop Hero, Feature Grid, Testimonials, and Pricing Table." },
                                                    { label: "Product Launch", prompt: "Build a product launch page with Countdown Timer, Pre-order Form, Feature Showcase, and Email Signup." },
                                                    { label: "Lead Generation", prompt: "Design a lead gen page with Hero Form, Benefits List, Social Proof, FAQ Section, and Thank You Modal." },
                                                    { label: "Webinar Registration", prompt: "Create webinar signup with Speaker Bio, Agenda, Registration Form, Calendar Add, and Confirmation Email." },
                                                    { label: "App Download Page", prompt: "Build an app landing page with Screenshots Carousel, Features Grid, App Store Badges, and Reviews Section." }
                                                ]
                                            },
                                            {
                                                category: "AI & Chat Interfaces",
                                                icon: "🤖",
                                                workflows: [
                                                    { label: "AI Chat Interface", prompt: "Design a flowchart for a ChatGPT-style AI interface with a left sidebar for history and a main chat area with input box and message bubbles." },
                                                    { label: "Chatbot Widget", prompt: "Create an embedded chatbot with Floating Button, Chat Window, Quick Replies, and Human Handoff option." },
                                                    { label: "AI Assistant Dashboard", prompt: "Build an AI assistant dashboard with Conversation History, Model Settings, Prompt Templates, and Usage Analytics." },
                                                    { label: "Voice Chat App", prompt: "Design a voice chat interface with Recording Button, Waveform Visualization, Transcript Display, and Voice Settings." },
                                                    { label: "AI Content Generator", prompt: "Create a content generator with Input Form, Generation Options, Preview Panel, Export Buttons, and History Log." }
                                                ]
                                            }
                                        ].map((group, groupIndex) => (
                                            <div key={groupIndex} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-all">
                                                {/* Category Header - Clickable */}
                                                <button
                                                    onClick={() => setExpandedWorkflow(expandedWorkflow === group.category ? null : group.category)}
                                                    className={`w-full flex items-center justify-between p-4 transition-all ${expandedWorkflow === group.category
                                                        ? 'bg-gradient-to-r from-purple-50 to-indigo-50'
                                                        : 'hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shadow-sm transition-all ${expandedWorkflow === group.category
                                                            ? 'bg-gradient-to-br from-purple-500 to-indigo-500 scale-110'
                                                            : 'bg-gradient-to-br from-slate-100 to-slate-200'
                                                            }`}>
                                                            {group.icon}
                                                        </div>
                                                        <span className={`font-semibold text-sm transition-colors ${expandedWorkflow === group.category ? 'text-purple-700' : 'text-slate-700'
                                                            }`}>{group.category}</span>
                                                    </div>
                                                    {expandedWorkflow === group.category ? (
                                                        <ChevronDown className="w-4 h-4 text-purple-500" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                                    )}
                                                </button>

                                                {/* Workflows - Shown when expanded */}
                                                {expandedWorkflow === group.category && (
                                                    <div className="border-t border-slate-200 p-3 space-y-2 bg-gradient-to-b from-slate-50/50 to-white">
                                                        {group.workflows.map((item, i) => (
                                                            <button
                                                                key={i}
                                                                onClick={() => {
                                                                    setPendingChatMsg(item.prompt);
                                                                    setTimeout(() => setPendingChatMsg(null), 500);
                                                                }}
                                                                className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700 hover:border-indigo-300 transition-all group shadow-sm hover:shadow-md"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <span>{item.label}</span>
                                                                    <svg className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                    </svg>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>


                                {/* Tip */}
                                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 text-xs text-yellow-700 leading-relaxed">
                                    <strong>Tip:</strong> Double-click nodes to add specifications like "Use red buttons" or "Dark mode".
                                </div>
                            </div>

                            {/* AI Chat Layout Adjustment */}
                            <div className="border-t border-gray-100 h-[350px]">
                                <AIChatPanel
                                    onApplyFlow={(newNodes, newEdges) => {
                                        // 1. Normalize Coordinates: Shift top-left-most node to (100, 100)
                                        // This prevents the AI from generating nodes at (10000, 10000) or negative space
                                        if (newNodes.length > 0) {
                                            const minX = Math.min(...newNodes.map(n => n.position.x));
                                            const minY = Math.min(...newNodes.map(n => n.position.y));

                                            const shiftedNodes = newNodes.map(n => ({
                                                ...n,
                                                position: {
                                                    x: n.position.x - minX + 100,
                                                    y: n.position.y - minY + 100
                                                }
                                            }));

                                            setNodes(shiftedNodes);
                                        } else {
                                            setNodes(newNodes);
                                        }

                                        setEdges(newEdges);

                                        // 2. Force Fit View
                                        if (reactFlowInstance) {
                                            // Small delay to allow React Render cycle to complete
                                            setTimeout(() => {
                                                reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
                                            }, 200);
                                        }
                                    }}
                                    forceMessage={pendingChatMsg}
                                />
                            </div>
                        </Panel>

                        <PanelResizeHandle className="bg-transparent w-4 -ml-2 z-50 hover:bg-transparent flex items-center justify-center group outline-none">
                            <div className="w-[1px] h-8 bg-gray-200 group-hover:bg-indigo-400 transition-colors rounded-full" />
                        </PanelResizeHandle>

                        {/* ---------------- CENTER CANVAS ---------------- */}
                        <Panel defaultSize={55} minSize={30} className="bg-slate-50/50 relative flex flex-col">
                            <div className="m-4 flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
                                <div
                                    className="w-full h-full"
                                    onContextMenu={(e) => { e.preventDefault(); setSuggestionPos({ x: e.clientX, y: e.clientY }); }}
                                >
                                    <FlowCanvas
                                        nodes={nodes}
                                        edges={edges}
                                        setNodes={setNodes}
                                        setEdges={setEdges}
                                        onSelectNode={(n) => handleNodeClick(n as Node)}
                                        onNodeEdit={(node) => {
                                            setEditNode(node);
                                            setModalOpen(true);
                                        }}
                                        onAddSuggestion={toggleSuggestionMenu}
                                        onInit={(instance) => setReactFlowInstance(instance)}
                                    />

                                    <SuggestionMenu
                                        position={suggestionPos}
                                        onClose={() => setSuggestionPos(null)}
                                        onSelect={handleActionSelect}
                                        context={selectedNodeId ? nodes.find(n => n.id === selectedNodeId)?.data.label : ""}
                                    />

                                    {/* Floating Action Button */}
                                    <div className="absolute top-6 left-6 z-10">
                                        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-lg text-xs font-medium text-slate-600 flex items-center gap-2">
                                            <Plus className="w-3 h-3 text-indigo-500" />
                                            Right-click to add nodes
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Panel>

                        <PanelResizeHandle className="bg-transparent w-4 -ml-2 z-50 hover:bg-transparent flex items-center justify-center group outline-none">
                            <div className="w-[1px] h-8 bg-gray-200 group-hover:bg-indigo-400 transition-colors rounded-full" />
                        </PanelResizeHandle>

                        {/* ---------------- RIGHT PREVIEW ---------------- */}
                        <Panel defaultSize={35} minSize={25} maxSize={60} className="flex flex-col bg-slate-50/50 p-6">
                            <div className="mb-6 flex justify-between items-center">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 mb-1">
                                        {activeRightTab === 'database' ? 'Local Database' : 'Live Preview'}
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        {activeRightTab === 'database'
                                            ? 'Inspect SQLite data'
                                            : 'Generated UI updates instantly.'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full w-full">
                                <div className="flex-1 overflow-hidden relative h-full w-full">
                                    {activeRightTab === 'database' ? (
                                        <DatabaseViewer />
                                    ) : (
                                        <PreviewPane code={generatedCode || undefined} isGenerating={isGenerating} tokenStats={tokenStats} />
                                    )}
                                </div>
                            </div>
                        </Panel>

                    </PanelGroup>
                )}
            </div>

            {/* ---------------- MODALS ---------------- */}
            <NodeEditorModal
                open={modalOpen}
                node={editNode}
                onClose={() => setModalOpen(false)}
                onDelete={(id) => {
                    setNodes((nds) => nds.filter((n) => n.id !== id));
                    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
                    setModalOpen(false);
                }}
                onSave={(updated) => {
                    if (!editNode) return;
                    setNodes((prev) =>
                        prev.map((n) =>
                            n.id === editNode.id ? { ...n, data: { ...n.data, ...updated } } : n
                        )
                    );
                    setModalOpen(false);
                }}
            />
        </div>
    );
}
