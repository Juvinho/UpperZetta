import React, { useMemo, useState } from "react";
import { FileNode } from "../../../shared/contracts";
import {
  IconChevronDown,
  IconChevronRight,
  IconFileGeneric,
  IconFileUp,
  IconFileUpz,
  IconFileUz,
  IconFolder,
  IconFolderOpen,
  IconNewFile
} from "../../assets/icons";

interface SidebarExplorerProps {
  workspaceRoot?: string;
  nodes: FileNode[];
  activeFilePath?: string;
  onOpenFile: (node: FileNode) => void;
  onNewFile: () => void;
}

export function SidebarExplorer(props: SidebarExplorerProps): React.ReactElement {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const initializedExpanded = useMemo(() => {
    const next = new Set<string>();
    const visit = (items: FileNode[]) => {
      for (const item of items) {
        if (item.type === "directory") {
          next.add(item.path);
          if (item.children) {
            visit(item.children);
          }
        }
      }
    };
    visit(props.nodes);
    return next;
  }, [props.nodes]);

  React.useEffect(() => {
    setExpanded(initializedExpanded);
  }, [initializedExpanded]);

  const handleToggle = (path: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const next = new Set<string>();
    const visit = (items: FileNode[]) => {
      for (const item of items) {
        if (item.type === "directory") {
          next.add(item.path);
          if (item.children) visit(item.children);
        }
      }
    };
    visit(props.nodes);
    setExpanded(next);
  };

  const handleCollapseAll = () => setExpanded(new Set());

  const workspaceLabel = props.workspaceRoot
    ? props.workspaceRoot.split(/[\\/]/).pop() ?? props.workspaceRoot
    : null;

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <span className="sidebar-title">Explorer</span>
        <div className="sidebar-actions">
          {props.nodes.length > 0 && (
            <>
              <button
                className="sidebar-icon-button"
                onClick={handleExpandAll}
                title="Expandir tudo"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                className="sidebar-icon-button"
                onClick={handleCollapseAll}
                title="Recolher tudo"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </>
          )}
          <button
            className="sidebar-icon-button"
            onClick={props.onNewFile}
            title="Novo arquivo (Ctrl+N)"
          >
            <IconNewFile size={13} />
          </button>
        </div>
      </div>

      {workspaceLabel && (
        <div className="workspace-label" title={props.workspaceRoot}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
            <path d="M1 3.5A.5.5 0 0 1 1.5 3H4.5L5.5 4.5H10.5A.5.5 0 0 1 11 5V9.5A.5.5 0 0 1 10.5 10H1.5A.5.5 0 0 1 1 9.5V3.5Z"
              stroke="currentColor" strokeWidth="1.1" fill="none" />
          </svg>
          <span>{workspaceLabel}</span>
        </div>
      )}

      <div className="tree-view">
        {props.nodes.length === 0 ? (
          <div className="empty-tree">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ marginBottom: 8, opacity: 0.4 }}>
              <rect x="2" y="2" width="24" height="24" rx="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 9h14M7 14h9M7 19h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>Abra uma pasta para explorar arquivos Uzet</span>
          </div>
        ) : (
          props.nodes.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              activeFilePath={props.activeFilePath}
              onToggle={handleToggle}
              onOpenFile={props.onOpenFile}
            />
          ))
        )}
      </div>
    </aside>
  );
}

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  expanded: Set<string>;
  activeFilePath?: string;
  onToggle: (path: string) => void;
  onOpenFile: (node: FileNode) => void;
}

function fileIcon(extension: string): React.ReactElement {
  const ext = extension.toLowerCase();
  if (ext === ".uz") return <IconFileUz size={14} />;
  if (ext === ".up") return <IconFileUp size={14} />;
  if (ext === ".upz") return <IconFileUpz size={14} />;
  return <IconFileGeneric size={14} />;
}

function TreeNode(props: TreeNodeProps): React.ReactElement {
  const { node, depth } = props;
  const paddingLeft = `${depth * 14 + 8}px`;

  if (node.type === "directory") {
    const isOpen = props.expanded.has(node.path);
    return (
      <div className="tree-node">
        <button
          className="tree-directory"
          style={{ paddingLeft }}
          onClick={() => props.onToggle(node.path)}
        >
          <span className="tree-chevron">
            {isOpen ? <IconChevronDown size={11} /> : <IconChevronRight size={11} />}
          </span>
          <span className="tree-dir-icon">
            {isOpen ? <IconFolderOpen size={14} /> : <IconFolder size={14} />}
          </span>
          <span className="tree-name">{node.name}</span>
        </button>

        {isOpen && node.children?.length
          ? node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={props.expanded}
                activeFilePath={props.activeFilePath}
                onToggle={props.onToggle}
                onOpenFile={props.onOpenFile}
              />
            ))
          : null}
      </div>
    );
  }

  const isActive = node.path === props.activeFilePath;
  const ext = (node.extension ?? "").toLowerCase();
  const isUzetFile = [".uz", ".up", ".upz"].includes(ext);

  return (
    <button
      className={`tree-file${isActive ? " active" : ""}${isUzetFile ? " uzet-file" : ""}`}
      style={{ paddingLeft }}
      onClick={() => props.onOpenFile(node)}
      title={node.path}
    >
      <span className="tree-file-icon">{fileIcon(node.extension ?? "")}</span>
      <span className="tree-name">{node.name}</span>
      {node.extension ? (
        <span className={`tree-extension ext-${ext.replace(".", "")}`}>
          {ext.replace(".", "")}
        </span>
      ) : null}
    </button>
  );
}
