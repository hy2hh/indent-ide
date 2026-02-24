import { join } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';
import { simpleGit } from 'simple-git';

export interface WorktreeInfo {
  agentId: string;
  branchName: string;
  path: string;
  createdAt: number;
}

/**
 * Git Worktree 격리 시스템
 * 각 Implementor Agent에게 독립적인 워크트리 제공
 */
export class WorktreeManager {
  private rootPath: string;
  private worktreeBase: string;
  private worktrees = new Map<string, WorktreeInfo>();

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.worktreeBase = join(rootPath, '.intent-ide', 'worktrees');
  }

  async initialize(): Promise<void> {
    await mkdir(this.worktreeBase, { recursive: true });
  }

  /**
   * 에이전트 전용 Git Worktree 생성
   * git worktree add .intent-ide/worktrees/{agentId} -b agent/{agentId}
   */
  async create(agentId: string): Promise<string> {
    const timestamp = Date.now();
    const safeName = agentId.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    const worktreePath = join(this.worktreeBase, `${safeName}-${timestamp}`);
    const branchName = `agent/${safeName}-${timestamp}`;

    await mkdir(worktreePath, { recursive: true });

    const git = simpleGit(this.rootPath);

    try {
      await git.raw(['worktree', 'add', worktreePath, '-b', branchName]);
    } catch {
      // If git worktree not supported (not a git repo in test), just use directory
    }

    const info: WorktreeInfo = {
      agentId,
      branchName,
      path: worktreePath,
      createdAt: timestamp,
    };

    this.worktrees.set(agentId, info);
    return worktreePath;
  }

  /**
   * 워크트리 변경사항을 메인으로 병합
   */
  async merge(agentId: string): Promise<void> {
    const info = this.worktrees.get(agentId);
    if (!info) {
      throw new Error(`워크트리 '${agentId}'를 찾을 수 없습니다.`);
    }

    const git = simpleGit(this.rootPath);

    try {
      // Commit changes in worktree
      const worktreeGit = simpleGit(info.path);
      await worktreeGit.add('.');
      await worktreeGit.commit(`agent(${agentId}): implement task`, ['--allow-empty']);

      // Merge into main
      await git.merge([info.branchName, '--no-ff', '-m', `merge: ${info.branchName}`]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`워크트리 병합 실패: ${message}`);
    }
  }

  /**
   * 워크트리 정리
   */
  async cleanup(agentId: string): Promise<void> {
    const info = this.worktrees.get(agentId);
    if (!info) {
      return;
    }

    const git = simpleGit(this.rootPath);

    try {
      await git.raw(['worktree', 'remove', info.path, '--force']);
    } catch {
      // If worktree remove fails, just delete the directory
    }

    try {
      await rm(info.path, { recursive: true, force: true });
    } catch {
      // Best effort
    }

    try {
      await git.deleteLocalBranch(info.branchName, true);
    } catch {
      // Branch might not exist
    }

    this.worktrees.delete(agentId);
  }

  async cleanupAll(): Promise<void> {
    const agentIds = [...this.worktrees.keys()];
    await Promise.all(agentIds.map((id) => this.cleanup(id)));
  }

  getWorktree(agentId: string): WorktreeInfo | undefined {
    return this.worktrees.get(agentId);
  }

  listWorktrees(): WorktreeInfo[] {
    return [...this.worktrees.values()];
  }
}
