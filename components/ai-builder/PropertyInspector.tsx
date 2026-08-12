'use client';

import { useState } from 'react';
import { SketchPicker } from 'react-color';
import { SelectedElement, PropertyChange } from '@/types/visual-editor';
import { Button } from '@/components/ui/button';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface PropertyInspectorProps {
    selectedElement: SelectedElement | null;
    onPropertyChange: (change: PropertyChange) => void;
    onApplyChanges: () => void;
    onClose: () => void;
}

export default function PropertyInspector({
    selectedElement,
    onPropertyChange,
    onApplyChanges,
    onClose,
}: PropertyInspectorProps) {
    const [expandedSections, setExpandedSections] = useState({
        content: true,
        image: true,
        typography: true,
        colors: true,
        spacing: false,
        layout: false,
    });

    const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

    if (!selectedElement) {
        return (
            <div className="w-80 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Click an element in the preview to edit its properties
                </p>
            </div>
        );
    }

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    const handlePropertyChange = (property: string, value: string) => {
        onPropertyChange({
            elementPath: selectedElement.path,
            property,
            value,
        });
    };

    const handleColorChange = (property: string, color: any) => {
        const rgba = `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, ${color.rgb.a})`;
        handlePropertyChange(property, rgba);
    };

    return (
        <div className="w-80 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="font-semibold text-sm">Properties</h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            {selectedElement.tagName}
                            {selectedElement.className && `.${selectedElement.className.split(' ')[0]}`}
                        </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
                {/* Apply Button */}
                <Button
                    onClick={onApplyChanges}
                    className="w-full"
                    size="sm"
                >
                    Apply Changes to Code
                </Button>
            </div>

            {/* Properties */}
            <div className="flex-1 overflow-y-auto">
                {/* Content Section */}
                <div className="border-b border-neutral-200 dark:border-neutral-800">
                    <button
                        onClick={() => toggleSection('content')}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    >
                        <span className="text-sm font-medium">Content</span>
                        {expandedSections.content ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </button>
                    {expandedSections.content && (
                        <div className="px-4 pb-4 space-y-3">
                            {/* Text Content */}
                            <div>
                                <label className="text-xs text-neutral-600 dark:text-neutral-400">
                                    Text Content
                                </label>
                                <textarea
                                    value={selectedElement.textContent || ''}
                                    onChange={(e) => {
                                        // Update text content
                                        const newText = e.target.value;
                                        onPropertyChange({
                                            elementPath: selectedElement.path,
                                            property: 'textContent',
                                            value: newText,
                                        });
                                    }}
                                    className="w-full mt-1 px-2 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 min-h-[60px]"
                                    placeholder="Element text content"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Image Section */}
                {selectedElement.tagName.toLowerCase() === 'img' && (
                    <div className="border-b border-neutral-200 dark:border-neutral-800">
                        <button
                            onClick={() => toggleSection('image')}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900"
                        >
                            <span className="text-sm font-medium">Image</span>
                            {expandedSections.image ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                        </button>
                        {expandedSections.image && (
                            <div className="px-4 pb-4 space-y-3">
                                {/* Image Source URL */}
                                <div>
                                    <label className="text-xs text-neutral-600 dark:text-neutral-400">
                                        Image URL
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedElement.computedStyles?.src || ''}
                                        onChange={(e) => {
                                            onPropertyChange({
                                                elementPath: selectedElement.path,
                                                property: 'src',
                                                value: e.target.value,
                                            });
                                        }}
                                        className="w-full mt-1 px-2 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </div>
                                {/* Alt Text */}
                                <div>
                                    <label className="text-xs text-neutral-600 dark:text-neutral-400">
                                        Alt Text
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedElement.computedStyles?.alt || ''}
                                        onChange={(e) => {
                                            onPropertyChange({
                                                elementPath: selectedElement.path,
                                                property: 'alt',
                                                value: e.target.value,
                                            });
                                        }}
                                        className="w-full mt-1 px-2 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800"
                                        placeholder="Image description"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Typography Section */}
                <div className="border-b border-neutral-200 dark:border-neutral-800">
                    <button
                        onClick={() => toggleSection('typography')}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    >
                        <span className="text-sm font-medium">Typography</span>
                        {expandedSections.typography ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </button>
                    {expandedSections.typography && (
                        <div className="px-4 pb-4 space-y-3">
                            {/* Font Family */}
                            <div>
                                <label className="text-xs text-neutral-600 dark:text-neutral-400">
                                    Font Family
                                </label>
                                <select
                                    value={selectedElement.computedStyles.fontFamily || ''}
                                    onChange={(e) => handlePropertyChange('fontFamily', e.target.value)}
                                    className="w-full mt-1 px-2 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800"
                                >
                                    <option value="Arial, sans-serif">Arial</option>
                                    <option value="'Times New Roman', serif">Times New Roman</option>
                                    <option value="'Courier New', monospace">Courier New</option>
                                    <option value="Georgia, serif">Georgia</option>
                                    <option value="Verdana, sans-serif">Verdana</option>
                                    <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                                    <option value="Inter, sans-serif">Inter</option>
                                    <option value="Roboto, sans-serif">Roboto</option>
                                </select>
                            </div>

                            {/* Font Size */}
                            <div>
                                <label className="text-xs text-neutral-600 dark:text-neutral-400">
                                    Font Size
                                </label>
                                <input
                                    type="text"
                                    value={selectedElement.computedStyles.fontSize || ''}
                                    onChange={(e) => handlePropertyChange('fontSize', e.target.value)}
                                    className="w-full mt-1 px-2 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800"
                                    placeholder="16px"
                                />
                            </div>

                            {/* Font Weight */}
                            <div>
                                <label className="text-xs text-neutral-600 dark:text-neutral-400">
                                    Font Weight
                                </label>
                                <select
                                    value={selectedElement.computedStyles.fontWeight || ''}
                                    onChange={(e) => handlePropertyChange('fontWeight', e.target.value)}
                                    className="w-full mt-1 px-2 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800"
                                >
                                    <option value="300">Light (300)</option>
                                    <option value="400">Normal (400)</option>
                                    <option value="500">Medium (500)</option>
                                    <option value="600">Semibold (600)</option>
                                    <option value="700">Bold (700)</option>
                                    <option value="800">Extra Bold (800)</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Colors Section */}
                <div className="border-b border-neutral-200 dark:border-neutral-800">
                    <button
                        onClick={() => toggleSection('colors')}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    >
                        <span className="text-sm font-medium">Colors</span>
                        {expandedSections.colors ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </button>
                    {expandedSections.colors && (
                        <div className="px-4 pb-4 space-y-3">
                            {/* Text Color */}
                            <div>
                                <label className="text-xs text-neutral-600 dark:text-neutral-400">
                                    Text Color
                                </label>
                                <div className="mt-1 flex gap-2">
                                    <div
                                        className="w-10 h-10 rounded border border-neutral-300 dark:border-neutral-700 cursor-pointer"
                                        style={{ backgroundColor: selectedElement.computedStyles.color }}
                                        onClick={() => setShowColorPicker('color')}
                                    />
                                    <input
                                        type="text"
                                        value={selectedElement.computedStyles.color || ''}
                                        onChange={(e) => handlePropertyChange('color', e.target.value)}
                                        className="flex-1 px-2 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800"
                                    />
                                </div>
                                {showColorPicker === 'color' && (
                                    <div className="absolute z-10 mt-2">
                                        <div
                                            className="fixed inset-0"
                                            onClick={() => setShowColorPicker(null)}
                                        />
                                        <SketchPicker
                                            color={selectedElement.computedStyles.color}
                                            onChange={(color: any) => handleColorChange('color', color)}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Background Color */}
                            <div>
                                <label className="text-xs text-neutral-600 dark:text-neutral-400">
                                    Background Color
                                </label>
                                <div className="mt-1 flex gap-2">
                                    <div
                                        className="w-10 h-10 rounded border border-neutral-300 dark:border-neutral-700 cursor-pointer"
                                        style={{
                                            backgroundColor: selectedElement.computedStyles.backgroundColor,
                                        }}
                                        onClick={() => setShowColorPicker('backgroundColor')}
                                    />
                                    <input
                                        type="text"
                                        value={selectedElement.computedStyles.backgroundColor || ''}
                                        onChange={(e) =>
                                            handlePropertyChange('backgroundColor', e.target.value)
                                        }
                                        className="flex-1 px-2 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800"
                                    />
                                </div>
                                {showColorPicker === 'backgroundColor' && (
                                    <div className="absolute z-10 mt-2">
                                        <div
                                            className="fixed inset-0"
                                            onClick={() => setShowColorPicker(null)}
                                        />
                                        <SketchPicker
                                            color={selectedElement.computedStyles.backgroundColor}
                                            onChange={(color: any) => handleColorChange('backgroundColor', color)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Spacing Section */}
                <div className="border-b border-neutral-200 dark:border-neutral-800">
                    <button
                        onClick={() => toggleSection('spacing')}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    >
                        <span className="text-sm font-medium">Spacing</span>
                        {expandedSections.spacing ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </button>
                    {expandedSections.spacing && (
                        <div className="px-4 pb-4 space-y-3">
                            {/* Margin */}
                            <div>
                                <label className="text-xs text-neutral-600 dark:text-neutral-400">
                                    Margin
                                </label>
                                <input
                                    type="text"
                                    value={selectedElement.computedStyles.margin || ''}
                                    onChange={(e) => handlePropertyChange('margin', e.target.value)}
                                    className="w-full mt-1 px-2 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800"
                                    placeholder="10px"
                                />
                            </div>

                            {/* Padding */}
                            <div>
                                <label className="text-xs text-neutral-600 dark:text-neutral-400">
                                    Padding
                                </label>
                                <input
                                    type="text"
                                    value={selectedElement.computedStyles.padding || ''}
                                    onChange={(e) => handlePropertyChange('padding', e.target.value)}
                                    className="w-full mt-1 px-2 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800"
                                    placeholder="10px"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
