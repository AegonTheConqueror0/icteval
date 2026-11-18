import React, { useState } from 'react';
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { Archive, Check, Copy, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  ActivityStatus,
  BLUEPRINT_LIMITS,
  DEFAULT_BSMT_LAB_ACTIVITIES,
  LabActivity,
} from '../types';
import { LiquidGlassButton } from './LiquidGlassButton';

interface ManageLabsViewProps {
  activities: LabActivity[];
}

export function ManageLabsView({ activities }: ManageLabsViewProps) {
  const [code, setCode] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [sessionDate, setSessionDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState<boolean>(false);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editTopic, setEditTopic] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = code.trim().slice(0, BLUEPRINT_LIMITS.codeMaxLength);
    const cleanTitle = title.trim().slice(0, BLUEPRINT_LIMITS.titleMaxLength);
    const cleanTopic = topic.trim().slice(0, BLUEPRINT_LIMITS.topicMaxLength);

    if (cleanCode.length < BLUEPRINT_LIMITS.codeMinLength) {
      setFormError('Lab code must be at least 2 characters (e.g. LAB-06).');
      return;
    }
    if (cleanTitle.length < BLUEPRINT_LIMITS.titleMinLength) {
      setFormError('Activity title must be at least 3 characters.');
      return;
    }
    if (cleanTopic.length < BLUEPRINT_LIMITS.topicMinLength) {
      setFormError('Topic must be at least 2 characters.');
      return;
    }
    if (!BLUEPRINT_LIMITS.datePattern.test(sessionDate)) {
      setFormError('Session date must use YYYY-MM-DD format.');
      return;
    }

    const activityId = `lab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setSaving(true);
    try {
      await setDoc(doc(db, 'lab_activities', activityId), {
        code: cleanCode,
        title: cleanTitle,
        topic: cleanTopic,
        sessionDate,
        status: 'active',
        createdAt: serverTimestamp(),
      });
      setCode('');
      setTitle('');
      setTopic('');
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `lab_activities/${activityId}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      for (const template of DEFAULT_BSMT_LAB_ACTIVITIES) {
        await setDoc(doc(db, 'lab_activities', template.id), {
          code: template.code,
          title: template.title,
          topic: template.topic,
          sessionDate: template.sessionDate,
          status: template.status,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'lab_activities');
    } finally {
      setSeeding(false);
    }
  };

  const handleToggleStatus = async (activity: LabActivity) => {
    const nextStatus: ActivityStatus =
      activity.status === 'active' ? 'archived' : 'active';
    setBusyId(activity.id);
    try {
      await updateDoc(doc(db, 'lab_activities', activity.id), {
        status: nextStatus,
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `lab_activities/${activity.id}`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleStartEdit = (activity: LabActivity) => {
    setConfirmDeleteId(null);
    setEditError(null);
    setEditingId(activity.id);
    setEditCode(activity.code);
    setEditTitle(activity.title);
    setEditTopic(activity.topic);
    setEditDate(activity.sessionDate);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent, activityId: string) => {
    e.preventDefault();
    setEditError(null);

    const cleanCode = editCode.trim().slice(0, BLUEPRINT_LIMITS.codeMaxLength);
    const cleanTitle = editTitle.trim().slice(0, BLUEPRINT_LIMITS.titleMaxLength);
    const cleanTopic = editTopic.trim().slice(0, BLUEPRINT_LIMITS.topicMaxLength);

    if (cleanCode.length < BLUEPRINT_LIMITS.codeMinLength) {
      setEditError('Lab code must be at least 2 characters.');
      return;
    }
    if (cleanTitle.length < BLUEPRINT_LIMITS.titleMinLength) {
      setEditError('Title must be at least 3 characters.');
      return;
    }
    if (cleanTopic.length < BLUEPRINT_LIMITS.topicMinLength) {
      setEditError('Topic must be at least 2 characters.');
      return;
    }
    if (!BLUEPRINT_LIMITS.datePattern.test(editDate)) {
      setEditError('Session date must use YYYY-MM-DD format.');
      return;
    }

    setBusyId(activityId);
    try {
      await updateDoc(doc(db, 'lab_activities', activityId), {
        code: cleanCode,
        title: cleanTitle,
        topic: cleanTopic,
        sessionDate: editDate,
      });
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `lab_activities/${activityId}`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    setBusyId(activityId);
    try {
      await deleteDoc(doc(db, 'lab_activities', activityId));
      setConfirmDeleteId(null);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `lab_activities/${activityId}`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleCopyLink = async (activityId: string) => {
    const url = `${window.location.origin}/?lab=${encodeURIComponent(activityId)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(activityId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Manage Web Labs & Simulations
          </h1>
          <p className="text-sm text-slate-400">
            Publish web-based ICT laboratory assessments or deployed web simulations and copy direct links for students.
          </p>
        </div>

        {activities.length === 0 && (
          <LiquidGlassButton
            variant="accent"
            disabled={seeding}
            onClick={handleSeedDefaults}
          >
            <span>{seeding ? 'Loading Sessions...' : 'Load Sample BSMT Lab Sessions'}</span>
          </LiquidGlassButton>
        )}
      </div>

      {/* Add Lab Activity Form */}
      <form
        onSubmit={handleCreateActivity}
        className="bg-white/[0.03] border border-white/[0.09] rounded-2xl p-6 sm:p-8 space-y-5"
      >
        <h2 className="text-base font-semibold text-white">
          Add Laboratory Session or Web Simulation
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="lab-code" className="text-xs text-slate-300 block">
              Code
            </label>
            <input
              id="lab-code"
              type="text"
              required
              maxLength={BLUEPRINT_LIMITS.codeMaxLength}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="LAB-06"
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0e1017] border border-white/[0.14] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-400/70"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="lab-title" className="text-xs text-slate-300 block">
              Web Lab / Simulation Title
            </label>
            <input
              id="lab-title"
              type="text"
              required
              maxLength={BLUEPRINT_LIMITS.titleMaxLength}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Deployed Radar Plotting Web Simulation"
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0e1017] border border-white/[0.14] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-400/70"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="lab-date" className="text-xs text-slate-300 block">
              Session Date
            </label>
            <input
              id="lab-date"
              type="date"
              required
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0e1017] border border-white/[0.14] text-sm font-mono-tabular text-white focus:outline-none focus:border-fuchsia-400/70"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="lab-topic" className="text-xs text-slate-300 block">
              Assessment Type & Module Focus
            </label>
            <input
              id="lab-topic"
              type="text"
              required
              maxLength={BLUEPRINT_LIMITS.topicMaxLength}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Web Simulation · CPA, Bearing & Navigation Plotting"
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0e1017] border border-white/[0.14] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-400/70"
            />
          </div>

          <LiquidGlassButton
            type="submit"
            variant="accent"
            disabled={saving}
          >
            <Plus className="w-4 h-4" />
            <span>{saving ? 'Adding...' : 'Publish Session'}</span>
          </LiquidGlassButton>
        </div>

        {formError && (
          <p role="alert" className="text-sm text-rose-300">
            {formError}
          </p>
        )}
      </form>

      {/* Existing Activities List */}
      <div className="bg-white/[0.03] border border-white/[0.09] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            Published Laboratory Sessions
          </h2>
          <span className="text-xs font-mono-tabular text-slate-400">
            {activities.length} total
          </span>
        </div>

        {activities.length === 0 ? (
          <div className="p-8 text-sm text-slate-400">
            No laboratory sessions yet. Use the form above or load the sample BS Marine Transportation sessions.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.07]">
            {activities.map((act) => (
              <div key={act.id} className="p-5 sm:px-6">
                {editingId === act.id ? (
                  <form
                    onSubmit={(e) => handleSaveEdit(e, act.id)}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label
                          htmlFor={`edit-code-${act.id}`}
                          className="text-xs text-slate-300 block"
                        >
                          Code
                        </label>
                        <input
                          id={`edit-code-${act.id}`}
                          type="text"
                          required
                          maxLength={BLUEPRINT_LIMITS.codeMaxLength}
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#0e1017] border border-white/[0.16] text-sm text-white focus:outline-none focus:border-fuchsia-400/70"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label
                          htmlFor={`edit-title-${act.id}`}
                          className="text-xs text-slate-300 block"
                        >
                          Laboratory Session Name
                        </label>
                        <input
                          id={`edit-title-${act.id}`}
                          type="text"
                          required
                          maxLength={BLUEPRINT_LIMITS.titleMaxLength}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#0e1017] border border-white/[0.16] text-sm text-white focus:outline-none focus:border-fuchsia-400/70"
                        />
                      </div>

                      <div className="space-y-1">
                        <label
                          htmlFor={`edit-date-${act.id}`}
                          className="text-xs text-slate-300 block"
                        >
                          Session Date
                        </label>
                        <input
                          id={`edit-date-${act.id}`}
                          type="date"
                          required
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#0e1017] border border-white/[0.16] text-sm font-mono-tabular text-white focus:outline-none focus:border-fuchsia-400/70"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                      <div className="flex-1 space-y-1">
                        <label
                          htmlFor={`edit-topic-${act.id}`}
                          className="text-xs text-slate-300 block"
                        >
                          Assessment Type & Module Focus
                        </label>
                        <input
                          id={`edit-topic-${act.id}`}
                          type="text"
                          required
                          maxLength={BLUEPRINT_LIMITS.topicMaxLength}
                          value={editTopic}
                          onChange={(e) => setEditTopic(e.target.value)}
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#0e1017] border border-white/[0.16] text-sm text-white focus:outline-none focus:border-fuchsia-400/70"
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <LiquidGlassButton
                          type="submit"
                          variant="accent"
                          size="sm"
                          disabled={busyId === act.id}
                        >
                          <span>{busyId === act.id ? 'Saving...' : 'Save Changes'}</span>
                        </LiquidGlassButton>
                        <LiquidGlassButton
                          type="button"
                          variant="subtle"
                          size="sm"
                          disabled={busyId === act.id}
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </LiquidGlassButton>
                      </div>
                    </div>

                    {editError && (
                      <p role="alert" className="text-xs text-rose-300">
                        {editError}
                      </p>
                    )}
                  </form>
                ) : (
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-white">
                        {act.code} · {act.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                        <span>{act.topic}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">{act.sessionDate}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            act.status === 'active' ? 'text-emerald-300' : 'text-slate-500'
                          }
                        >
                          {act.status === 'active' ? 'Active' : 'Archived'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {act.status === 'active' && (
                        <LiquidGlassButton
                          variant="subtle"
                          size="sm"
                          onClick={() => handleCopyLink(act.id)}
                        >
                          {copiedId === act.id ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {copiedId === act.id ? 'Link Copied' : 'Copy Student Link'}
                          </span>
                        </LiquidGlassButton>
                      )}

                      <LiquidGlassButton
                        variant="subtle"
                        size="sm"
                        disabled={busyId === act.id}
                        onClick={() => handleStartEdit(act)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </LiquidGlassButton>

                      <LiquidGlassButton
                        variant="subtle"
                        size="sm"
                        disabled={busyId === act.id}
                        onClick={() => handleToggleStatus(act)}
                      >
                        {act.status === 'active' ? (
                          <>
                            <Archive className="w-3.5 h-3.5" />
                            <span>Archive</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </>
                        )}
                      </LiquidGlassButton>

                      {confirmDeleteId === act.id ? (
                        <div className="flex items-center gap-1.5">
                          <LiquidGlassButton
                            variant="danger"
                            size="sm"
                            disabled={busyId === act.id}
                            onClick={() => handleDeleteActivity(act.id)}
                          >
                            Confirm Delete
                          </LiquidGlassButton>
                          <LiquidGlassButton
                            variant="subtle"
                            size="sm"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </LiquidGlassButton>
                        </div>
                      ) : (
                        <LiquidGlassButton
                          variant="subtle"
                          size="sm"
                          onClick={() => setConfirmDeleteId(act.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </LiquidGlassButton>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
