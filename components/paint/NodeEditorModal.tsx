"use client";

import React, { useState, useEffect } from "react";
import { Node } from "reactflow";
import { X, Trash2 } from "lucide-react";

interface NodeEditorModalProps {
  open: boolean;
  node: Node | null;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete: (id: string) => void;
}

const COLORS = [
  { value: "#ffffff", label: "White" },
  { value: "#fecaca", label: "Red" }, // red-200
  { value: "#fed7aa", label: "Orange" }, // orange-200
  { value: "#bbf7d0", label: "Green" }, // green-200
  { value: "#bfdbfe", label: "Blue" }, // blue-200
  { value: "#e9d5ff", label: "Purple" }, // purple-200
];

export default function NodeEditorModal({ open, node, onClose, onSave, onDelete }: NodeEditorModalProps) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#ffffff");

  useEffect(() => {
    if (node) {
      setLabel(node.data.label || "");
      setDescription(node.data.description || "");
      setColor(node.data.color || "#ffffff");
    }
  }, [node]);

  if (!open || !node) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-[400px] overflow-hidden scale-100 animate-in zoom-in-95 duration-200 border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Edit Node</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Label Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-gray-800"
              placeholder="e.g. Send Email"
              autoFocus
            />
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-600 min-h-[80px]"
              placeholder="Add details about this step..."
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Color Code</label>
            <div className="flex items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full border transition-all ${color === c.value ? 'ring-2 ring-primary ring-offset-2 border-gray-300' : 'border-gray-200 hover:scale-110'}`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm("Are you sure you want to delete this node?")) {
                onDelete(node.id);
                onClose();
              }
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSave({ label, description, color });
              }}
              className="px-4 py-2 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-sm shadow-primary/20 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
