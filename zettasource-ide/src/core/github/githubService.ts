export interface GitHubPullRequestPayload {
  token: string;
  owner: string;
  repo: string;
  base: string;
  head: string;
  title: string;
  body: string;
}

export interface GitHubPullRequest {
  id: number;
  title: string;
  url: string;
  state: string;
}

function makeHeaders(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json"
  };
}

export async function createPullRequest(payload: GitHubPullRequestPayload): Promise<{ url: string }> {
  const response = await fetch(`https://api.github.com/repos/${payload.owner}/${payload.repo}/pulls`, {
    method: "POST",
    headers: makeHeaders(payload.token),
    body: JSON.stringify({
      title: payload.title,
      head: payload.head,
      base: payload.base,
      body: payload.body
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub PR error ${response.status}: ${body}`);
  }

  const json = (await response.json()) as { html_url: string };
  return { url: json.html_url };
}

export async function listOpenPullRequests(token: string, owner: string, repo: string): Promise<GitHubPullRequest[]> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=20`, {
    headers: makeHeaders(token)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub list PR error ${response.status}: ${body}`);
  }

  const json = (await response.json()) as Array<{ number: number; title: string; html_url: string; state: string }>;
  return json.map((entry) => ({
    id: entry.number,
    title: entry.title,
    url: entry.html_url,
    state: entry.state
  }));
}

export function parseGitHubRemote(url: string): { owner: string; repo: string } | null {
  if (!url) {
    return null;
  }

  const sshMatch = url.match(/^git@github\.com:([^/]+)\/([^/.]+)(\.git)?$/i);
  if (sshMatch) {
    return {
      owner: sshMatch[1] || "",
      repo: sshMatch[2] || ""
    };
  }

  const httpsMatch = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/.]+)(\.git)?$/i);
  if (httpsMatch) {
    return {
      owner: httpsMatch[1] || "",
      repo: httpsMatch[2] || ""
    };
  }

  return null;
}
