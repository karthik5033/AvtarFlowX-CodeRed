'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

function PreviewContent() {
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');
    const [files, setFiles] = useState<any[]>([]);
    const [currentRoute, setCurrentRoute] = useState('/');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load generated files from localStorage or API
        const savedFiles = localStorage.getItem(`generated_${projectId}`);
        if (savedFiles) {
            setFiles(JSON.parse(savedFiles));
        }
        setLoading(false);
    }, [projectId]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading preview...</div>;
    }

    // Find the current page file
    const currentFile = files.find(f => {
        if (currentRoute === '/') return f.path === 'app/page.tsx';
        return f.path === `app${currentRoute}/page.tsx`;
    });

    if (!currentFile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Preview Not Available</h1>
                    <p className="text-gray-600">Generate code first to see preview</p>
                </div>
            </div>
        );
    }

    // Extract available routes
    const routes = files
        .filter(f => f.path.startsWith('app/') && f.path.endsWith('/page.tsx'))
        .map(f => {
            const match = f.path.match(/app\/(.*?)\/page\.tsx/);
            return match ? `/${match[1]}` : '/';
        });

    if (!routes.includes('/')) routes.unshift('/');

    return (
        <div className="min-h-screen flex flex-col bg-gray-900">
            {/* Preview Header */}
            <div className="bg-gray-800 border-b border-gray-700 p-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <h1 className="text-white font-semibold text-lg">🚀 App Preview</h1>
                    <div className="flex gap-2">
                        {routes.map(route => (
                            <button
                                key={route}
                                onClick={() => setCurrentRoute(route)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${currentRoute === route
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                {route === '/' ? 'Home' : route.replace('/', '')}
                            </button>
                        ))}
                    </div>
                    <a href="/visual-builder" className="text-gray-400 hover:text-white">
                        ← Back to Builder
                    </a>
                </div>
            </div>

            {/* Preview Frame */}
            <div className="flex-1 bg-white">
                <div className="h-full">
                    <iframe
                        srcDoc={generatePreviewHTML(currentFile.content, currentRoute)}
                        className="w-full h-full border-0"
                        title="App Preview"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                    />
                </div>
            </div>
        </div>
    );
}

export default function PreviewPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading preview...</div>}>
            <PreviewContent />
        </Suspense>
    );
}

// Generate HTML for iframe preview
function generatePreviewHTML(pageContent: string, route: string): string {
    // Extract the component code
    const componentMatch = pageContent.match(/export default function (\w+)\(\) \{([\s\S]*)\}/);
    if (!componentMatch) {
        return '<div>Error rendering preview</div>';
    }

    // For functional auth pages, we need to actually run them
    // Since they have API calls, we'll create a working HTML version
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, -apple-system, sans-serif; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        const { useState } = React;
        
        ${pageContent.replace('export default function', 'function')}
        
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(${componentMatch[1]}Page));
    </script>
</body>
</html>`;
}
