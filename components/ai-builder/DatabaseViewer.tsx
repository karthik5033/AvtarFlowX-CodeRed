'use client';

import { useState, useEffect } from 'react';
import { Database, RefreshCw, Table, FileJson, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatabaseSchema } from '@/types/ai-builder';

interface DatabaseViewerProps {
    schema?: DatabaseSchema;
    onExpandChange?: (isExpanded: boolean) => void;
}

export default function DatabaseViewer({ schema, onExpandChange }: DatabaseViewerProps) {
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [documents, setDocuments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [tables, setTables] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'json' | 'analysis'>('analysis');
    const [isExpanded, setIsExpanded] = useState(false);
    const [tableToDelete, setTableToDelete] = useState<string | null>(null);

    // Auto-connect and fetch tables on mount
    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/database?action=tables');
            const result = await response.json();

            if (result.success && result.data) {
                const tableNames = result.data.map((t: any) => t.name);
                setTables(tableNames);
                if (tableNames.length > 0) {
                    setSelectedTable(tableNames[0]);
                    setIsConnected(true);
                }
            } else {
                // If no tables, try to use schema
                if (schema?.collections) {
                    const schemaTableNames = schema.collections.map(c => c.name);
                    setTables(schemaTableNames);
                    if (schemaTableNames.length > 0) {
                        setSelectedTable(schemaTableNames[0]);
                        setIsConnected(true);
                    }
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const loadDocuments = async (tableName: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/database?action=data&table=${tableName}`);
            const result = await response.json();
            if (result.success) {
                setDocuments(result.data || []);
            } else {
                setError(result.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedTable && isConnected) {
            loadDocuments(selectedTable);
        }
    }, [selectedTable, isConnected]);

    const deleteTable = async (tableName: string) => {
        setTableToDelete(tableName);
    };

    const confirmDeleteTable = async () => {
        if (!tableToDelete) return;

        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/database', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete_table',
                    table: tableToDelete
                })
            });
            const result = await response.json();

            if (result.success) {
                // Refresh tables list
                await fetchTables();
                setSelectedTable('');
                setTableToDelete(null);
            } else {
                setError(result.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const recreateDefaultTables = async () => {
        if (!confirm('Recreate default app tables (app_form_submissions, app_users)?')) {
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/database', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'recreate_default_tables'
                })
            });
            const result = await response.json();

            if (result.success) {
                // Refresh tables list
                await fetchTables();
            } else {
                setError(result.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to parse JSON strings in data
    const parseValue = (value: any) => {
        if (typeof value === 'string') {
            try {
                // Try to parse as JSON
                const parsed = JSON.parse(value);
                return parsed;
            } catch {
                return value;
            }
        }
        return value;
    };

    // Removed early return - now works without schema!

    return (
        <div className="h-full flex flex-col bg-neutral-50 dark:bg-neutral-900">
            {/* Header */}
            <div className="border-b border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">Local Database</h2>
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                            SQLite
                        </span>
                    </div>
                    {isConnected && (
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-600 dark:text-green-400">Connected</span>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    const newExpanded = !isExpanded;
                                    setIsExpanded(newExpanded);
                                    onExpandChange?.(newExpanded);
                                }}
                                className="ml-2"
                            >
                                {isExpanded ? '⬇️ Collapse' : '⬆️ Expand'}
                            </Button>
                        </div>
                    )}
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Local file-based database - no connection string needed
                </p>
            </div>

            {error && (
                <div className="mx-4 mt-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Tables Sidebar */}
                <div className="w-64 border-r border-neutral-200 dark:border-neutral-800 overflow-y-auto">
                    <div className="p-2">
                        <div className="flex items-center justify-between mb-2 px-2">
                            <div className="text-xs font-semibold text-neutral-500 uppercase">
                                Tables
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={recreateDefaultTables}
                                disabled={isLoading}
                                title="Recreate default app tables"
                                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                                + Reset
                            </Button>
                        </div>
                        {tables.length > 0 ? (
                            tables.map((tableName) => (
                                <button
                                    key={tableName}
                                    onClick={() => setSelectedTable(tableName)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${selectedTable === tableName
                                        ? 'bg-primary/20 dark:bg-primary/30 text-primary dark:text-primary'
                                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                        }`}
                                >
                                    <Table className="w-4 h-4" />
                                    <span className="font-mono">{tableName}</span>
                                </button>
                            ))
                        ) : (
                            <div className="text-center text-sm text-neutral-500 p-4">
                                No tables yet. Add data in the preview!
                            </div>
                        )}
                    </div>
                </div>

                {/* Documents View */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="border-b border-neutral-200 dark:border-neutral-800 p-3 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <span className="font-mono text-sm font-semibold truncate">
                                    {selectedTable || 'Select a table'}
                                </span>
                                {selectedTable && (
                                    <span className="text-xs text-neutral-500 whitespace-nowrap">
                                        ({documents.length} recs)
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedTable('')}
                                    title="Close Table View"
                                    className="h-8 px-2 text-neutral-500 hover:text-neutral-900"
                                >
                                    ✕ Close
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => selectedTable && loadDocuments(selectedTable)}
                                    disabled={isLoading || !selectedTable}
                                    title="Refresh Data"
                                    className="h-8 w-8 p-0"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>
                        </div>

                        {selectedTable && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                                <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
                                    <button
                                        onClick={() => setViewMode('analysis')}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'analysis'
                                            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                                            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                                            }`}
                                    >
                                        Analysis
                                    </button>
                                    <button
                                        onClick={() => setViewMode('json')}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'json'
                                            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                                            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                                            }`}
                                    >
                                        JSON
                                    </button>
                                </div>

                                <div className="flex-1" />

                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => deleteTable(selectedTable)}
                                    disabled={isLoading}
                                    className="h-7 text-xs px-2 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                                >
                                    Delete
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto p-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin" />
                            </div>
                        ) : documents.length > 0 ? (
                            viewMode === 'analysis' ? (
                                // Analysis View - Formatted Table
                                <div className="space-y-4">
                                    {/* Statistics */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Records</div>
                                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{documents.length}</div>
                                        </div>
                                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                                            <div className="text-xs text-green-600 dark:text-green-400 font-medium">Fields</div>
                                            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                                                {documents[0] ? Object.keys(documents[0]).length : 0}
                                            </div>
                                        </div>
                                        <div className="bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 rounded-lg p-3">
                                            <div className="text-xs text-primary dark:text-primary font-medium">Table</div>
                                            <div className="text-lg font-bold text-primary dark:text-primary truncate">{selectedTable}</div>
                                        </div>
                                    </div>

                                    {/* Data Table */}
                                    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-neutral-100 dark:bg-neutral-800">
                                                    <tr>
                                                        {documents[0] && Object.keys(documents[0]).map((key) => (
                                                            <th key={key} className="px-4 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-700">
                                                                {key}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {documents.map((doc, index) => (
                                                        <tr key={index} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                                            {Object.entries(doc).map(([key, value]) => {
                                                                const parsedValue = parseValue(value);
                                                                return (
                                                                    <td key={key} className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-700">
                                                                        {typeof parsedValue === 'object' && parsedValue !== null ? (
                                                                            <details className="cursor-pointer">
                                                                                <summary className="text-blue-600 dark:text-blue-400 font-mono text-xs">
                                                                                    {Array.isArray(parsedValue) ? `Array[${parsedValue.length}]` : 'Object'}
                                                                                </summary>
                                                                                <pre className="mt-1 text-xs font-mono bg-neutral-100 dark:bg-neutral-900 p-2 rounded overflow-x-auto">
                                                                                    {JSON.stringify(parsedValue, null, 2)}
                                                                                </pre>
                                                                            </details>
                                                                        ) : (
                                                                            <span className="font-mono text-xs">{String(parsedValue)}</span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // JSON View - Original
                                <div className="space-y-3">
                                    {documents.map((doc, index) => (
                                        <div
                                            key={index}
                                            className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 bg-white dark:bg-neutral-800"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <FileJson className="w-4 h-4 text-green-500" />
                                                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                                                    ID: {doc.id}
                                                </span>
                                            </div>
                                            <pre className="text-xs font-mono overflow-x-auto">
                                                {JSON.stringify(doc, null, 2)}
                                            </pre>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (
                            <div className="flex items-center justify-center h-full text-neutral-500 dark:text-neutral-400">
                                <div className="text-center">
                                    <FileJson className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>No data yet</p>
                                    <p className="text-xs mt-1">Data will appear here when you use the app</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Table Confirmation Dialog */}
            {tableToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setTableToDelete(null)}>
                    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-2">Delete Table?</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                            Are you sure you want to permanently delete the table "<span className="font-mono font-semibold">{tableToDelete}</span>"? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setTableToDelete(null)}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmDeleteTable}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Deleting...' : 'OK, Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
