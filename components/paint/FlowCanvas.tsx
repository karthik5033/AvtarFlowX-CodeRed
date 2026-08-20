"use client";

import React, { useCallback } from "react";
import { Background, BackgroundVariant, useReactFlow, ReactFlowInstance } from "reactflow";
import ReactFlow, {
  addEdge,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  NodeProps,
  Handle,
  Position,
  MarkerType
} from "reactflow";
import "reactflow/dist/style.css";
import { Plus } from "lucide-react";

/* ---------------- CUSTOM NODE ---------------- */
// Wrapper to add the Bubble-like (+) button
const CustomNode = ({ data, selected }: NodeProps) => {
  return (
    <div
      className={`relative group rounded-xl border-2 bg-background transition-all shadow-sm ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
      style={{
        minHeight: '60px',
        width: '300px'
      }}
    >
      <div className="h-full w-full relative py-3">
        {/* Left Handle (Target) */}
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-muted-foreground hover:!bg-primary !w-3 !h-3 rounded-full opacity-0 group-hover:opacity-100 transition-all border-2 border-background -ml-1.5"
        />

        <div className="px-4">
          <div className="text-center text-sm font-semibold text-foreground leading-tight">
            {data.label}
          </div>
          {data.description && (
            <div className="mt-2 text-xs text-muted-foreground text-center leading-snug border-t border-border pt-2">
              {data.description}
            </div>
          )}
        </div>

        {/* Right Handle (Source) */}
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-muted-foreground hover:!bg-primary !w-3 !h-3 rounded-full opacity-0 group-hover:opacity-100 transition-all border-2 border-background -mr-1.5"
        />
      </div>

      {/* Bubble-like (+) Add Button - Appears on hover/selection */}
      {(selected || true) && ( // Keeping consistent for demo, usually only on hover/select
        <button
          className="absolute -right-8 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-background hover:bg-muted border border-border hover:border-primary/50 rounded-full flex items-center justify-center shadow-sm text-muted-foreground hover:text-primary transition-all z-50 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            // We need to bubble this event up to EditorShell
            // Since we can't easily pass props to node types without context, 
            // we'll rely on the global click handler or a specific class
            e.stopPropagation();
            // Dispatch a custom event or use the onNodeClick to trigger logic
            const event = new CustomEvent("openSuggestionMenu", { detail: { x: e.clientX + 20, y: e.clientY } });
            window.dispatchEvent(event);
          }}
        >
          <Plus className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

const nodeTypes = {
  avatarNode: CustomNode,
  default: CustomNode, // Keep as fallback, but AI nodes now use avatarNode
};

const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  style: { stroke: '#94a3b8', strokeWidth: 2 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#94a3b8'
  }
};

type Props = {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onSelectNode: (node: { id: string; label?: string; type?: string; data?: any } | null) => void;
  onNodeEdit: (node: Node) => void;
  onAddSuggestion?: (e: any) => void;
  onInit?: (instance: ReactFlowInstance) => void;
};

export default function FlowCanvas({ nodes, edges, setNodes, setEdges, onSelectNode, onNodeEdit, onAddSuggestion, onInit }: Props) {

  // Listen for custom event from CustomNode
  React.useEffect(() => {
    const handleCustomEvent = (e: any) => {
      if (onAddSuggestion) {
        onAddSuggestion({ clientX: e.detail.x, clientY: e.detail.y, stopPropagation: () => { } });
      }
    };
    window.addEventListener("openSuggestionMenu", handleCustomEvent);
    return () => window.removeEventListener("openSuggestionMenu", handleCustomEvent);
  }, [onAddSuggestion]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ 
      ...connection, 
      type: 'smoothstep',
      animated: true, 
      style: { stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5,5' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
    }, eds));
  }, [setEdges]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_e, node) => onSelectNode(node)}
        onNodeDoubleClick={(_e, node) => onNodeEdit(node)}
        onInit={onInit}
        nodeTypes={nodeTypes}

        minZoom={0.1}
        maxZoom={1.5}
        fitView
        fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
        attributionPosition="bottom-left"
        defaultEdgeOptions={defaultEdgeOptions}
      >
        {/* Removed Background to make canvas clean as requested */}

        <MiniMap
          nodeColor="hsl(var(--primary) / 0.5)"
          maskColor="hsl(var(--background) / 0.7)"
          className="!bg-background !shadow-sm !border !border-border !rounded-lg"
          style={{ height: 120, width: 160 }}
        />
        <Controls className="!bg-background !shadow-sm !border !border-border !rounded-lg [&>button]:!border-border [&>button]:!text-muted-foreground hover:[&>button]:!text-foreground hover:[&>button]:!bg-muted" />
      </ReactFlow>
    </div>
  );
}
