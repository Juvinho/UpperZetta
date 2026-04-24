import React, { useState } from "react";
import { IconClose, IconFileGeneric, IconFileUp, IconFileUpz, IconFileUz } from "../../assets/icons";
import { EditorTab } from "../../types/ide";

interface EditorTabsProps {
  tabs: EditorTab[];
  activeTabId?: string;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onCloseOthers: (tabId: string) => void;
  onCloseAll: () => void;
  onCloseRight: (tabId: string) => void;
  onReorder: (fromTabId: string, toTabId: string) => void;
}

interface ContextState {
  tabId: string;
  x: number;
  y: number;
}

function tabIcon(extension: string): React.ReactElement {
  const ext = extension.toLowerCase();
  if (ext === ".uz") return <IconFileUz size={13} />;
  if (ext === ".up") return <IconFileUp size={13} />;
  if (ext === ".upz") return <IconFileUpz size={13} />;
  return <IconFileGeneric size={13} />;
}

export function EditorTabs(props: EditorTabsProps): React.ReactElement {
  const [contextMenu, setContextMenu] = useState<ContextState | null>(null);

  if (props.tabs.length === 0) {
    return (
      <div className="editor-tabs empty">
        <span>Nenhum arquivo aberto</span>
      </div>
    );
  }

  return (
    <>
      <div className="editor-tabs" role="tablist" aria-label="Arquivos abertos" onClick={() => setContextMenu(null)}>
        {props.tabs.map((tab) => {
          const isActive = tab.id === props.activeTabId;
          return (
            <button
              key={tab.id}
              className={`tab${isActive ? " active" : ""}`}
              onClick={() => props.onSelect(tab.id)}
              role="tab"
              aria-selected={isActive}
              title={tab.path ?? tab.name}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("text/tab-id", tab.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                const fromTabId = event.dataTransfer.getData("text/tab-id");
                if (fromTabId) {
                  props.onReorder(fromTabId, tab.id);
                }
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                setContextMenu({ tabId: tab.id, x: event.clientX, y: event.clientY });
              }}
            >
              <span className="tab-icon">{tabIcon(tab.extension)}</span>
              <span className="tab-name">{tab.name}</span>
              {tab.isDirty ? (
                <span className="tab-dirty" title="Alteracoes nao salvas" />
              ) : null}
              <span
                className="tab-close"
                role="button"
                aria-label={`Fechar ${tab.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  props.onClose(tab.id);
                }}
              >
                <IconClose size={9} />
              </span>
            </button>
          );
        })}
      </div>

      {contextMenu ? (
        <div
          className="tab-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <button
            onClick={() => {
              props.onClose(contextMenu.tabId);
              setContextMenu(null);
            }}
          >
            Close
          </button>
          <button
            onClick={() => {
              props.onCloseOthers(contextMenu.tabId);
              setContextMenu(null);
            }}
          >
            Close Others
          </button>
          <button
            onClick={() => {
              props.onCloseRight(contextMenu.tabId);
              setContextMenu(null);
            }}
          >
            Close Tabs to the Right
          </button>
          <button
            onClick={() => {
              props.onCloseAll();
              setContextMenu(null);
            }}
          >
            Close All
          </button>
        </div>
      ) : null}
    </>
  );
}
