"use client";

import React from "react";
import Sidebar from "./Sidebar";
import dagre from "dagre";


import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
  MiniMap,
  ReactFlowProvider,
} from "@xyflow/react";

import TextNode from "./nodes/TextNode";
import "@xyflow/react/dist/style.css";

const nodeTypes = {
  textNode: TextNode,
};

export default function FlowCanvas() {
  const [reactFlowInstance, setReactFlowInstance] = React.useState<any>(null);

  const snapToGrid = (position: any, gridSize = 24) => ({
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  });

  const [nodes, setNodes] = React.useState<any[]>([]);

  // update node data helper
  const updateNodeData = React.useCallback((id: string, newData: any) => {
    setNodes((nds: any[]) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...newData } } : n
      )
    );
  }, []);

  React.useEffect(() => {
    const initial = [
      {
        id: "input",
        type: "textNode",
        position: { x: 100, y: 150 },
        data: {
          label: "Input Node (Form)",
          outputs: ["out-1"],
          onChange: (id: string, payload: any) => updateNodeData(id, payload),
        },
        style: {
          padding: 12,
          borderRadius: 12,
          border: "1px solid #d0d7e2",
          background: "white",
          boxShadow: "0px 2px 6px rgba(0,0,0,0.08)",
        },
      },
      {
        id: "logic",
        type: "textNode",
        position: { x: 420, y: 150 },
        data: {
          label: "AI Logic Node",
          outputs: ["out-1"],
          onChange: (id: string, payload: any) => updateNodeData(id, payload),
        },
        style: {
          padding: 12,
          borderRadius: 12,
          border: "1px solid #d0d7e2",
          background: "white",
          boxShadow: "0px 2px 6px rgba(0,0,0,0.08)",
        },
      },
      {
        id: "output",
        type: "textNode",
        position: { x: 740, y: 150 },
        data: {
          label: "Output Node (Results)",
          outputs: ["out-1"],
          onChange: (id: string, payload: any) => updateNodeData(id, payload),
        },
        style: {
          padding: 12,
          borderRadius: 12,
          border: "1px solid #d0d7e2",
          background: "white",
          boxShadow: "0px 2px 6px rgba(0,0,0,0.08)",
        },
      },
    ];

    setNodes(initial);
  }, [updateNodeData]);

  const [edges, setEdges] = React.useState<any[]>([
    {
      id: "e1",
      source: "input",
      sourceHandle: "input-out-0",
      target: "logic",
      targetHandle: "logic-in",
      animated: true,
      style: { stroke: "#4e7aff", strokeWidth: 2 },
    },

    {
      id: "e2",
      source: "logic",
      sourceHandle: "logic-out-0",
      target: "output",
      targetHandle: "output-in",
      animated: true,
      style: { stroke: "#4e7aff", strokeWidth: 2 },
    },
  ]);
  // ⭐ Snapline visual guides
  const [guides, setGuides] = React.useState<{
    x: number | null;
    y: number | null;
  }>({
    x: null,
    y: null,
  });

  // History stacks for undo/redo
  const [history, setHistory] = React.useState<any[]>([]);
  const [future, setFuture] = React.useState<any[]>([]);

  // Save current state to history
  const pushToHistory = React.useCallback(() => {
    setHistory((prev) => [...prev, { nodes: [...nodes], edges: [...edges] }]);
    setFuture([]); // clear redo stack
  }, [nodes, edges]);

  const undo = React.useCallback(() => {
    if (history.length === 0) return;

    const prev = history[history.length - 1];
    setFuture((f) => [...f, { nodes, edges }]);
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setHistory((h) => h.slice(0, -1));
  }, [history, nodes, edges]);

  const redo = React.useCallback(() => {
    if (future.length === 0) return;

    const next = future[future.length - 1];
    setHistory((h) => [...h, { nodes, edges }]);
    setNodes(next.nodes);
    setEdges(next.edges);
    setFuture((f) => f.slice(0, -1));
  }, [future, nodes, edges]);

  const onDragOver = (event: any) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const onDrop = (event: any) => {
    event.preventDefault();
    if (!reactFlowInstance) return;

    const type = event.dataTransfer.getData("node-type");
    if (!type) return;

    let position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    position = snapToGrid(position);

    const id = `${type}_${Date.now()}`;

    const newNode = {
      id,
      type,
      position,
      data: {
        label: `${type}`,
        outputs: ["out-1"],
        onChange: (nid: string, payload: any) => updateNodeData(nid, payload),
      },
      style: {
        padding: 12,
        borderRadius: 12,
        border: "1px solid #d0d7e2",
        background: "white",
        boxShadow: "0px 2px 6px rgba(0,0,0,0.08)",
      },
    };

    setNodes((nds) => nds.concat(newNode));
  };

  const addNode = (type: string) => {
    const id = `${type}_${Date.now()}`;
    const newNode = {
      id,
      type,
      position: { x: 100 + Math.random() * 220, y: 100 + Math.random() * 220 },
      data: {
        label: `${type}`,
        outputs: ["out-1"],
        onChange: (nid: string, payload: any) => updateNodeData(nid, payload),
      },
      style: {
        padding: 12,
        borderRadius: 12,
        border: "1px solid #d0d7e2",
        background: "white",
        boxShadow: "0px 2px 6px rgba(0,0,0,0.08)",
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const onNodesChange = React.useCallback(
    (changes: any) => {
      pushToHistory();
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [pushToHistory]
  );

  const onEdgesChange = React.useCallback(
    (changes: any) => {
      pushToHistory();
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [pushToHistory]
  );

  const onConnect = React.useCallback(
    (params: any) => {
      pushToHistory();
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "#4e7aff", strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [pushToHistory]
  );

  // Export flow JSON (nodes + edges) and trigger download
  const exportFlow = React.useCallback(() => {
    const payload = {
      nodes: nodes.map((n) => ({
        id: n.id,
        label: n.data?.label ?? "",
        position: n.position,
        outputs: n.data?.outputs ?? [],
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle,
        target: e.target,
        targetHandle: e.targetHandle,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `avatarflowx_flow_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  // DAGRE GRAPH INSTANCE
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Node dimensions (better to keep consistent)
  const nodeWidth = 260;
  const nodeHeight = 160;

  // AUTO LAYOUT FUNCTION

  // Smooth transition helper
  const animateNodePositions = (
    oldNodes: any[],
    newNodes: any[],
    duration = 350
  ) => {
    let start: number | null = null;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);

      const interpolated = oldNodes.map((oldNode) => {
        const newNode = newNodes.find((n) => n.id === oldNode.id);
        if (!newNode) return oldNode;

        return {
          ...oldNode,
          position: {
            x:
              oldNode.position.x +
              (newNode.position.x - oldNode.position.x) * progress,
            y:
              oldNode.position.y +
              (newNode.position.y - oldNode.position.y) * progress,
          },
        };
      });

      setNodes(interpolated);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  };

  const applyAutoLayout = () => {
    // Setup graph direction: LR = left→right, TB = top→bottom
    dagreGraph.setGraph({ rankdir: "LR", nodesep: 80, ranksep: 100 });

    // Add nodes with their sizes
    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    // Add edges
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // Run Dagre layout
    dagre.layout(dagreGraph);

    // New positioned nodes
    const updated = nodes.map((node) => {
      const nodePos = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodePos.x - nodeWidth / 2,
          y: nodePos.y - nodeHeight / 2,
        },
      };
    });

    animateNodePositions(nodes, updated, 380);
  };

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Delete selected
      if (e.key === "Delete" || e.key === "Backspace") {
        pushToHistory();
        setNodes((nds) => nds.filter((n) => !n.selected));
        setEdges((eds) => eds.filter((e) => !e.selected));
      }

      // Duplicate: Ctrl+D
      if (e.ctrlKey && e.key === "d") {
        e.preventDefault();
        pushToHistory();

        setNodes((nds) => [
          ...nds,
          ...nds
            .filter((n) => n.selected)
            .map((n) => ({
              ...n,
              id: `${n.id}_copy_${Date.now()}`,
              position: {
                x: n.position.x + 30,
                y: n.position.y + 30,
              },
            })),
        ]);
      }

      // Select All: Ctrl+A
      if (e.ctrlKey && e.key === "a") {
        e.preventDefault();
        setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
      }

      // Undo: Ctrl+Z
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        undo();
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if (
        (e.ctrlKey && e.shiftKey && e.key === "Z") ||
        (e.ctrlKey && e.key === "y")
      ) {
        redo();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pushToHistory, undo, redo]);

  // ⭐ Compute snapline guides while dragging
  const computeGuides = (draggedNode: any) => {
    let xGuide: number | null = null;
    let yGuide: number | null = null;

    nodes.forEach((node) => {
      if (node.id === draggedNode.id) return;

      const dx = Math.abs(draggedNode.position.x - node.position.x);
      const dy = Math.abs(draggedNode.position.y - node.position.y);

      // Snap threshold (10 px)
      if (dx < 10) xGuide = node.position.x;
      if (dy < 10) yGuide = node.position.y;
    });

    setGuides({ x: xGuide, y: yGuide });
  };

  return (
    <ReactFlowProvider>
      <div className="w-full h-full flex">
        {/* Sidebar */}
        <div className="w-44 mr-4">
          <Sidebar addNode={addNode} exportFlow={exportFlow} />
        </div>

        <div className="flex-1 rounded-xl overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onInit={setReactFlowInstance}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDrag={(event, node) => computeGuides(node)}
            onNodeDragStop={() => setGuides({ x: null, y: null })}
            onDrop={onDrop}
            onDragOver={onDragOver}
            fitView
            fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
            panOnDrag
            panOnScroll
            zoomOnScroll
          >
            <Background
              id="grid"
              gap={24}
              size={2}
              color="#e2e8f0"
              variant={BackgroundVariant.Dots}
            />

            <Controls position="bottom-left" />

            <MiniMap
              nodeColor={() => "#4e7aff"}
              nodeStrokeWidth={1.5}
              maskColor="rgba(255,255,255,0.7)"
              style={{
                bottom: 16,
                right: 16,
                borderRadius: "12px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              }}
            />

            {/* ⭐ Vertical guide */}
            {guides.x !== null && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: guides.x,
                  width: 1,
                  background: "#4e7aff",
                  opacity: 0.6,
                  pointerEvents: "none",
                }}
              />
            )}

            {/* ⭐ Horizontal guide */}
            {guides.y !== null && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: guides.y,
                  height: 1,
                  background: "#4e7aff",
                  opacity: 0.6,
                  pointerEvents: "none",
                }}
              />
            )}
          </ReactFlow>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
