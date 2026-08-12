'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Video, Loader2 } from 'lucide-react';

export default function InterviewPage() {
    // State
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [streamData, setStreamData] = useState<{ streamId: string; sessionId: string } | null>(null);
    const [error, setError] = useState<string | null>(null);



    // Audio & Interaction State
    const [isMuted, setIsMuted] = useState(true);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Helper to toggle mute
    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
        }
    };

    const suggestions = [
        { label: "Customer Support", prompt: "You are a friendly and patient customer support agent for this application. Use the provided Knowledge Base to help users troubleshoot specific issues found in the app data." },
        { label: "Website Guide", prompt: "You are a knowledgeable guide for this website. Use the Knowledge Base to answer visitor questions about services, pricing, and contact info." },
        { label: "Sales Rep", prompt: "You are a charismatic sales representative pitching this product. Use the features listed in the Knowledge Base to explain benefits persuasively." },
        { label: "Tech Interviewer", prompt: "You are a strict technical interviewer. Use the job requirements in the Knowledge Base to ask relevant coding questions." },
        { label: "Wellness Coach", prompt: "You are an empathetic wellness coach integrating with this health app. Use the user's health data (if provided) and Knowledge Base to offer advice." },
        { label: "Language Tutor", prompt: "You are a language tutor for this learning platform. Use the course curriculum in the Knowledge Base to guide the lesson." },
        { label: "Code Reviewer", prompt: "You are a senior developer reviewing code for this project. Use the project's style guide and Knowledge Base to suggest improvements." },
        { label: "Storyteller", prompt: "You are a creative storyteller. Weave narratives using the themes and lore found in the Knowledge Base." }
    ];

    // State for Tabs and Avatar Selection
    const [activeTab, setActiveTab] = useState<'appearance' | 'details' | 'knowledge' | 'settings'>('appearance');
    const [selectedAvatar, setSelectedAvatar] = useState('https://clips-presenters.d-id.com/amy/image.png');

    // Agent State
    const [systemPrompt, setSystemPrompt] = useState('');
    const [knowledgeBase, setKnowledgeBase] = useState('');
    const [creativity, setCreativity] = useState(0.7);
    const [integrationCode, setIntegrationCode] = useState<string | null>(null);

    const avtarFlowTitle = "Avatar Studio";

    const avatars = [
        { id: 'amy', name: 'Amy', url: 'https://clips-presenters.d-id.com/amy/image.png', type: 'Standard' },
        { id: 'matt', name: 'Matt', url: 'https://clips-presenters.d-id.com/matt/image.png', type: 'Standard' },
        { id: 'sarah', name: 'Sarah', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80', type: 'Premium' },
        { id: 'alex', name: 'Alex', url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80', type: 'Premium' },
        { id: 'jessica', name: 'Jessica', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=80', type: 'Premium' },
        { id: 'david', name: 'David', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80', type: 'Premium' },
        { id: 'emily', name: 'Emily', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=800&q=80', type: 'Premium' }
    ];

    // 1. Initialize Connection
    const startSession = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // A. Create Peer Connection
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            });
            peerConnectionRef.current = pc;

            // Handle Incoming Video Track
            pc.ontrack = (event) => {
                const stream = event.streams[0];
                if (!videoRef.current || !stream) return;

                console.log(`[WebRTC] Track received: ${event.track.kind}, StreamID: ${stream.id}`);

                if (videoRef.current.srcObject !== stream) {
                    console.log("[WebRTC] Assigning stream to video element");
                    videoRef.current.srcObject = stream;
                }

                if (event.track.kind === 'video') {
                    console.log("[WebRTC] Video track detected! muted=" + event.track.muted);

                    // Attempt auto-unmute handling
                    if (event.track.muted) {
                        event.track.onunmute = () => {
                            console.log("[WebRTC] Track unmuted, requesting play");
                            videoRef.current?.play().then(() => {
                                if (videoRef.current) {
                                    videoRef.current.muted = false;
                                    setIsMuted(false);
                                }
                            }).catch(e => console.error("Play/Unmute error:", e));
                        };
                    } else {
                        videoRef.current?.play().then(() => {
                            if (videoRef.current) {
                                videoRef.current.muted = false;
                                setIsMuted(false);
                            }
                        }).catch(e => console.log("Autoplay blocked, waiting for user interaction"));
                    }
                }
            };

            // Enhanced Debugging
            pc.onconnectionstatechange = () => {
                console.log("[WebRTC] Connection State:", pc.connectionState);
                if (pc.connectionState === 'failed') {
                    setError('Connection failed. Please refresh.');
                    stopSession();
                }
            };
            pc.oniceconnectionstatechange = () => {
                console.log("[WebRTC] ICE Connection State:", pc.iceConnectionState);
            };
            pc.onicegatheringstatechange = () => {
                console.log("[WebRTC] ICE Gathering State:", pc.iceGatheringState);
            };

            // B. Create Stream & Get Offer
            const createRes = await fetch('/api/did/create-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceUrl: selectedAvatar }) // Pass selected avatar
            });
            if (!createRes.ok) {
                const errData = await createRes.json().catch(() => ({}));
                throw new Error(errData.details || errData.error || 'Failed to create stream');
            }
            const { id: streamId, session_id: sessionId, offer, ice_servers } = await createRes.json();
            console.log("[CreateStream] Success:", { streamId, sessionId });

            // Handle undefined sessionId (D-ID often omits it for Streams) 
            // If it's undefined, we just store it as is, or an empty string if preferred, 
            // but keeping it undefined is cleaner for checks.
            setStreamData({ streamId, sessionId: sessionId || '' });

            // Update ICE servers if provided
            if (ice_servers && ice_servers.length > 0) {
                pc.setConfiguration({ iceServers: ice_servers });
            }

            // Setup ICE Handler
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log("[WebRTC] Found Candidate");
                    fetch('/api/did/ice', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            candidate: event.candidate.candidate,
                            sdpMid: event.candidate.sdpMid,
                            sdpMLineIndex: event.candidate.sdpMLineIndex,
                            streamId,
                            sessionId
                        })
                    });
                }
            };

            // C. Set Remote Description (Offer)
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            console.log("[WebRTC] Remote Description Set");

            // D. Create Answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log("[WebRTC] Local Description Set");

            // E. Send Answer to D-ID
            const startRes = await fetch('/api/did/start-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    streamId,
                    sessionId,
                    answer: answer,
                    sessionClientAnswer: answer
                })
            });

            if (!startRes.ok) throw new Error('Failed to start stream');
            console.log("[WebRTC] Stream Started (Answer Sent)");

            setIsConnected(true);

        } catch (err: any) {
            console.error('Connection failed:', err);
            setError(err.message || 'Failed to connect');
            stopSession();
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Audio Recording Logic
    const startRecording = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                throw new Error(isSecure
                    ? "Microphone access is not supported in this browser."
                    : "Microphone blocked: You are accessing via HTTP. Please use 'localhost' or HTTPS."
                );
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Detect supported mimeType
            const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
            const mediaRecorder = new MediaRecorder(stream, { mimeType });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: mimeType });
                await processAudio(audioBlob, mimeType);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Mic error:', err);
            setError('Could not access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const processAudio = async (audioBlob: Blob, mimeType: string | null) => {
        if (!streamData) return;
        setIsProcessing(true);

        try {
            const formData = new FormData();
            formData.append('audio', audioBlob); // Name must match backend
            if (mimeType) {
                formData.append('mimeType', mimeType); // Send correct type
            }
            formData.append('streamId', streamData.streamId);
            formData.append('sessionId', streamData.sessionId);
            formData.append('systemPrompt', systemPrompt); // Pass context
            formData.append('knowledgeBase', knowledgeBase); // Pass RAG context
            formData.append('creativity', creativity.toString()); // Pass temp

            const res = await fetch('/api/chat/process', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error("Audio Processing Error:", errData);
                throw new Error(errData.details || errData.error || 'Failed to process audio');
            }
            const data = await res.json();
            console.log('Gemini Response:', data.text);

        } catch (err) {
            console.error('Processing error:', err);
            setError('Failed to process speech');
        } finally {
            setIsProcessing(false);
        }
    };

    // 3. Cleanup
    const stopSession = () => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsConnected(false);
        setStreamData(null);
    };

    // Integration Code Gen
    const handleIntegrate = () => {
        // Mock Saving to "Database"
        console.log("Saving Avatar Profile:", { systemPrompt, knowledgeBase, creativity, selectedAvatar });

        // Mock generation of embed code with persistent ID
        const mockId = "av_" + Math.random().toString(36).substring(7);
        setIntegrationCode(`<script src="https://avatar-studio.com/embed/${mockId}" defer></script>
<!-- Profile Saved: ${new Date().toLocaleTimeString()} -->`);
    };

    useEffect(() => {
        return () => stopSession();
    }, []);

    return (
        <div className="flex flex-col bg-white text-zinc-900 min-h-screen font-sans">
            {/* Header */}
            <div className="border-b border-zinc-200 px-8 py-4 flex items-center justify-between bg-white z-20">
                <div className="flex items-center gap-2">
                    <div className="bg-purple-600 rounded-lg p-1.5">
                        <span className="text-white font-bold text-sm">AI</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-zinc-900">{avtarFlowTitle}</span>
                </div>
                <div className="flex gap-8 text-sm font-medium text-zinc-500">
                    <button onClick={() => setActiveTab('appearance')} className={`pb-1 border-b-2 transition-all ${activeTab === 'appearance' ? 'text-purple-600 border-purple-600' : 'border-transparent hover:text-zinc-800'}`}>Appearance</button>
                    <button onClick={() => setActiveTab('details')} className={`pb-1 border-b-2 transition-all ${activeTab === 'details' ? 'text-purple-600 border-purple-600' : 'border-transparent hover:text-zinc-800'}`}>Agent details</button>
                    <button onClick={() => setActiveTab('knowledge')} className={`pb-1 border-b-2 transition-all ${activeTab === 'knowledge' ? 'text-purple-600 border-purple-600' : 'border-transparent hover:text-zinc-800'}`}>Knowledge sources</button>
                    <button onClick={() => setActiveTab('settings')} className={`pb-1 border-b-2 transition-all ${activeTab === 'settings' ? 'text-purple-600 border-purple-600' : 'border-transparent hover:text-zinc-800'}`}>Chat settings</button>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleIntegrate}
                        disabled={!systemPrompt}
                        className="px-4 py-2 bg-zinc-900 text-white text-sm font-bold rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    >
                        Integrate
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel: Configuration */}
                <div className="w-2/3 bg-zinc-50 border-r border-zinc-200 p-8 overflow-y-auto">
                    {activeTab === 'appearance' && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h1 className="text-2xl font-bold text-zinc-900">Appearance</h1>
                                <div className="flex gap-2 bg-zinc-200 p-1 rounded-lg text-xs font-medium">
                                    <button className="px-3 py-1 bg-white shadow-sm rounded-md">All</button>
                                    <button className="px-3 py-1 text-zinc-500 hover:text-zinc-900">Premium</button>
                                    <button className="px-3 py-1 text-zinc-500 hover:text-zinc-900">Standard</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                <button className="aspect-square bg-white border border-zinc-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-purple-400 hover:shadow-md transition-all group">
                                    <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center group-hover:bg-purple-50">
                                        <span className="text-2xl text-zinc-400 group-hover:text-purple-500 font-light">+</span>
                                    </div>
                                    <span className="text-xs font-medium text-zinc-500 group-hover:text-purple-600">Create Avatar</span>
                                </button>

                                {avatars.map((avatar) => (
                                    <button
                                        key={avatar.id}
                                        onClick={() => setSelectedAvatar(avatar.url)}
                                        className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all group ${selectedAvatar === avatar.url ? 'border-purple-600 ring-2 ring-purple-100' : 'border-transparent hover:border-purple-300'}`}
                                    >
                                        <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-3">
                                            <span className="text-white font-medium text-sm">{avatar.name}</span>
                                            <span className="text-white/70 text-xs bg-black/20 backdrop-blur-md px-1.5 py-0.5 rounded w-fit mt-1">{avatar.type}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'details' && (
                        <div className="max-w-2xl">
                            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Agent Details</h1>
                            <p className="text-zinc-500 mb-6">Define your avatar's personality, role, and knowledge base.</p>

                            <div className="flex flex-col gap-6">
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-zinc-900">System Instructions</label>
                                    <textarea
                                        value={systemPrompt}
                                        onChange={(e) => setSystemPrompt(e.target.value)}
                                        className="w-full h-40 bg-white border border-zinc-300 rounded-xl p-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none shadow-sm"
                                        placeholder="E.g., You are a helpful sales assistant..."
                                    />
                                    <p className="text-xs text-zinc-400">Give your avatar a role and specific instructions on how to behave.</p>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-zinc-900">Quick Suggestions</label>
                                    <div className="flex flex-wrap gap-2">
                                        {suggestions.map((s, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setSystemPrompt(s.prompt)}
                                                className="px-3 py-1.5 bg-white border border-zinc-200 hover:border-purple-300 hover:bg-purple-50 text-xs text-zinc-600 rounded-full transition-all text-left shadow-sm"
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {integrationCode && (
                                    <div className="mt-4 p-4 bg-purple-50 border border-purple-100 rounded-xl">
                                        <h3 className="text-xs font-bold text-purple-900 uppercase tracking-widest mb-2">Integration Code</h3>
                                        <code className="block bg-white p-3 rounded-lg text-xs font-mono text-zinc-600 break-all border border-purple-100">
                                            {integrationCode}
                                        </code>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'knowledge' && (
                        <div className="max-w-2xl">
                            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Knowledge Base</h1>
                            <p className="text-zinc-500 mb-6">Provide context and facts for the avatar to reference.</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-semibold text-zinc-900 mb-2 block">Data Source (Text)</label>
                                    <textarea
                                        value={knowledgeBase}
                                        onChange={(e) => setKnowledgeBase(e.target.value)}
                                        className="w-full h-64 bg-white border border-zinc-300 rounded-xl p-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none shadow-sm font-mono"
                                        placeholder="Paste articles, FAQs, or product details here..."
                                    />
                                    <p className="text-xs text-zinc-400 mt-2">The avatar will use this information to answer user questions grounding its responses.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="max-w-2xl">
                            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Chat Settings</h1>
                            <p className="text-zinc-500 mb-6">Fine-tune the behavior and voice of your avatar.</p>

                            <div className="space-y-8">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-semibold text-zinc-900">Creativity (Temperature)</label>
                                        <span className="text-sm font-medium text-purple-600">{creativity}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="1" step="0.1"
                                        value={creativity}
                                        onChange={(e) => setCreativity(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                    />
                                    <div className="flex justify-between mt-1 text-xs text-zinc-400">
                                        <span>Precise</span>
                                        <span>Balanced</span>
                                        <span>Creative</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
                                    <h3 className="text-sm font-bold text-yellow-800 mb-1">Note</h3>
                                    <p className="text-xs text-yellow-700">Voice settings are currently managed automatically by D-ID based on the avatar selection.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel: Preview */}
                <div className="w-1/3 bg-white p-8 border-l border-zinc-200 flex flex-col items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
                    <div className="bg-white rounded-[2rem] shadow-2xl border-4 border-white ring-1 ring-zinc-200 w-full max-w-sm overflow-hidden flex flex-col h-[600px] relative">
                        {/* Status Bar Mockup */}
                        <div className="h-6 bg-zinc-900 w-full flex items-center justify-between px-4">
                            <div className="text-[10px] text-white font-medium">9:41</div>
                            <div className="flex gap-1">
                                <div className="w-3 h-3 bg-white/20 rounded-full"></div>
                                <div className="w-3 h-3 bg-white/20 rounded-full"></div>
                            </div>
                        </div>

                        {/* Video Area */}
                        <div className="flex-1 bg-zinc-100 relative overflow-hidden group">
                            {/* Video Element - Always rendered but managed via visibility/z-index */}
                            {/* Added 'controls' for debugging and manual playback */}
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted // Start muted for autoplay policy
                                controls // Allow user to scrub/replay/unmute manually
                                className={`w-full h-full object-cover transition-all duration-500 absolute inset-0 z-0 bg-black`}
                                onLoadedMetadata={() => {
                                    console.log(`[Video] Metadata loaded. Video size: ${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}`);
                                }}
                            />

                            {/* UNMUTE OVERLAY */}
                            {isConnected && !isLoading && (
                                <div className="absolute top-4 right-4 z-40 flex flex-col gap-2">
                                    <button
                                        onClick={toggleMute}
                                        className={`p-2 rounded-full backdrop-blur-sm transition-all ${isMuted ? 'bg-red-500/80 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}
                                        title={isMuted ? "Unmute Audio" : "Mute Audio"}
                                    >
                                        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                        <span className="sr-only">{isMuted ? "Unmute" : "Mute"}</span>
                                    </button>
                                </div>
                            )}

                            {error && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-30 p-4 text-center">
                                    <p className="text-red-400 text-xs font-medium mb-3">{error}</p>
                                    <button
                                        onClick={startSession}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs rounded-full transition-all border border-white/20"
                                    >
                                        Retry Connection
                                    </button>
                                </div>
                            )}

                            {!isConnected && !isLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/80 backdrop-blur-sm">
                                    <button
                                        onClick={startSession}
                                        className="px-6 py-3 bg-purple-600 text-white rounded-full font-bold hover:bg-purple-700 hover:scale-105 transition-all shadow-xl mb-4"
                                    >
                                        Preview Avatar
                                    </button>
                                    <p className="text-sm text-zinc-600 text-center px-8 font-medium">
                                        Tap to initialize WebRTC stream
                                    </p>
                                </div>
                            )}

                            {isLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-20 text-white">
                                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                    <p className="text-xs font-medium">Connecting...</p>
                                </div>
                            )}
                        </div>

                        {/* Chat Controls */}
                        <div className="h-24 bg-white border-t border-zinc-100 p-4 flex items-center gap-3">
                            {isConnected ? (
                                <>
                                    <button
                                        onMouseDown={startRecording}
                                        onMouseUp={stopRecording}
                                        onTouchStart={startRecording}
                                        onTouchEnd={stopRecording}
                                        disabled={isProcessing}
                                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 scale-110' : 'bg-purple-600 hover:bg-purple-700'}`}
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                                        ) : (
                                            <Mic className="w-5 h-5 text-white" />
                                        )}
                                    </button>
                                    <div className="flex-1">
                                        <div className="h-10 bg-zinc-100 rounded-full px-4 flex items-center text-sm text-zinc-400 cursor-not-allowed">
                                            {isRecording ? "Listening..." : "Hold mic to speak..."}
                                        </div>
                                    </div>
                                    <button
                                        onClick={stopSession}
                                        className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                                        title="End Session"
                                    >
                                        <div className="w-3 h-3 bg-current rounded-sm" />
                                    </button>
                                </>
                            ) : (
                                <div className="w-full text-center text-xs text-zinc-400 italic">
                                    Preview mode. Sound and face animations won't show until connected.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-sm font-bold text-zinc-900">Mobile Preview</p>
                        <p className="text-xs text-zinc-500">See how your agent looks on user devices</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
