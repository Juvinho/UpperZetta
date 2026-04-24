import React, { useEffect, useMemo, useState } from "react";
import { FileNode } from "../../../shared/contracts";

interface QuickOpenModalProps {
  visible: boolean;
  query: string;
  files: FileNode[];
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onSelect: (filePath: string) => void;
}

export function QuickOpenModal(props: QuickOpenModalProps): React.ReactElement | null {
  const [highlighted, setHighlighted] = useState(0);

  const filteredFiles = useMemo(() => {
    const normalized = props.query.toLowerCase();
    return props.files
      .filter((file) => file.type === "file")
      .filter((file) => file.name.toLowerCase().includes(normalized) || file.path.toLowerCase().includes(normalized))
      .slice(0, 30);
  }, [props.files, props.query]);

  useEffect(() => {
    setHighlighted(0);
  }, [props.query, props.visible]);

  useEffect(() => {
    if (!props.visible) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        props.onClose();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlighted((current) => Math.min(current + 1, Math.max(filteredFiles.length - 1, 0)));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlighted((current) => Math.max(current - 1, 0));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const selected = filteredFiles[highlighted];
        if (selected) {
          props.onSelect(selected.path);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filteredFiles, highlighted, props]);

  if (!props.visible) {
    return null;
  }

  return (
    <div className="quick-open-backdrop" onClick={props.onClose}>
      <div className="quick-open-modal" onClick={(event) => event.stopPropagation()}>
        <input
          autoFocus
          className="quick-open-input"
          placeholder="Buscar arquivos..."
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
        />

        <div className="quick-open-results">
          {filteredFiles.length === 0 ? (
            <div className="quick-open-empty">Nenhum arquivo encontrado.</div>
          ) : (
            filteredFiles.map((file, index) => (
              <button
                key={file.path}
                className={index === highlighted ? "quick-open-item active" : "quick-open-item"}
                onClick={() => props.onSelect(file.path)}
              >
                <span className="quick-open-name">{file.name}</span>
                <span className="quick-open-path">{file.path}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
