import { GitBranchInfo, GitStatusResult } from "../../../shared/contracts";

export async function getGitStatus(cwd: string): Promise<GitStatusResult> {
  return window.zettaApi.gitStatus(cwd);
}

export async function stageFiles(cwd: string, paths: string[]): Promise<boolean> {
  return window.zettaApi.gitStage({ cwd, paths });
}

export async function unstageFiles(cwd: string, paths: string[]): Promise<boolean> {
  return window.zettaApi.gitUnstage({ cwd, paths });
}

export async function commitChanges(cwd: string, message: string): Promise<boolean> {
  return window.zettaApi.gitCommit({ cwd, message });
}

export async function pullChanges(cwd: string): Promise<string> {
  return window.zettaApi.gitPull(cwd);
}

export async function pushChanges(cwd: string): Promise<string> {
  return window.zettaApi.gitPush(cwd);
}

export async function getBranches(cwd: string): Promise<{ currentBranch: string; branches: GitBranchInfo[] }> {
  return window.zettaApi.gitBranches(cwd);
}

export async function checkoutBranch(cwd: string, branch: string): Promise<boolean> {
  return window.zettaApi.gitCheckout({ cwd, branch });
}

export async function getDiff(cwd: string, filePath: string): Promise<string> {
  return window.zettaApi.gitDiff({ cwd, path: filePath });
}

export async function getRemote(cwd: string): Promise<string> {
  return window.zettaApi.gitRemote(cwd);
}
