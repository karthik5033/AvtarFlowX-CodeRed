"use client";

import React, { useState, useEffect } from "react";
import { Node, Edge, ReactFlowInstance } from "reactflow";
import { Play, Search, Settings, ChevronRight, ChevronDown, Monitor, Smartphone, Maximize2, Plus, Undo, Redo, Wand2, Sparkles, X, ArrowRight } from "lucide-react";
import Link from "next/link";

import FlowCanvas from "./FlowCanvas";
import NodeEditorModal from "./NodeEditorModal";
import PreviewPane from "./PreviewPane";
import SuggestionMenu from "./SuggestionMenu";
import AIChatPanel from "./AIChatPanel";
import dagre from "dagre";

import { toTOON } from "../../utils/toon";
import { generateAppBoilerplate, generateFlowFromImage } from "../../app/actions/ai";
import { PanelResizeHandle, Panel, PanelGroup, ImperativePanelHandle } from "react-resizable-panels";
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

const WORKFLOW_CATEGORIES = [
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
];

function layoutFlowBalanced(nodes: Node[], edges: Edge[]): Node[] {
    if (!nodes || nodes.length === 0) return [];
    if (nodes.length === 1) {
        return [{ ...nodes[0], position: { x: 300, y: 150 } }];
    }

    // 1. Build adjacency and in-degree maps
    const nodeMap = new Map<string, Node>();
    const outgoing = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    nodes.forEach((n) => {
        nodeMap.set(n.id, n);
        outgoing.set(n.id, []);
        inDegree.set(n.id, 0);
    });

    edges.forEach((e) => {
        if (outgoing.has(e.source) && inDegree.has(e.target)) {
            outgoing.get(e.source)!.push(e.target);
            inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
        }
    });

    // 2. Order nodes using topological BFS
    const queue: string[] = [];
    inDegree.forEach((deg, id) => {
        if (deg === 0) queue.push(id);
    });

    if (queue.length === 0 && nodes.length > 0) {
        queue.push(nodes[0].id);
    }

    const orderedIds: string[] = [];
    const visited = new Set<string>();

    while (queue.length > 0) {
        const curr = queue.shift()!;
        if (visited.has(curr)) continue;
        visited.add(curr);
        orderedIds.push(curr);

        const children = outgoing.get(curr) || [];
        children.forEach((child) => {
            if (!visited.has(child)) {
                queue.push(child);
            }
        });
    }

    // Add any unconnected/remaining nodes
    nodes.forEach((n) => {
        if (!visited.has(n.id)) {
            orderedIds.push(n.id);
            visited.add(n.id);
        }
    });

    // 3. Compute optimal number of columns to balance width and height equally
    const n = orderedIds.length;
    let cols = 3;
    if (n <= 2) cols = n;
    else if (n <= 4) cols = 2;
    else if (n <= 6) cols = 3;
    else if (n <= 9) cols = 3;
    else if (n <= 12) cols = 4;
    else cols = Math.max(3, Math.min(5, Math.ceil(Math.sqrt(n * 1.3))));

    const colWidth = 420; // 300px node width + 120px gap
    const rowHeight = 280; // ~180px node height + 100px gap
    const startX = 120;
    const startY = 100;

    return orderedIds.map((id, index) => {
        const node = nodeMap.get(id)!;
        const row = Math.floor(index / cols);
        const colInRow = index % cols;
        // Serpentine S-Curve (even rows left->right, odd rows right->left)
        const col = (row % 2 === 0) ? colInRow : (cols - 1 - colInRow);

        const x = startX + col * colWidth;
        const y = startY + row * rowHeight;

        return {
            ...node,
            position: { x, y }
        };
    });
}

export default function EditorShell() {
    /* 🔹 UI State */
    const [isGenerating, setIsGenerating] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [generatedCode, setGeneratedCode] = useState<string | undefined>(undefined);
    const [pendingChatMsg, setPendingChatMsg] = useState<string | null>(null);
    const [tokenStats, setTokenStats] = useState<{ jsonSize: number; toonSize: number; savedPercent: number } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [activeRightTab, setActiveRightTab] = useState<'preview' | 'database'>('preview');
    const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);

    // File Input Ref
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Panel Refs for layout toggle
    const leftPanelRef = React.useRef<ImperativePanelHandle>(null);
    const rightPanelRef = React.useRef<ImperativePanelHandle>(null);

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
            data: { label: "Input Node (Form)" }
        },
        {
            id: "ai-logic",
            type: "default",
            position: { x: 400, y: 100 },
            data: { label: "AI Logic Node" }
        },
        {
            id: "output-node",
            type: "default",
            position: { x: 700, y: 100 },
            data: { label: "Output Node (Result)" }
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
            data: { label }
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
        <div className="flex flex-col h-screen w-full bg-background text-foreground font-sans">

            {/* ---------------- GLOBAL HEADER ---------------- */}
            <header className="h-16 px-6 border-b border-border flex items-center justify-between bg-background/90 backdrop-blur-md z-50 sticky top-0">
                {/* 1. BRAND */}
                <div className="flex flex-col w-48">
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
                        AvatarFlowX
                        <span className="px-1.5 py-0.5 rounded-md bg-primary/20 text-primary text-[10px] uppercase font-bold tracking-wider">Builder</span>
                    </h1>
                </div>

                {/* 2. CENTER NAVIGATION */}
                <div className="flex items-center p-1 bg-muted/50 rounded-xl border border-border">
                    <Link href="/visual-builder">
                        <button className="px-4 py-1.5 text-sm font-medium text-muted-foreground rounded-lg hover:bg-background hover:text-foreground hover:shadow-sm transition-all flex items-center gap-2">
                            <Wand2 className="w-3.5 h-3.5" />
                            Visual
                        </button>
                    </Link>
                    <div className="w-px h-4 bg-border mx-1"></div>
                    <Link href="/ai-builder">
                        <button className="px-4 py-1.5 text-sm font-medium text-muted-foreground rounded-lg hover:bg-background hover:text-foreground hover:shadow-sm transition-all flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5" />
                            AI Architect
                        </button>
                    </Link>
                </div>

                {/* 3. ACTIONS TOOLBAR */}
                <div className="flex items-center gap-3 w-48 justify-end">
                    {/* History Group */}
                    <div className="flex items-center bg-muted/30 border border-border rounded-lg p-0.5">
                        <button
                            onClick={handleUndo}
                            disabled={!canUndo}
                            title="Undo (Ctrl+Z)"
                            className="p-2 hover:bg-background rounded-md transition-all disabled:opacity-30"
                        >
                            <Undo className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <div className="w-px h-3 bg-border mx-0.5"></div>
                        <button
                            onClick={handleRedo}
                            disabled={!canRedo}
                            title="Redo (Ctrl+Shift+Z)"
                            className="p-2 hover:bg-background rounded-md transition-all disabled:opacity-30"
                        >
                            <Redo className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>

                    <div className="h-6 w-px bg-border"></div>

                    {/* Toggle Left Sidebar */}
                    <button
                        onClick={() => {
                            if (leftPanelRef.current?.isExpanded()) {
                                leftPanelRef.current?.collapse();
                            } else {
                                leftPanelRef.current?.expand();
                            }
                        }}
                        className="p-2 rounded-lg transition-colors border text-muted-foreground hover:text-foreground hover:bg-muted border-transparent"
                        title="Toggle Sidebar"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                    </button>

                    {/* Toggle Preview */}
                    <button
                        onClick={() => {
                            if (activeRightTab !== 'preview') setActiveRightTab('preview');
                            if (!rightPanelRef.current?.isExpanded()) {
                                rightPanelRef.current?.expand(50);
                            } else if (activeRightTab === 'preview') {
                                rightPanelRef.current?.collapse();
                            }
                        }}
                        className={`p-2 rounded-lg transition-colors border ${activeRightTab === 'database'
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted border-transparent'
                            }`}
                        title="Toggle Preview"
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
                                // Collapse left, expand right generously to 50% width
                                leftPanelRef.current?.collapse();
                                rightPanelRef.current?.expand(50);
                                
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
                        className="px-4 py-2 text-sm font-bold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                        {isGenerating ? <div className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                        Run
                    </button>
                </div>
            </header>

            {/* ---------------- MAIN CONTENT ---------------- */}
            <div className="flex-1 overflow-hidden">
                {!mounted ? (
                    <div className="flex items-center justify-center h-full bg-background">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                ) : (
                    <PanelGroup direction="horizontal">
                        {/* ---------------- LEFT SIDEBAR ---------------- */}
                        <Panel ref={leftPanelRef} defaultSize={32} minSize={20} maxSize={45} collapsible={true} className="flex flex-col bg-muted/10 border-r border-border">
                            <div className="flex-1 flex flex-col overflow-hidden h-full">
                                <AIChatPanel
                                    onOpenTemplates={() => setShowTemplates(true)}
                                    onApplyFlow={(newNodes, newEdges) => {
                                        // Auto Layout with Balanced 2D Spread (Equal Horizontal & Vertical)
                                        if (newNodes.length > 0) {
                                            const layoutedNodes = layoutFlowBalanced(newNodes, newEdges);
                                            setNodes(layoutedNodes);
                                        } else {
                                            setNodes(newNodes);
                                        }

                                        setEdges(newEdges);

                                        // 2. Force Fit View
                                        if (reactFlowInstance) {
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
                            <div className="w-[1px] h-8 bg-border group-hover:bg-primary transition-colors rounded-full" />
                        </PanelResizeHandle>

                        {/* ---------------- CENTER CANVAS ---------------- */}
                        <Panel defaultSize={68} minSize={30} className="bg-muted/10 relative flex flex-col">
                            {showTemplates && (
                                <div className="absolute top-4 left-4 bottom-4 z-50 flex items-stretch gap-3 pointer-events-none">
                                    {/* Pane 1: Workflow Categories */}
                                    <div className="w-[300px] shadow-2xl bg-background border border-border rounded-xl flex flex-col overflow-hidden animate-in slide-in-from-left-8 fade-in pointer-events-auto">
                                        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                                            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-primary" />
                                                Workflow Builder
                                            </h2>
                                            <button
                                                onClick={() => {
                                                    setShowTemplates(false);
                                                    setExpandedWorkflow(null);
                                                }}
                                                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                title="Close"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="p-3 bg-muted/20 border-b border-border text-xs text-muted-foreground font-medium">
                                            Select a category to view workflow ideas
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                            {WORKFLOW_CATEGORIES.map((group) => {
                                                const isSelected = expandedWorkflow === group.category;
                                                return (
                                                    <button
                                                        key={group.category}
                                                        onClick={() => setExpandedWorkflow(isSelected ? null : group.category)}
                                                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left group ${
                                                            isSelected
                                                                ? 'bg-primary/10 border-primary shadow-sm text-primary ring-1 ring-primary/30'
                                                                : 'bg-card border-border hover:border-primary/40 hover:bg-muted/40 text-foreground'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all ${
                                                                isSelected ? 'bg-primary text-primary-foreground scale-105' : 'bg-muted'
                                                            }`}>
                                                                {group.icon}
                                                            </div>
                                                            <span className="font-semibold text-xs sm:text-sm">{group.category}</span>
                                                        </div>
                                                        <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-primary translate-x-1' : 'text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5'}`} />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Pane 2: Ideas for selected category (opens to the right of Pane 1) */}
                                    {expandedWorkflow && (
                                        <div className="w-[360px] shadow-2xl bg-background border border-border rounded-xl flex flex-col overflow-hidden animate-in slide-in-from-left-4 fade-in pointer-events-auto">
                                            {(() => {
                                                const currentGroup = WORKFLOW_CATEGORIES.find(g => g.category === expandedWorkflow);
                                                if (!currentGroup) return null;
                                                return (
                                                    <>
                                                        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                                                            <div className="flex items-center gap-2.5">
                                                                <span className="text-xl">{currentGroup.icon}</span>
                                                                <div>
                                                                    <h3 className="text-sm font-bold text-foreground leading-none">{currentGroup.category}</h3>
                                                                    <span className="text-[11px] text-muted-foreground font-medium">{currentGroup.workflows.length} workflow ideas</span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => setExpandedWorkflow(null)}
                                                                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                                title="Close ideas pane"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                        <div className="p-3 bg-muted/20 border-b border-border text-xs text-muted-foreground">
                                                            Click an idea to generate its flowchart prompt
                                                        </div>
                                                        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                                                            {currentGroup.workflows.map((item, i) => (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => {
                                                                        setPendingChatMsg(item.prompt);
                                                                        setTimeout(() => setPendingChatMsg(null), 500);
                                                                        setShowTemplates(false);
                                                                        setExpandedWorkflow(null);
                                                                    }}
                                                                    className="w-full text-left p-3.5 text-xs font-medium text-foreground bg-card border border-border rounded-lg hover:border-primary/60 hover:shadow-md transition-all group hover:bg-muted/20"
                                                                >
                                                                    <div className="flex items-center justify-between mb-1.5">
                                                                        <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{item.label}</span>
                                                                        <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                                                                    </div>
                                                                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{item.prompt}</p>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="m-4 flex-1 bg-background rounded-xl shadow-sm border border-border overflow-hidden relative">
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
                                        <div className="bg-background px-4 py-2 rounded-lg border border-border shadow-lg text-xs font-medium text-muted-foreground flex items-center gap-2">
                                            <Plus className="w-3 h-3 text-primary" />
                                            Right-click to add nodes
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Panel>

                        <PanelResizeHandle className="bg-transparent w-4 -ml-2 z-50 hover:bg-transparent flex items-center justify-center group outline-none">
                            <div className="w-[1px] h-8 bg-border group-hover:bg-primary transition-colors rounded-full" />
                        </PanelResizeHandle>

                        {/* ---------------- RIGHT PREVIEW ---------------- */}
                        <Panel ref={rightPanelRef} defaultSize={0} minSize={30} maxSize={75} collapsible={true} className="flex flex-col bg-muted/10 overflow-hidden">
                            <div className="flex flex-col h-full w-full p-6 overflow-hidden">
                                <div className="mb-6 flex justify-between items-center shrink-0">
                                <div>
                                    <h2 className="text-base font-bold mb-1">
                                        {activeRightTab === 'database' ? 'Local Database' : 'Live Preview'}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {activeRightTab === 'database'
                                            ? 'Inspect SQLite data'
                                            : 'Generated UI updates instantly.'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 bg-background rounded-2xl shadow-sm border border-border overflow-hidden flex flex-col h-full w-full">
                                <div className="flex-1 overflow-hidden relative h-full w-full">
                                    {activeRightTab === 'database' ? (
                                        <DatabaseViewer />
                                    ) : (
                                        <PreviewPane code={generatedCode || undefined} isGenerating={isGenerating} tokenStats={tokenStats} />
                                    )}
                                </div>
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
