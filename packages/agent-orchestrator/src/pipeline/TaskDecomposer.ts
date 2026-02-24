import type { SpecTask } from '@intent-ide/core';

export interface TaskWave {
  wave: number;
  taskIds: string[];
  canParallelize: boolean;
}

/**
 * 의존성 분석 → 병렬/순차 Wave 구성
 */
export class TaskDecomposer {
  /**
   * 태스크 의존성 그래프에서 Wave 순서 계산
   * Wave 내 태스크들은 병렬 실행 가능
   */
  buildWaves(tasks: SpecTask[]): TaskWave[] {
    const waves: TaskWave[] = [];
    const completed = new Set<string>();
    const remaining = new Set(tasks.map((t) => t.id));

    while (remaining.size > 0) {
      const waveTaskIds: string[] = [];

      for (const task of tasks) {
        if (!remaining.has(task.id)) {
          continue;
        }

        // Check if all dependencies are completed
        const allDepsCompleted = task.dependencies.every((dep) => completed.has(dep));
        if (allDepsCompleted) {
          waveTaskIds.push(task.id);
        }
      }

      if (waveTaskIds.length === 0) {
        // Circular dependency or error - add remaining tasks
        const remaining_arr = [...remaining];
        waves.push({
          wave: waves.length + 1,
          taskIds: remaining_arr,
          canParallelize: false,
        });
        break;
      }

      waves.push({
        wave: waves.length + 1,
        taskIds: waveTaskIds,
        canParallelize: waveTaskIds.length > 1,
      });

      for (const id of waveTaskIds) {
        remaining.delete(id);
        completed.add(id);
      }
    }

    return waves;
  }

  /**
   * 의존성 사이클 감지
   */
  hasCycles(tasks: SpecTask[]): boolean {
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    const dfs = (taskId: string): boolean => {
      if (inStack.has(taskId)) {
        return true; // Cycle detected
      }
      if (visited.has(taskId)) {
        return false;
      }

      visited.add(taskId);
      inStack.add(taskId);

      const task = taskMap.get(taskId);
      if (task) {
        for (const dep of task.dependencies) {
          if (dfs(dep)) {
            return true;
          }
        }
      }

      inStack.delete(taskId);
      return false;
    };

    return tasks.some((t) => dfs(t.id));
  }

  estimateParallelism(waves: TaskWave[]): number {
    if (waves.length === 0) {
      return 1;
    }
    const maxParallel = Math.max(...waves.map((w) => w.taskIds.length));
    return maxParallel;
  }
}
