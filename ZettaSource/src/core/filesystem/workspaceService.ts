import { FileNode, FileReadResult, WorkspaceData } from "../../../shared/contracts";

const SUPPORTED_EDITABLE_EXTENSIONS = new Set([".uz", ".up", ".upz", ".txt", ".md", ".json"]);

export async function openWorkspaceDialog(): Promise<WorkspaceData | null> {
  const selectedPath = await window.zettaApi.openFolderDialog();
  if (!selectedPath) {
    return null;
  }

  return window.zettaApi.readWorkspace(selectedPath);
}

export async function loadExampleWorkspace(): Promise<WorkspaceData> {
  return window.zettaApi.loadExampleWorkspace();
}

export async function readWorkspaceFile(filePath: string): Promise<FileReadResult> {
  return window.zettaApi.readFile(filePath);
}

export async function saveWorkspaceFile(filePath: string, content: string): Promise<boolean> {
  return window.zettaApi.saveFile({ path: filePath, content });
}

export async function createWorkspaceFile(
  directoryPath: string,
  fileName: string,
  content = ""
): Promise<string> {
  return window.zettaApi.createFile({ directoryPath, fileName, content });
}

export function flattenFiles(nodes: FileNode[]): FileNode[] {
  const output: FileNode[] = [];

  for (const node of nodes) {
    if (node.type === "file") {
      output.push(node);
      continue;
    }

    if (node.children) {
      output.push(...flattenFiles(node.children));
    }
  }

  return output;
}

export function findNodeByPath(nodes: FileNode[], targetPath: string): FileNode | undefined {
  for (const node of nodes) {
    if (node.path === targetPath) {
      return node;
    }

    if (node.children?.length) {
      const child = findNodeByPath(node.children, targetPath);
      if (child) {
        return child;
      }
    }
  }

  return undefined;
}

export function isEditableFile(node: FileNode): boolean {
  if (node.type !== "file") {
    return false;
  }

  return SUPPORTED_EDITABLE_EXTENSIONS.has((node.extension ?? "").toLowerCase());
}

export function inferLanguageFromExtension(extension: string): "uzet" | "plaintext" {
  const normalized = extension.toLowerCase();
  if (normalized === ".uz" || normalized === ".up" || normalized === ".upz") {
    return "uzet";
  }

  return "plaintext";
}
