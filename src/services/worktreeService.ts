import * as childProcess from 'child_process';

export interface WorktreeInfo {
  readonly path: string;
  readonly branch: string | undefined;
  readonly isCurrentWorkspace: boolean;
}

export type ExecFn = (
  cmd: string,
  opts: { cwd: string },
  cb: (err: Error | null, stdout: string, stderr: string) => void,
) => void;

function makeExecGit(execFn: ExecFn) {
  return (cmd: string, cwd: string): Promise<string> =>
    new Promise((resolve, reject) => {
      execFn(cmd, { cwd }, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr.trim() || err.message));
        } else {
          resolve(stdout);
        }
      });
    });
}

export async function listWorktrees(
  gitRoot: string,
  execFn: ExecFn = childProcess.exec,
): Promise<WorktreeInfo[]> {
  const execGit = makeExecGit(execFn);
  let output: string;
  try {
    output = await execGit('git worktree list --porcelain', gitRoot);
  } catch {
    return [];
  }

  try {
    const blocks = output.trim().split(/\n\n+/);
    const results: WorktreeInfo[] = [];
    for (const block of blocks) {
      if (!block.trim()) {
        continue;
      }
      const lines = block.trim().split('\n');
      let worktreePath: string | undefined;
      let branch: string | undefined;

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          worktreePath = line.slice('worktree '.length).trim();
        } else if (line.startsWith('branch ')) {
          // refs/heads/branch-name → branch-name
          branch = line.slice('branch '.length).trim().replace(/^refs\/heads\//, '');
        }
      }

      if (worktreePath) {
        results.push({
          path: worktreePath,
          branch,
          isCurrentWorkspace: worktreePath === gitRoot,
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

export async function addWorktree(
  branch: string,
  targetPath: string,
  gitRoot: string,
  execFn: ExecFn = childProcess.exec,
): Promise<void> {
  const execGit = makeExecGit(execFn);

  // Check if the branch already exists; use -b to create it if not.
  let branchExists = false;
  try {
    await execGit(`git rev-parse --verify "${branch}"`, gitRoot);
    branchExists = true;
  } catch {
    branchExists = false;
  }

  if (branchExists) {
    await execGit(`git worktree add "${targetPath}" "${branch}"`, gitRoot);
  } else {
    await execGit(`git worktree add -b "${branch}" "${targetPath}"`, gitRoot);
  }
}
