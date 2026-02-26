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
  const { currentSpec, approveSpec, updateSpecDraft, pipelineStatus, autoApprove, setAutoApprove } = useAgentStore();
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
    <div className='flex flex-col h-full overflow-hidden font-sans bg-[#0b0d12]'>
      <div className='flex items-center h-[40px] border-b border-[#1c222d] flex-shrink-0 px-5 justify-between bg-[#0b0d12] shadow-sm'>
        <div className='flex items-center gap-5'>
          <span className='text-[9px] font-black uppercase tracking-[0.2em] text-[#505060] opacity-80'>Living Spec</span>
          <label className='flex items-center gap-2 cursor-pointer group' onClick={() => setAutoApprove(!autoApprove)}>
            <div className={`w-7 h-4 rounded-full transition-all relative ${autoApprove ? 'bg-[#4f8cff] shadow-[0_0_8px_rgba(79,140,255,0.3)]' : 'bg-[#1c222d]'}`}>
              <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-300 ${autoApprove ? 'translate-x-3' : ''}`} />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-tighter transition-colors ${autoApprove ? 'text-[#4f8cff]' : 'text-[#505060] group-hover:text-[#a1acc5]'}`}>
              Yolo Mode
            </span>
          </label>
        </div>
        {isDraft && (
          <div className='flex items-center gap-4'>
            {!isEditingDraft && (
              <button
                onClick={() => startEditingDraft()}
                className='text-[9px] font-black text-[#4f8cff] hover:text-[#8bb8ff] transition-all uppercase tracking-widest'
              >
                EDIT PLAN
              </button>
            )}
            <span className='text-[8px] font-black text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20 px-2 py-0.5 rounded-md uppercase tracking-tighter'>
              draft
            </span>
          </div>
        )}
      </div>

      {isWaiting && (
        <div className='flex-shrink-0 px-5 py-5 border-b border-[#1c222d] bg-[#1c150c]/30 backdrop-blur-sm'>
          <p className='text-[11px] text-[#f59e0b] mb-4 leading-relaxed font-medium opacity-90'>
            Review the proposed plan. You can refine the tasklist or approve to begin the implementation phase.
          </p>
          <button
            onClick={() => void handleApprove()}
            disabled={isEditingDraft || isSavingDraft}
            className='w-full py-2.5 bg-[#4f8cff] hover:bg-[#3b82f6] disabled:opacity-20 disabled:grayscale text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl shadow-blue-500/10 active:scale-[0.98]'
          >
            ✓ APPROVE & START
          </button>
        </div>
      )}

      <div className='flex-1 overflow-y-auto px-6 py-6 min-h-0 custom-scrollbar'>
        {currentSpec === null ? (
          <div className='flex flex-col items-center justify-center h-full gap-6 opacity-30'>
             <div className='w-16 h-16 rounded-[24px] border-2 border-[#1c222d] flex items-center justify-center bg-[#131722]/20 -rotate-3'>
              <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#505060' strokeWidth='2' className='rotate-3'>
                <path d='M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z' /><polyline points='14 2 14 8 20 8' />
              </svg>
            </div>
            <div className='text-center'>
              <p className='text-[10px] font-black uppercase tracking-[0.3em] text-[#505060]'>No Active Spec</p>
              <p className='text-[10px] text-[#383840] mt-2 font-mono font-bold tracking-tight'>WAITING FOR COORDINATOR ANALYSIS...</p>
            </div>
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
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <p className='text-[10px] text-[#505060] font-bold uppercase tracking-widest'>Edit Plan</p>
        <button
          onClick={onAddTask}
          className='text-[10px] text-[#4f8cff] hover:text-[#8bb8ff] font-bold uppercase'
        >
          + Add Task
        </button>
      </div>

      <div className='space-y-3'>
        {tasks.map((task, index) => (
          <div key={`${task.id ?? 'new'}-${index}`} className='rounded-xl border border-[#1c222d] bg-[#131722]/30 p-4 space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-[9px] font-bold text-[#505060] uppercase tracking-widest'>Task {index + 1}</span>
              <button
                onClick={() => onRemoveTask(index)}
                className='text-[9px] text-[#ef4444] hover:text-[#f87171] uppercase'
              >
                Remove
              </button>
            </div>

            <textarea
              value={task.description}
              onChange={(e) => onTaskChange(index, { description: e.target.value })}
              rows={2}
              placeholder='Task description'
              className='w-full bg-[#0b0d12] border border-[#1c222d] rounded-lg px-3 py-2 text-xs text-[#e4e4eb] placeholder-[#383840] focus:outline-none focus:border-[#4f8cff] resize-none'
            />

            <div className='grid grid-cols-3 gap-2'>
              <select
                value={task.priority}
                onChange={(e) => onTaskChange(index, { priority: e.target.value as TaskPriority })}
                className='bg-[#0b0d12] border border-[#1c222d] rounded-lg px-2 py-1.5 text-[10px] text-[#a1acc5] focus:outline-none appearance-none'
              >
                <option value='high'>High</option>
                <option value='medium'>Medium</option>
                <option value='low'>Low</option>
              </select>
              <input
                value={task.dependenciesText}
                onChange={(e) => onTaskChange(index, { dependenciesText: e.target.value })}
                placeholder='Deps (id, id)'
                className='col-span-2 bg-[#0b0d12] border border-[#1c222d] rounded-lg px-3 py-1.5 text-[10px] text-[#a1acc5] placeholder-[#383840] focus:outline-none'
              />
            </div>

            <input
              value={task.filesText}
              onChange={(e) => onTaskChange(index, { filesText: e.target.value })}
              placeholder='Target files (comma separated)'
              className='w-full bg-[#0b0d12] border border-[#1c222d] rounded-lg px-3 py-1.5 text-[10px] text-[#a1acc5] placeholder-[#383840] focus:outline-none'
            />
          </div>
        ))}
      </div>

      {errorMessage && (
        <div className='rounded-lg border border-[#4a1e1e] bg-[#1c0c0c] px-3 py-2'>
          <p className='text-[10px] text-[#f87171]'>{errorMessage}</p>
        </div>
      )}

      <div className='flex gap-2 pt-2'>
        <button
          onClick={onCancel}
          className='flex-1 py-2 text-[11px] font-bold text-[#505060] hover:text-[#e4e4eb] transition-colors uppercase tracking-widest'
        >
          Cancel
        </button>
        <button
          onClick={() => void onSave()}
          disabled={isSaving}
          className='flex-1 py-2 bg-[#1b315e] hover:bg-[#254585] disabled:opacity-50 text-[#cfe0ff] text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all'
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
    <div className='space-y-8'>
      <div className='space-y-4'>
        <div>
          <div className='flex items-start justify-between gap-3 mb-2'>
            <h2 className='text-sm font-bold text-[#e4e4eb] leading-snug'>{spec.goal}</h2>
            <span className={`flex-shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${
              spec.status === 'completed' ? 'bg-[#0c1c0c] text-[#4ade80]' :
              spec.status === 'in_progress' ? 'bg-[#1b315e] text-[#cfe0ff]' :
              spec.status === 'failed' ? 'bg-[#1c0c0c] text-[#ef4444]' :
              'bg-[#131722] text-[#666672]'
            }`}>
              {spec.status.replace('_', ' ')}
            </span>
          </div>
          {total > 0 && (
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between text-[9px]'>
                <span className='text-[#505060] font-bold uppercase tracking-tighter'>Progress</span>
                <span className='text-[#888892] font-mono'>{done}/{total}</span>
              </div>
              <div className='h-1 bg-[#1c222d] rounded-full overflow-hidden'>
                <div
                  className='h-full bg-[#4f8cff] rounded-full transition-all duration-700 ease-out'
                  style={{ width: `${(done / total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {spec.constraints.length > 0 && (
          <div className='space-y-3'>
            <h3 className='text-[10px] font-bold text-[#505060] uppercase tracking-widest'>Constraints</h3>
            <div className='space-y-2'>
              {spec.constraints.map((c, i) => (
                <div key={i} className='flex items-start gap-3 p-3 rounded-xl bg-[#131722]/30 border border-[#1c222d]'>
                  <div className='w-1 h-1 rounded-full bg-[#383840] mt-1.5 flex-shrink-0' />
                  <p className='text-[11px] text-[#a1acc5] leading-relaxed'>{c.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className='space-y-3'>
        <h3 className='text-[10px] font-bold text-[#505060] uppercase tracking-widest'>Implementation Plan</h3>
        <div className='space-y-1'>
          {spec.tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      </div>

      {spec.context && (
        <div className='space-y-2'>
          <h3 className='text-[10px] font-bold text-[#505060] uppercase tracking-widest'>Architectural Context</h3>
          <p className='text-[11px] text-[#666672] leading-relaxed italic'>{spec.context}</p>
        </div>
      )}

      <div className='flex items-center justify-between pt-6 border-t border-[#1c222d] opacity-40'>
         <span className='text-[9px] font-mono text-[#383840] uppercase tracking-widest'>Spec Version {spec.version}</span>
         <span className='text-[9px] font-mono text-[#383840]'>{new Date(spec.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      </div>
    </div>
  );
}

function TaskItem({ task }: { task: SpecTask }) {
  const isDone = task.status === 'completed';
  const isActive = task.status === 'in_progress';
  const isFailed = task.status === 'failed';

  return (
    <div className={`group flex items-start gap-4 p-3 rounded-xl transition-all ${
      isActive ? 'bg-[#1b315e]/20 border border-[#1b315e]/30' : 'hover:bg-[#131722]/40'
    }`}>
      <div className={`flex-shrink-0 w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
        isDone ? 'bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]' :
        isActive ? 'bg-[#4f8cff]/10 border-[#4f8cff]/20 text-[#4f8cff] animate-pulse' :
        isFailed ? 'bg-[#ef4444]/10 border-[#ef4444]/20 text-[#ef4444]' :
        'bg-[#0b0d12] border-[#1c222d] text-[#383840]'
      }`}>
        {isDone ? (
          <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='4'>
            <polyline points='20 6 9 17 4 12' />
          </svg>
        ) : isActive ? (
          <div className='w-1 h-1 rounded-full bg-current' />
        ) : isFailed ? (
          <span className='text-[10px] font-bold'>✕</span>
        ) : (
          <span className='text-[8px] font-bold'>{task.priority?.[0]?.toUpperCase() ?? 'M'}</span>
        )}
      </div>

      <div className='flex-1 min-w-0'>
        <p className={`text-[11px] leading-relaxed transition-colors ${
          isDone ? 'text-[#505060] line-through' :
          isActive ? 'text-[#cfe0ff] font-medium' :
          'text-[#a1acc5]'
        }`}>
          {task.description}
        </p>
        {task.files.length > 0 && !isDone && (
          <div className='flex flex-wrap gap-1.5 mt-2'>
            {task.files.map((f, i) => (
              <span key={i} className='text-[8px] font-mono text-[#4f8cff] bg-[#0b0d12] border border-[#1c222d] px-1.5 py-0.5 rounded transition-colors group-hover:border-[#262d3d]'>
                {f.split('/').pop()}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
