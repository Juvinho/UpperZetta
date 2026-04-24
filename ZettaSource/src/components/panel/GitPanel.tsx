import React from "react";
import { IconExternal, IconGit, IconRefresh } from "../../assets/icons";
import { GitState, GitHubState } from "../../types/ide";

interface GitPanelProps {
  git: GitState;
  github: GitHubState;
  onRefresh: () => void;
  onStage: (path: string) => void;
  onUnstage: (path: string) => void;
  onSelectDiff: (path: string) => void;
  onCommitMessage: (value: string) => void;
  onCommit: () => void;
  onPull: () => void;
  onPush: () => void;
  onCheckoutBranch: (branch: string) => void;
  onTokenChange: (token: string) => void;
  onGithubFieldChange: (field: "owner" | "repo" | "baseBranch" | "compareBranch" | "prTitle" | "prBody", value: string) => void;
  onCreatePr: () => void;
  onListPrs: () => void;
  onOpenRemote: () => void;
  onOpenPr: (url: string) => void;
}

export function GitPanel(props: GitPanelProps): React.ReactElement {
  return (
    <div className="git-panel-wrap">
      <div className="git-topline">
        <div className="git-meta">
          <span className="git-branch">
            <IconGit size={13} /> {props.git.branch}
          </span>
          <span className="git-ahead-behind">
            ahead {props.git.aheadBy} | behind {props.git.behindBy}
          </span>
          {props.git.remoteUrl ? <span className="git-remote">{props.git.remoteUrl}</span> : null}
        </div>

        <div className="git-actions">
          <button className="mini-button" onClick={props.onRefresh}>
            <IconRefresh size={12} /> Refresh
          </button>
          <button className="mini-button" onClick={props.onPull}>
            Pull
          </button>
          <button className="mini-button" onClick={props.onPush}>
            Push
          </button>
          <button className="mini-button" onClick={props.onOpenRemote} disabled={!props.git.remoteUrl}>
            <IconExternal size={12} /> Open Remote
          </button>
        </div>
      </div>

      <div className="git-main-grid">
        <section className="git-files">
          <header>
            <strong>Changes</strong>
            <span>{props.git.files.length} arquivo(s)</span>
          </header>

          <div className="git-files-list">
            {props.git.files.length === 0 ? (
              <div className="panel-empty">Working tree limpo.</div>
            ) : (
              props.git.files.map((file) => (
                <div key={file.path} className="git-file-row">
                  <button className="git-file-name" onClick={() => props.onSelectDiff(file.path)}>
                    <span className="git-status-pill">{`${file.indexStatus}${file.workTreeStatus}`.trim() || "--"}</span>
                    {file.path}
                  </button>

                  <div className="git-file-actions">
                    {file.staged ? (
                      <button className="mini-button" onClick={() => props.onUnstage(file.path)}>
                        Unstage
                      </button>
                    ) : (
                      <button className="mini-button" onClick={() => props.onStage(file.path)}>
                        Stage
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="git-commit-box">
            <textarea
              value={props.git.commitMessage}
              onChange={(event) => props.onCommitMessage(event.target.value)}
              placeholder="Mensagem de commit"
              rows={3}
            />
            <button className="mini-button emphasis" onClick={props.onCommit}>
              Commit
            </button>
          </div>

          <div className="git-branch-switcher">
            <select value={props.git.branch} onChange={(event) => props.onCheckoutBranch(event.target.value)}>
              {props.git.availableBranches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="git-diff">
          <header>
            <strong>Diff</strong>
            <span>{props.git.selectedDiffPath ?? "selecione um arquivo"}</span>
          </header>
          <pre>{props.git.selectedDiffText || "Nenhum diff carregado."}</pre>
        </section>

        <section className="github-box">
          <header>
            <strong>GitHub</strong>
            <span>Token em memoria (MVP)</span>
          </header>

          <div className="github-fields">
            <input
              type="password"
              placeholder="GitHub token"
              value={props.github.token}
              onChange={(event) => props.onTokenChange(event.target.value)}
            />
            <div className="github-row">
              <input
                placeholder="owner"
                value={props.github.owner}
                onChange={(event) => props.onGithubFieldChange("owner", event.target.value)}
              />
              <input
                placeholder="repo"
                value={props.github.repo}
                onChange={(event) => props.onGithubFieldChange("repo", event.target.value)}
              />
            </div>
            <div className="github-row">
              <input
                placeholder="base"
                value={props.github.baseBranch}
                onChange={(event) => props.onGithubFieldChange("baseBranch", event.target.value)}
              />
              <input
                placeholder="compare"
                value={props.github.compareBranch}
                onChange={(event) => props.onGithubFieldChange("compareBranch", event.target.value)}
              />
            </div>
            <input
              placeholder="PR title"
              value={props.github.prTitle}
              onChange={(event) => props.onGithubFieldChange("prTitle", event.target.value)}
            />
            <textarea
              rows={3}
              placeholder="PR body"
              value={props.github.prBody}
              onChange={(event) => props.onGithubFieldChange("prBody", event.target.value)}
            />

            <div className="github-actions">
              <button className="mini-button" onClick={props.onListPrs}>List PRs</button>
              <button className="mini-button emphasis" onClick={props.onCreatePr}>Create Pull Request</button>
            </div>
          </div>

          <div className="github-pr-list">
            {props.github.prs.length === 0 ? (
              <div className="panel-empty">Sem PRs listados.</div>
            ) : (
              props.github.prs.map((pr) => (
                <button key={pr.id} className="github-pr-item" onClick={() => props.onOpenPr(pr.url)}>
                  <span>#{pr.id}</span>
                  <span>{pr.title}</span>
                </button>
              ))
            )}
          </div>

          {props.github.openPrUrl ? (
            <button className="mini-button" onClick={() => props.onOpenPr(props.github.openPrUrl as string)}>
              <IconExternal size={12} /> Open Last PR
            </button>
          ) : null}
        </section>
      </div>
    </div>
  );
}
