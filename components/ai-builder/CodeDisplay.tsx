'use client';

import { useState } from 'react';
import { Code2, Download, Copy, Check, FileCode, FileJson, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FileData, ProjectStructure } from '@/types/ai-builder';
import JSZip from 'jszip';

interface CodeDisplayProps {
    files: FileData[];
    structure?: ProjectStructure;
    onCodeChange?: (fileIndex: number, newContent: string) => void;
    onExpandChange?: (isExpanded: boolean) => void;
}

export default function CodeDisplay({ files, structure, onCodeChange, onExpandChange }: CodeDisplayProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [activeFilePath, setActiveFilePath] = useState<string>('');
    const [copiedFile, setCopiedFile] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [isExpanded, setIsExpanded] = useState(false);

    if (!files || files.length === 0) return null;

    const activeFile = files.find(f => f.path === activeFilePath) || files[0];
    const activeFileIndex = files.findIndex(f => f.path === activeFilePath);

    const handleCopy = async (file: FileData) => {
        await navigator.clipboard.writeText(file.content);
        setCopiedFile(file.name);
        setTimeout(() => setCopiedFile(null), 2000);
    };

    const handleDownload = (file: FileData) => {
        const blob = new Blob([file.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadAll = async () => {
        const zip = new JSZip();

        // Add files with folder structure
        files.forEach(file => {
            zip.file(file.path, file.content);
        });

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'generated-project.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getLanguageFromType = (type: string) => {
        const langMap: Record<string, string> = {
            html: 'html',
            css: 'css',
            javascript: 'javascript',
            typescript: 'typescript',
            jsx: 'jsx',
            tsx: 'tsx',
            json: 'json',
            markdown: 'markdown',
            env: 'bash',
            text: 'text',
        };
        return langMap[type] || 'text';
    };

    const getFileIcon = (type: string) => {
        switch (type) {
            case 'html':
            case 'jsx':
            case 'tsx':
                return <FileCode className="w-4 h-4 text-blue-400" />;
            case 'css':
                return <FileCode className="w-4 h-4 text-primary" />;
            case 'javascript':
            case 'typescript':
                return <FileJson className="w-4 h-4 text-yellow-400" />;
            case 'json':
                return <FileJson className="w-4 h-4 text-green-400" />;
            default:
                return <FileCode className="w-4 h-4 text-gray-400" />;
        }
    };

    const toggleFolder = (path: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        setExpandedFolders(newExpanded);
    };

    const renderStructureNode = (node: ProjectStructure, depth: number = 0) => {
        const isExpanded = expandedFolders.has(node.path);
        const isActive = node.type === 'file' && node.path === activeFilePath;

        if (node.type === 'folder') {
            return (
                <div key={node.path}>
                    <button
                        onClick={() => toggleFolder(node.path)}
                        className="w-full flex items-center gap-2 px-2 py-1 hover:bg-neutral-800 rounded text-sm"
                        style={{ paddingLeft: `${depth * 12 + 8}px` }}
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-neutral-400" />
                        )}
                        {isExpanded ? (
                            <FolderOpen className="w-4 h-4 text-blue-400" />
                        ) : (
                            <Folder className="w-4 h-4 text-blue-400" />
                        )}
                        <span className="text-neutral-300">{node.name}</span>
                    </button>
                    {isExpanded && node.children && (
                        <div>
                            {node.children.map(child => renderStructureNode(child, depth + 1))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <button
                key={node.path}
                onClick={() => {
                    setActiveFilePath(node.path);
                    setIsEditing(false);
                }}
                className={`w-full flex items-center gap-2 px-2 py-1 hover:bg-neutral-800 rounded text-sm ${isActive ? 'bg-neutral-800' : ''
                    }`}
                style={{ paddingLeft: `${depth * 12 + 24}px` }}
            >
                {node.file && getFileIcon(node.file.type)}
                <span className={`${isActive ? 'text-white' : 'text-neutral-400'}`}>
                    {node.name}
                </span>
            </button>
        );
    };

    return (
        <div className="border-t border-neutral-200 dark:border-neutral-800">
            {/* Code Display - Always Visible */}
            {isVisible && (
                <div className="border-t border-neutral-200 dark:border-neutral-800 flex" style={{ height: '500px' }}>
                    {/* File Explorer Sidebar */}
                    {structure && (
                        <div className="w-64 bg-neutral-900 border-r border-neutral-800 overflow-y-auto">
                            <div className="p-2">
                                <div className="text-xs font-semibold text-neutral-500 uppercase mb-2 px-2">
                                    Project Files
                                </div>
                                {structure.children?.map(child => renderStructureNode(child, 0))}
                            </div>
                        </div>
                    )}

                    {/* Code Editor */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between p-3 bg-neutral-900 border-b border-neutral-800">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                {getFileIcon(activeFile.type)}
                                <span className="text-sm text-neutral-400 font-mono truncate">
                                    {activeFile.path}
                                </span>
                                {activeFile.size && (
                                    <span className="text-xs text-neutral-500 whitespace-nowrap">
                                        ({(activeFile.size / 1024).toFixed(1)} KB)
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-1 ml-2 flex-shrink-0">
                                {onCodeChange && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (isEditing) {
                                                onCodeChange(activeFileIndex, editedContent);
                                                setIsEditing(false);
                                            } else {
                                                setEditedContent(activeFile.content);
                                                setIsEditing(true);
                                            }
                                        }}
                                        className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 hover:border-neutral-600 text-white transition-all h-7 px-2"
                                        title={isEditing ? 'Save' : 'Edit'}
                                    >
                                        {isEditing ? '💾' : '✏️'}
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopy(activeFile)}
                                    className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 hover:border-neutral-600 text-white transition-all h-7 px-2"
                                    title="Copy code"
                                >
                                    {copiedFile === activeFile.name ? (
                                        <Check className="w-3 h-3 text-green-400" />
                                    ) : (
                                        <Copy className="w-3 h-3" />
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownload(activeFile)}
                                    className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 hover:border-neutral-600 text-white transition-all h-7 px-2"
                                    title="Download file"
                                >
                                    <Download className="w-3 h-3" />
                                </Button>
                                {files.length > 1 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadAll}
                                        className="bg-primary border-primary hover:bg-primary/90 hover:border-primary text-primary-foreground transition-all h-7 px-2"
                                        title="Download all files as ZIP"
                                    >
                                        📦
                                    </Button>
                                )}
                                {onExpandChange && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            const newExpanded = !isExpanded;
                                            setIsExpanded(newExpanded);
                                            onExpandChange(newExpanded);
                                        }}
                                        className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 hover:border-neutral-600 text-white transition-all h-7 px-2"
                                        title={isExpanded ? 'Collapse' : 'Expand'}
                                    >
                                        {isExpanded ? '⬇️ Collapse' : '⬆️ Expand'}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Code Content */}
                        <div className="flex-1 overflow-auto">
                            {isEditing ? (
                                <textarea
                                    value={editedContent}
                                    onChange={(e) => setEditedContent(e.target.value)}
                                    className="w-full h-full p-4 bg-[#1e1e1e] text-white font-mono text-sm resize-none focus:outline-none"
                                    spellCheck={false}
                                />
                            ) : (
                                <SyntaxHighlighter
                                    language={getLanguageFromType(activeFile.type)}
                                    style={vscDarkPlus}
                                    customStyle={{
                                        margin: 0,
                                        borderRadius: 0,
                                        fontSize: '13px',
                                        height: '100%',
                                    }}
                                    showLineNumbers
                                >
                                    {activeFile.content}
                                </SyntaxHighlighter>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
