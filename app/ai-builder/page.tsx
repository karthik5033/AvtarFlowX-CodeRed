'use client';


import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import PromptInput from '@/components/ai-builder/PromptInput';
import PreviewPanel from '@/components/ai-builder/PreviewPanel';
import CustomizationSidebar, { CustomizationOptions } from '@/components/ai-builder/CustomizationSidebar';
import PropertyInspector from '@/components/ai-builder/PropertyInspector';
import CodeDisplay from '@/components/ai-builder/CodeDisplay';
import DatabaseViewer from '@/components/ai-builder/DatabaseViewer';
import { FileData, ProjectStructure, DatabaseSchema } from '@/types/ai-builder';
import { SelectedElement, PropertyChange, EditorMode } from '@/types/visual-editor';
import { CodeSynchronizer } from '@/lib/code-synchronizer';

type ViewTab = 'code' | 'database';

export default function AIBuilderPage() {
    const [generatedFiles, setGeneratedFiles] = useState<FileData[]>([]);
    const [projectStructure, setProjectStructure] = useState<ProjectStructure | undefined>();
    const [databaseSchema, setDatabaseSchema] = useState<DatabaseSchema | undefined>();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCustomizing, setIsCustomizing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [editorMode, setEditorMode] = useState<EditorMode>('code');
    const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
    const [activeTab, setActiveTab] = useState<ViewTab>('code');
    const [showCodePanel, setShowCodePanel] = useState(false);
    const [codePanelHeight, setCodePanelHeight] = useState(250);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartY, setDragStartY] = useState(0);
    const [dragStartHeight, setDragStartHeight] = useState(0);
    const [isPanelExpanded, setIsPanelExpanded] = useState(false);
    const [showLeftPanel, setShowLeftPanel] = useState(true);
    const [showRightPanel, setShowRightPanel] = useState(true);


    // Handle panel resize
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStartY(e.clientY);
        setDragStartHeight(codePanelHeight);
        e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;

        const deltaY = dragStartY - e.clientY;
        const newHeight = dragStartHeight + deltaY;

        // Restrict: min 200px, max 80% of window height
        const minHeight = 200;
        const maxHeight = window.innerHeight * 0.8;
        const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

        setCodePanelHeight(clampedHeight);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Add/remove mouse event listeners
    React.useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStartY, dragStartHeight]);

    const handleGenerate = async (prompt: string) => {
        console.log('=== GENERATE PAGE STARTED ===');
        console.log('Prompt:', prompt);

        setIsGenerating(true);
        setError(null);
        setGeneratedFiles([]); // Clear previous files

        try {
            console.log('Sending request to /api/generate...');
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            console.log('Response status:', response.ok, response.status);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Generation failed');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('No response body');
            }

            let buffer = ''; // Buffer for incomplete chunks
            console.log('Starting to read stream...');

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log('Stream reading complete');
                    break;
                }

                // Decode and add to buffer
                buffer += decoder.decode(value, { stream: true });

                // Split by newlines but keep incomplete lines in buffer
                const lines = buffer.split('\n');

                // Keep the last potentially incomplete line in the buffer
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.error) {
                                throw new Error(data.error);
                            }

                            if (data.done && data.files) {
                                console.log('Generation complete! Files received:', data.files.length);
                                setGeneratedFiles(data.files);
                                if (data.structure) {
                                    console.log('Project structure received');
                                    setProjectStructure(data.structure);
                                }
                                if (data.database) {
                                    console.log('Database schema received');
                                    setDatabaseSchema(data.database);
                                    // Keep code tab active, don't auto-switch
                                }
                            }
                        } catch (parseError) {
                            // Skip malformed JSON chunks during streaming
                            console.warn('Skipping malformed JSON chunk:', parseError);
                            continue;
                        }
                    }
                }
            }

            // Process any remaining buffer content
            if (buffer.trim() && buffer.startsWith('data: ')) {
                try {
                    const data = JSON.parse(buffer.slice(6));
                    if (data.done && data.files) {
                        console.log('Final buffer - Files received:', data.files.length);
                        setGeneratedFiles(data.files);
                        if (data.structure) {
                            setProjectStructure(data.structure);
                        }
                        if (data.database) {
                            setDatabaseSchema(data.database);
                        }
                    }
                } catch (parseError) {
                    console.warn('Skipping final buffer chunk:', parseError);
                }
            }
        } catch (err) {
            console.error('Generation error:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate page');
        } finally {
            setIsGenerating(false);
            console.log('=== GENERATE PAGE ENDED ===');
        }
    };

    const handleCustomize = async (customizations: CustomizationOptions | { modification: string }) => {
        if (generatedFiles.length === 0) return;

        console.log('handleCustomize called with:', customizations);
        setIsCustomizing(true);
        setError(null);

        try {
            const response = await fetch('/api/modify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    files: generatedFiles,
                    ...(('modification' in customizations)
                        ? { modification: customizations.modification }
                        : { customizations }),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Customization failed');
            }

            const data = await response.json();
            console.log('Customization response:', data);
            setGeneratedFiles(data.files);
        } catch (err) {
            console.error('Customization error:', err);
            setError(err instanceof Error ? err.message : 'Failed to customize page');
        } finally {
            setIsCustomizing(false);
        }
    };

    const handleElementSelect = (element: SelectedElement | null) => {
        setSelectedElement(element);
        if (element) {
            setEditorMode('visual');
        }
    };

    const handlePropertyChange = (change: PropertyChange) => {
        // Get iframe document from PreviewPanel
        const iframeDoc = document.querySelector('iframe')?.contentDocument;

        if (!iframeDoc) {
            console.error('Iframe document not found');
            return;
        }

        // Apply changes directly to iframe DOM (instant visual update)
        let element = iframeDoc.querySelector(change.elementPath);

        if (!element) {
            console.error('Element not found with selector:', change.elementPath);
            return;
        }

        // Handle text content separately
        if (change.property === 'textContent') {
            element.textContent = change.value;

            // Update selected element state
            if (selectedElement && selectedElement.path === change.elementPath) {
                setSelectedElement({
                    ...selectedElement,
                    textContent: change.value,
                });
            }
        } else if (change.property === 'src' || change.property === 'alt') {
            // Handle image attributes
            element.setAttribute(change.property, change.value);

            // Update selected element state
            if (selectedElement && selectedElement.path === change.elementPath) {
                setSelectedElement({
                    ...selectedElement,
                    computedStyles: {
                        ...selectedElement.computedStyles,
                        [change.property]: change.value,
                    },
                });
            }
        } else {
            // Handle style properties
            const htmlElement = element as HTMLElement;
            const cssProperty = change.property.replace(/([A-Z])/g, '-$1').toLowerCase();
            htmlElement.style.setProperty(cssProperty, change.value);

            // Update selected element state
            if (selectedElement && selectedElement.path === change.elementPath) {
                setSelectedElement({
                    ...selectedElement,
                    computedStyles: {
                        ...selectedElement.computedStyles,
                        [change.property]: change.value,
                    },
                });
            }
        }

        // Extract the updated HTML and update generatedFiles state
        // This triggers the PreviewPanel's useEffect to reload the iframe with the changes
        const extractedHTML = CodeSynchronizer.extractHTMLFromIframe(iframeDoc);

        const htmlFiles = generatedFiles.filter(f => f.type === 'html');
        const otherFiles = generatedFiles.filter(f => f.type !== 'html');

        const updatedHtmlFiles = htmlFiles.map(file => ({
            ...file,
            content: extractedHTML
        }));

        setGeneratedFiles([...updatedHtmlFiles, ...otherFiles]);
    };

    const handleApplyChanges = () => {
        // Get iframe document
        const iframeDoc = document.querySelector('iframe')?.contentDocument;
        if (!iframeDoc) {
            console.error('Cannot apply changes: iframe document not found');
            return;
        }

        // Extract updated HTML from iframe
        const htmlFiles = generatedFiles.filter(f => f.type === 'html');
        const otherFiles = generatedFiles.filter(f => f.type !== 'html');

        // Extract the current state of the iframe (with all inline changes)
        const extractedHTML = CodeSynchronizer.extractHTMLFromIframe(iframeDoc);

        const updatedHtmlFiles = htmlFiles.map(file => ({
            ...file,
            content: extractedHTML
        }));

        // Update the files state - this will trigger re-render of both preview and code
        setGeneratedFiles([...updatedHtmlFiles, ...otherFiles]);
    };

    return (
        <div className="h-screen flex flex-col">
            {/* Error Banner */}
            {error && (
                <div className="bg-red-500 text-white px-4 py-2 text-sm">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {/* Mode Toggle - Show when files exist */}
            {generatedFiles.length > 0 && !isFullscreen && (
                <div className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">Mode:</span>
                        <Button
                            variant={editorMode === 'visual' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setEditorMode('visual')}
                        >
                            Visual
                        </Button>
                        <Button
                            variant={editorMode === 'code' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                                setEditorMode('code');
                                setSelectedElement(null);
                            }}
                        >
                            Code
                        </Button>
                    </div>
                    {generatedFiles.length > 0 && showCodePanel && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant={activeTab === 'code' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setActiveTab('code')}
                            >
                                📄 Code
                            </Button>
                            <Button
                                variant={activeTab === 'database' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setActiveTab('database')}
                            >
                                🗄️ Database
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Prompt Input - Collapsible */}
                {!isFullscreen && (
                    <>
                        {showLeftPanel ? (
                            <div className="w-96 relative">
                                <PromptInput onSubmit={handleGenerate} isLoading={isGenerating} />
                                <button
                                    onClick={() => setShowLeftPanel(false)}
                                    className="absolute top-2 right-2 p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
                                    title="Hide panel"
                                >
                                    ◀
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowLeftPanel(true)}
                                className="w-8 hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center"
                                title="Show prompt panel"
                            >
                                ▶
                            </button>
                        )}
                    </>
                )}

                {/* Center: Preview and Code */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Edit Prompt - Only show when files exist and not in fullscreen */}
                    {generatedFiles.length > 0 && !isFullscreen && (
                        <div className="border-b border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50 dark:bg-neutral-900">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Edit with AI: e.g., 'Make it darker' or 'Add a contact form'"
                                    className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                            handleCustomize({ modification: e.currentTarget.value });
                                            e.currentTarget.value = '';
                                        }
                                    }}
                                    disabled={isCustomizing}
                                />
                                <Button
                                    size="sm"
                                    disabled={isCustomizing}
                                    onClick={(e) => {
                                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                        if (input?.value.trim()) {
                                            handleCustomize({ modification: input.value });
                                            input.value = '';
                                        }
                                    }}
                                >
                                    {isCustomizing ? 'Editing...' : 'Edit'}
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-hidden flex flex-col">
                        {!isPanelExpanded && (
                            <div className="flex-1 overflow-hidden">
                                <PreviewPanel
                                    files={generatedFiles}
                                    isLoading={isGenerating}
                                    isFullscreen={isFullscreen}
                                    onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                                    isSelectionMode={editorMode === 'visual'}
                                    onElementSelect={handleElementSelect}
                                />
                            </div>
                        )}
                        {/* View Code Bar - Fixed at Bottom */}
                        {generatedFiles.length > 0 && !isFullscreen && (
                            <div className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-2 flex items-center justify-center gap-2">
                                <Button
                                    onClick={() => {
                                        setShowCodePanel(!showCodePanel);
                                        if (!showCodePanel) {
                                            setActiveTab('code');
                                        } else {
                                            // Reset height when hiding
                                            setCodePanelHeight(250);
                                        }
                                    }}
                                    size="sm"
                                    variant={showCodePanel ? 'default' : 'outline'}
                                >
                                    {showCodePanel ? '▼ Hide Code' : '▲ View Code'}
                                </Button>
                            </div>
                        )}
                    </div>
                    {!isFullscreen && showCodePanel && activeTab === 'code' && (
                        <div
                            className="relative border-t border-neutral-200 dark:border-neutral-800"
                            style={{ height: isPanelExpanded ? '100%' : `${codePanelHeight}px`, maxWidth: '100%', overflow: 'hidden' }}
                        >
                            {/* Resize Handle */}
                            {!isPanelExpanded && (
                                <div
                                    onMouseDown={handleMouseDown}
                                    className="absolute top-0 left-0 right-0 cursor-ns-resize hover:bg-primary/50 transition-colors z-[100] flex items-center justify-center"
                                    style={{ height: '8px', marginTop: '-4px' }}
                                >
                                    <div className="w-12 h-1 bg-neutral-400 dark:bg-neutral-600 rounded-full shadow-sm" />
                                </div>
                            )}
                            <div className="h-full">
                                <CodeDisplay
                                    files={generatedFiles}
                                    structure={projectStructure}
                                    onCodeChange={(fileIndex, newContent) => {
                                        const updatedFiles = [...generatedFiles];
                                        updatedFiles[fileIndex] = {
                                            ...updatedFiles[fileIndex],
                                            content: newContent,
                                        };
                                        setGeneratedFiles(updatedFiles);
                                    }}
                                    onExpandChange={setIsPanelExpanded}
                                />
                            </div>
                        </div>
                    )}
                    {!isFullscreen && showCodePanel && activeTab === 'database' && (
                        <div
                            className="relative border-t border-neutral-200 dark:border-neutral-800"
                            style={{ height: isPanelExpanded ? '100%' : `${codePanelHeight}px` }}
                        >
                            {/* Resize Handle */}
                            {!isPanelExpanded && (
                                <div
                                    onMouseDown={handleMouseDown}
                                    className="absolute top-0 left-0 right-0 cursor-ns-resize hover:bg-primary/50 transition-colors z-[100] flex items-center justify-center"
                                    style={{ height: '8px', marginTop: '-4px' }}
                                >
                                    <div className="w-12 h-1 bg-neutral-400 dark:bg-neutral-600 rounded-full shadow-sm" />
                                </div>
                            )}
                            <div className="h-full">
                                <DatabaseViewer
                                    schema={databaseSchema}
                                    onExpandChange={setIsPanelExpanded}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Property Inspector (Visual) or Customization (Code) - Collapsible */}
                {!isFullscreen && (
                    <>
                        {showRightPanel ? (
                            <div className="relative h-full">
                                {editorMode === 'visual' ? (
                                    <PropertyInspector
                                        selectedElement={selectedElement}
                                        onPropertyChange={handlePropertyChange}
                                        onApplyChanges={handleApplyChanges}
                                        onClose={() => setSelectedElement(null)}
                                    />
                                ) : (
                                    <CustomizationSidebar
                                        onCustomize={handleCustomize}
                                        isLoading={isCustomizing}
                                        hasCode={generatedFiles.length > 0}
                                    />
                                )}
                                <button
                                    onClick={() => setShowRightPanel(false)}
                                    className="absolute top-2 left-2 p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded z-10"
                                    title="Hide panel"
                                >
                                    ▶
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowRightPanel(true)}
                                className="w-8 hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center"
                                title="Show customization panel"
                            >
                                ◀
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
