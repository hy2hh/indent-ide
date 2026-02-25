import React, { useCallback, useEffect, useState } from 'react';
import { useAgentStore } from '../../stores/agentStore.js';
import type {
  DraftSpecTaskInput,
  LivingSpecData,
  SpecTask,
  TaskPriority,
} from '@intent-ide/core';

interface DraftTaskForm {
  id?: string;
  description: string;
  priority: TaskPriority;
  dependenciesText: string;
  filesText: string;
}

function splitCommaSeparated(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toDraftTaskForm(task: SpecTask): DraftTaskForm {
  return {
    id: task.id,
    description: task.description,
    priority: task.priority,
    dependenciesText: task.dependencies.join(', '),
    filesText: task.files.join(', '),
  };
}

export const SpecPanel = React.memo(function SpecPanel() {
  const { currentSpec, approveSpec, updateSpecDraft, pipelineStatus } = useAgentStore();
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftTasks, setDraftTasks] = useState<DraftTaskForm[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isDraft = currentSpec?.status === 'draft';
  const isWaiting = pipelineStatus === 'running' && isDraft;

  useEffect(() => {
    if (!isDraft || currentSpec === null || isEditingDraft) {
      return;
    }
    setDraftTasks(currentSpec.tasks.map(toDraftTaskForm));
  }, [currentSpec, isDraft, isEditingDraft]);

  const startEditingDraft = useCallback(() => {
    if (!isDraft || currentSpec === null) {
      return;
    }

    setDraftTasks(currentSpec.tasks.map(toDraftTaskForm));
    setSaveError(null);
    setIsEditingDraft(true);
  }, [currentSpec, isDraft]);

  const cancelEditingDraft = useCallback(() => {
    setIsEditingDraft(false);
    setSaveError(null);
  }, []);

  const updateTaskField = useCallback(
    (index: number, patch: Partial<DraftTaskForm>) => {
      setDraftTasks((prev) => prev.map((task, i) => (i === index ? { ...task, ...patch } : task)));
    },
    []
  );

  const addDraftTask = useCallback(() => {
    setDraftTasks((prev) => [
      ...prev,
      {
        description: '',
        priority: 'medium',
        dependenciesText: '',
        filesText: '',
      },
    ]);
  }, []);

  const removeDraftTask = useCallback((index: number) => {
    setDraftTasks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const saveDraftTasks = useCallback(async () => {
    const payload = draftTasks
      .map((task): DraftSpecTaskInput => ({
        ...(task.id ? { id: task.id } : {}),
        description: task.description.trim(),
        priority: task.priority,
        dependencies: splitCommaSeparated(task.dependenciesText),
        files: splitCommaSeparated(task.filesText),
      }))
      .filter((task) => task.description.length > 0);

    if (payload.length === 0) {
      setSaveError('At least one task with description is required.');
      return;
    }

    setIsSavingDraft(true);
    setSaveError(null);

    const success = await updateSpecDraft(payload);
    setIsSavingDraft(false);

    if (!success) {
      setSaveError('Failed to save draft tasks. Try again.');
      return;
    }

    setIsEditingDraft(false);
  }, [draftTasks, updateSpecDraft]);

  const handleApprove = useCallback(async () => {
    if (isEditingDraft || isSavingDraft) {
      return;
    }
    await approveSpec();
  }, [approveSpec, isEditingDraft, isSavingDraft]);

  return (
    <div className='flex flex-col h-full overflow-hidden font-sans'>
      <div className='flex items-center h-9 border-b border-[#2a2a33] flex-shrink-0 px-4 justify-between'>
        <span className='text-xs text-[#888892]'>Spec</span>
        {isDraft && (
          <div className='flex items-center gap-2'>
            {!isEditingDraft && (
              <button
                onClick={() => startEditingDraft()}
                className='text-[10px] text-[#6b8fd4] hover:text-[#93c5fd] transition-colors'
              >
                Edit Plan
              </button>
            )}
            <span className='text-[10px] text-[#f59e0b] bg-[#1c150c] border border-[#4a3a1e] px-1.5 py-0.5 rounded'>
              draft
            </span>
          </div>
        )}
      </div>

      <div className='px-4 py-2 flex-shrink-0 border-b border-[#2a2a33]'>
        <p className='text-[10px] tracking-widest text-[#505060] uppercase'>LIVING SPEC</p>
      </div>

      {isWaiting && (
        <div className='flex-shrink-0 px-4 py-3 border-b border-[#2a2a33] bg-[#1c150c]'>
          <p className='text-xs text-[#f59e0b] mb-2 leading-relaxed'>
            Coordinator가 계획을 세웠습니다. 필요하면 Edit Plan으로 수정하고, 승인하면 구현이 시작됩니다.
          </p>
          <button
            onClick={() => void handleApprove()}
            disabled={isEditingDraft || isSavingDraft}
            className='w-full py-1.5 bg-[#9333ea] hover:bg-[#7e22ce] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded transition-colors'
          >
            ✓ Approve Plan — Start Implementation
          </button>
        </div>
      )}

      <div className='flex-1 overflow-y-auto px-4 py-4 min-h-0'>
        {currentSpec === null ? (
          <div className='flex flex-col items-center justify-center h-full gap-2'>
            <p className='text-sm text-[#505060]'>No spec yet</p>
            <p className='text-xs text-[#383840] text-center leading-relaxed'>
              Coordinator가 목표를 분석하면<br />여기에 Living Spec이 생성됩니다.
            </p>
          </div>
        ) : isDraft && isEditingDraft ? (
          <DraftTaskEditor
            tasks={draftTasks}
            onTaskChange={updateTaskField}
            onAddTask={addDraftTask}
            onRemoveTask={removeDraftTask}
            onCancel={cancelEditingDraft}
            onSave={saveDraftTasks}
            isSaving={isSavingDraft}
            errorMessage={saveError}
          />
        ) : (
          <SpecContent spec={currentSpec} />
        )}
      </div>
    </div>
  );
});

interface DraftTaskEditorProps {
  tasks: DraftTaskForm[];
  onTaskChange: (index: number, patch: Partial<DraftTaskForm>) => void;
  onAddTask: () => void;
  onRemoveTask: (index: number) => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  errorMessage: string | null;
}

function DraftTaskEditor({
  tasks,
  onTaskChange,
  onAddTask,
  onRemoveTask,
  onCancel,
  onSave,
  isSaving,
  errorMessage,
}: DraftTaskEditorProps) {
  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <p className='text-xs text-[#888892]'>Edit draft tasklist before approval</p>
        <button
          onClick={onAddTask}
          className='text-[10px] text-[#6b8fd4] hover:text-[#93c5fd] transition-colors'
        >
          + Add Task
        </button>
      </div>

      {tasks.length === 0 && (
        <div className='rounded border border-[#2a2a33] bg-[#1c1c22] px-3 py-2'>
          <p className='text-xs text-[#666672]'>No tasks yet. Add at least one task.</p>
        </div>
      )}

      {tasks.map((task, index) => (
        <div key={`${task.id ?? 'new'}-${index}`} className='rounded border border-[#2a2a33] bg-[#1c1c22] p-3 space-y-2'>
          <div className='flex items-center justify-between'>
            <p className='text-[10px] text-[#888892] uppercase tracking-wider'>Task {index + 1}</p>
            <button
              onClick={() => onRemoveTask(index)}
              className='text-[10px] text-[#f87171] hover:text-[#ef4444] transition-colors'
            >
              Remove
            </button>
          </div>

          <textarea
            value={task.description}
            onChange={(e) => onTaskChange(index, { description: e.target.value })}
            rows={2}
            placeholder='Task description'
            className='w-full bg-[#111115] border border-[#2a2a33] rounded px-2 py-1.5 text-xs text-[#e4e4eb] placeholder-[#505060] focus:outline-none focus:border-[#6b8fd4] resize-y'
          />

          <div className='grid grid-cols-3 gap-2'>
            <select
              value={task.priority}
              onChange={(e) => onTaskChange(index, { priority: e.target.value as TaskPriority })}
              className='bg-[#111115] border border-[#2a2a33] rounded px-2 py-1.5 text-xs text-[#e4e4eb] focus:outline-none focus:border-[#6b8fd4]'
            >
              <option value='high'>high</option>
              <option value='medium'>medium</option>
              <option value='low'>low</option>
            </select>
            <input
              value={task.dependenciesText}
              onChange={(e) => onTaskChange(index, { dependenciesText: e.target.value })}
              placeholder='Dependencies (csv)'
              className='col-span-2 bg-[#111115] border border-[#2a2a33] rounded px-2 py-1.5 text-xs text-[#e4e4eb] placeholder-[#505060] focus:outline-none focus:border-[#6b8fd4]'
            />
          </div>

          <input
            value={task.filesText}
            onChange={(e) => onTaskChange(index, { filesText: e.target.value })}
            placeholder='Target files (csv)'
            className='w-full bg-[#111115] border border-[#2a2a33] rounded px-2 py-1.5 text-xs text-[#e4e4eb] placeholder-[#505060] focus:outline-none focus:border-[#6b8fd4]'
          />
        </div>
      ))}

      {errorMessage && (
        <div className='rounded border border-[#4a1e1e] bg-[#1c0c0c] px-3 py-2'>
          <p className='text-xs text-[#f87171]'>{errorMessage}</p>
        </div>
      )}

      <div className='flex gap-2 pt-1'>
        <button
          onClick={onCancel}
          className='flex-1 py-1.5 text-xs text-[#888892] hover:text-[#e4e4eb] transition-colors'
        >
          Cancel
        </button>
        <button
          onClick={() => void onSave()}
          disabled={isSaving}
          className='flex-1 py-1.5 bg-[#9333ea] hover:bg-[#7e22ce] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs rounded transition-colors'
        >
          {isSaving ? 'Saving...' : 'Save Draft'}
        </button>
      </div>
    </div>
  );
}

function SpecContent({ spec }: { spec: LivingSpecData }) {
  const done = spec.tasks.filter((t) => t.status === 'completed').length;
  const total = spec.tasks.length;

  return (
    <div className='space-y-5'>
      <div>
        <div className='flex items-center justify-between mb-1'>
          <h2 className='text-sm font-bold text-[#e4e4eb] leading-snug'>{spec.goal}</h2>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            spec.status === 'completed' ? 'bg-[#14532d] text-[#4ade80]' :
            spec.status === 'in_progress' ? 'bg-[#1e3a5f] text-[#60a5fa]' :
            spec.status === 'failed' ? 'bg-[#450a0a] text-[#f87171]' :
            'bg-[#1c1c22] text-[#888892]'
          }`}>
            {spec.status.replace('_', ' ')}
          </span>
        </div>
        {total > 0 && (
          <div className='flex items-center gap-2 mt-2'>
            <div className='flex-1 h-1 bg-[#2a2a33] rounded-full overflow-hidden'>
              <div
                className='h-full bg-[#22c55e] rounded-full transition-all duration-500'
                style={{ width: `${(done / total) * 100}%` }}
              />
            </div>
            <span className='text-[10px] text-[#666672]'>{done}/{total}</span>
          </div>
        )}
      </div>

      {spec.constraints.length > 0 && (
        <div className='space-y-1.5'>
          <h3 className='text-xs font-bold text-[#e4e4eb]'>Constraints</h3>
          <ul className='space-y-1'>
            {spec.constraints.map((c, i) => (
              <li key={i} className='flex items-start gap-1.5 text-xs text-[#c4c4cc]'>
                <span className='text-[#666672] mt-0.5 flex-shrink-0'>•</span>
                <span className='leading-relaxed'>{c.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {spec.tasks.length > 0 && (
        <div className='space-y-1.5'>
          <h3 className='text-xs font-bold text-[#e4e4eb]'>Tasks</h3>
          <div className='space-y-1'>
            {spec.tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {spec.context !== undefined && (
        <div className='space-y-1.5'>
          <h3 className='text-xs font-bold text-[#e4e4eb]'>Context</h3>
          <p className='text-xs text-[#c4c4cc] leading-relaxed'>{spec.context}</p>
        </div>
      )}

      <div className='text-[10px] text-[#383840] pt-2 border-t border-[#2a2a33]'>
        v{spec.version} · updated {new Date(spec.updatedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}

function TaskItem({ task }: { task: SpecTask }) {
  const icon =
    task.status === 'completed' ? '✓' :
    task.status === 'in_progress' ? '→' :
    task.status === 'failed' ? '✗' : '○';

  const color =
    task.status === 'completed' ? 'text-[#4ade80]' :
    task.status === 'in_progress' ? 'text-[#60a5fa]' :
    task.status === 'failed' ? 'text-[#f87171]' : 'text-[#505060]';

  return (
    <div className='flex items-start gap-2 py-1'>
      <span className={`text-xs flex-shrink-0 mt-0.5 font-mono ${color} ${task.status === 'in_progress' ? 'animate-pulse' : ''}`}>
        {icon}
      </span>
      <div className='flex-1 min-w-0'>
        <p className='text-xs text-[#c4c4cc] leading-relaxed'>{task.description}</p>
        {task.files.length > 0 && (
          <div className='flex flex-wrap gap-1 mt-1'>
            {task.files.map((f, i) => (
              <span key={i} className='text-[10px] font-mono text-[#6b8fd4] bg-[#111115] border border-[#2a2a33] px-1 py-0.5 rounded'>
                {f.split('/').pop()}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
