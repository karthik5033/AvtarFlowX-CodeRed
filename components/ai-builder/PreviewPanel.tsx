'use client';

import { useState, useEffect, useRef } from 'react';
import { Monitor, Smartphone, Tablet, Maximize2, RefreshCw, MousePointer2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileData } from '@/types/ai-builder';
import { SelectedElement } from '@/types/visual-editor';
import { ElementSelector } from '@/lib/element-selector';

interface PreviewPanelProps {
    files: FileData[];
    isLoading: boolean;
    isFullscreen?: boolean;
    onToggleFullscreen?: () => void;
    isSelectionMode?: boolean;
    onElementSelect?: (element: SelectedElement | null) => void;
}

type ViewportSize = 'mobile' | 'tablet' | 'desktop' | 'fullscreen';

export default function PreviewPanel({ files, isLoading, isFullscreen = false, onToggleFullscreen, isSelectionMode = false, onElementSelect }: PreviewPanelProps) {
    const [viewport, setViewport] = useState<ViewportSize>('desktop');
    const [key, setKey] = useState(0);
    const [activeHtmlIndex, setActiveHtmlIndex] = useState(0);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const elementSelectorRef = useRef<ElementSelector | null>(null);
    const skipNextReloadRef = useRef(false);
    const lastContentRef = useRef<string>('');
    const previousKeyRef = useRef<number>(0);

    const refresh = () => {
        console.log('Refresh button clicked, current key:', key);
        setKey(prev => prev + 1);
    };

    // Get HTML files for multi-page navigation
    const htmlFiles = files.filter(f => f.type === 'html');
    const cssFile = files.find(f => f.type === 'css' || f.path.includes('.css'));
    const jsFile = files.find(f => f.type === 'javascript' || f.path.includes('.js'));

    // Render iframe content
    useEffect(() => {
        // Reset lastContentRef if key changed (refresh was clicked)
        if (previousKeyRef.current !== key) {
            console.log('Key changed from', previousKeyRef.current, 'to', key, '- resetting lastContentRef');
            lastContentRef.current = '';
            previousKeyRef.current = key;
        }

        console.log('=== IFRAME RENDER EFFECT ===');
        console.log('files.length:', files.length);
        console.log('iframeRef.current:', !!iframeRef.current);

        if (files.length > 0 && iframeRef.current) {
            const iframe = iframeRef.current;
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

            console.log('iframeDoc exists:', !!iframeDoc);

            if (iframeDoc) {
                const activeHtml = htmlFiles[activeHtmlIndex];
                console.log('activeHtml:', activeHtml?.name);

                if (!activeHtml) {
                    console.warn('No active HTML file found!');
                    return;
                }

                let htmlContent = activeHtml.content;
                console.log('HTML content length:', htmlContent.length);

                // Remove external file references that cause 404 errors
                htmlContent = htmlContent.replace(/<link[^>]*href=["'](?:css\/)?style\.css["'][^>]*>/gi, '');
                htmlContent = htmlContent.replace(/<script[^>]*src=["'](?:js\/)?script\.js["'][^>]*><\/script>/gi, '');

                // Ensure Tailwind CSS is loaded
                if (!htmlContent.includes('cdn.tailwindcss.com')) {
                    htmlContent = htmlContent.replace(
                        '</head>',
                        '  <script src="https://cdn.tailwindcss.com"></script>\n</head>'
                    );
                }

                // If HTML doesn't have full structure, wrap it
                if (!htmlContent.includes('<html')) {
                    console.log('Wrapping HTML with full structure');
                    htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="img-src * data: blob: 'unsafe-inline';">
  <title>${activeHtml.name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  ${cssFile ? `<style>${cssFile.content}</style>` : ''}
</head>
<body>
<script>
// API Proxy for iframe - enables database calls
if (!window.__API_PROXY_INSTALLED__) {
  window.__API_PROXY_INSTALLED__ = true;
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const [url, options] = args;
    if (typeof url === 'string' && url.includes('/api/database')) {
      try {
        return window.parent.fetch(url, options);
      } catch (error) {
        console.error('API call failed:', error);
        throw error;
      }
    }
    return originalFetch.apply(this, args);
  };
}
</script>
${htmlContent}
${jsFile ? `<script>${jsFile.content}</script>` : ''}
</body>
</html>`;
                } else {
                    console.log('HTML has full structure, injecting CSS and JS');
                    // Inject CSS and JS into existing HTML
                    if (cssFile && !htmlContent.includes(cssFile.content)) {
                        htmlContent = htmlContent.replace(
                            '</head>',
                            `<style>${cssFile.content}</style>\n</head>`
                        );
                    }

                    // Inject API proxy before user's JavaScript
                    const apiProxyScript = `
<script>
// API Proxy for iframe - enables database calls
if (!window.__API_PROXY_INSTALLED__) {
  window.__API_PROXY_INSTALLED__ = true;
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const [url, options] = args;
    if (typeof url === 'string' && url.includes('/api/database')) {
      try {
        return window.parent.fetch(url, options);
      } catch (error) {
        console.error('API call failed:', error);
        throw error;
      }
    }
    return originalFetch.apply(this, args);
  };
}
</script>`;

                    if (jsFile && !htmlContent.includes(jsFile.content)) {
                        htmlContent = htmlContent.replace(
                            '</body>',
                            `${apiProxyScript}\n<script>${jsFile.content}</script>\n</body>`
                        );
                    } else {
                        // Inject proxy even if no JS file
                        htmlContent = htmlContent.replace(
                            '</body>',
                            `${apiProxyScript}\n</body>`
                        );
                    }

                    // Ensure CSP is present
                    if (!htmlContent.includes('Content-Security-Policy')) {
                        // Add CSP at the start of <head>, not in <body>
                        htmlContent = htmlContent.replace(
                            /<head[^>]*>/i,
                            (match) => `${match}\n  <meta http-equiv="Content-Security-Policy" content="img-src * data: blob: 'unsafe-inline';">`
                        );
                    }
                }

                // Only write if content changed to prevent "already declared" errors
                if (htmlContent !== lastContentRef.current) {
                    console.log('Writing new content to iframe');
                    console.log('Content comparison:', {
                        newLength: htmlContent.length,
                        oldLength: lastContentRef.current.length,
                        areEqual: htmlContent === lastContentRef.current
                    });
                    lastContentRef.current = htmlContent;
                    iframeDoc.open();
                    iframeDoc.write(htmlContent);
                    iframeDoc.close();
                    console.log('Content written successfully');
                } else {
                    console.log('Content unchanged, skipping write');
                    console.log('Both contents have length:', htmlContent.length);
                }
            }
        } else {
            console.log('Skipping render - no files or no iframe ref');
        }
    }, [files, key, activeHtmlIndex, htmlFiles, cssFile, jsFile]);

    // Handle selection mode
    useEffect(() => {
        if (!iframeRef.current || !onElementSelect) return;

        if (isSelectionMode) {
            // Wait for iframe to load before enabling selection
            const enableSelection = () => {
                const iframeDoc = iframeRef.current?.contentDocument;
                if (!iframeDoc || !iframeDoc.body) {
                    // Retry if iframe not ready
                    setTimeout(enableSelection, 100);
                    return;
                }

                // Always recreate ElementSelector to ensure it works with current iframe
                if (elementSelectorRef.current) {
                    elementSelectorRef.current.disable();
                }

                elementSelectorRef.current = new ElementSelector(
                    iframeRef.current!,
                    onElementSelect
                );
                elementSelectorRef.current.enable();
            };

            // Small delay to ensure iframe content is loaded
            const timer = setTimeout(enableSelection, 150);

            return () => {
                clearTimeout(timer);
                if (elementSelectorRef.current) {
                    elementSelectorRef.current.disable();
                }
            };
        } else {
            // Disable selection mode
            if (elementSelectorRef.current) {
                elementSelectorRef.current.disable();
            }
        }
    }, [isSelectionMode, onElementSelect, files, key]);

    const viewportSizes = {
        mobile: 'w-[375px]',
        tablet: 'w-[768px]',
        desktop: 'w-full',
        fullscreen: 'w-full h-full',
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-neutral-950">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                    <Button
                        variant={viewport === 'mobile' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewport('mobile')}
                    >
                        <Smartphone className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={viewport === 'tablet' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewport('tablet')}
                    >
                        <Tablet className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={viewport === 'desktop' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewport('desktop')}
                    >
                        <Monitor className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={isFullscreen ? 'default' : 'outline'}
                        size="sm"
                        onClick={onToggleFullscreen}
                        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    >
                        <Maximize2 className="w-4 h-4" />
                    </Button>
                    {isSelectionMode && (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => onElementSelect?.(null)}
                            title="Exit selection mode"
                        >
                            <MousePointer2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>

                <Button variant="outline" size="sm" onClick={refresh}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Preview Area */}
            <div className="flex-1 overflow-auto bg-neutral-100 dark:bg-neutral-900 p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-neutral-600 dark:text-neutral-400">
                                Generating your page...
                            </p>
                        </div>
                    </div>
                ) : files.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center max-w-md">
                            <Monitor className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Preview Yet</h3>
                            <p className="text-neutral-600 dark:text-neutral-400">
                                Enter a prompt and click "Generate Page" to see your AI-generated page here.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        {/* Multi-page navigation */}
                        {htmlFiles.length > 1 && (
                            <div className="flex gap-2 mb-4">
                                {htmlFiles.map((file, index) => (
                                    <button
                                        key={file.name}
                                        onClick={() => setActiveHtmlIndex(index)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeHtmlIndex === index
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                            }`}
                                    >
                                        {file.name.replace('.html', '')}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex-1 flex justify-center">
                            <div
                                className={`${viewportSizes[viewport]} ${viewport === 'fullscreen' ? '' : 'max-w-full'
                                    } h-full bg-white dark:bg-neutral-950 shadow-2xl transition-all duration-300`}
                            >
                                <iframe
                                    ref={iframeRef}
                                    key={key}
                                    className="w-full h-full"
                                    sandbox="allow-scripts allow-same-origin allow-forms"
                                    title="Preview"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
