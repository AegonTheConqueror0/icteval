import React, { useMemo, useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { Check, Copy, Database, Download, FileCode2, FileJson, Search, Trash2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { BSMT_SECTIONS, EvaluationRecord, LabActivity } from '../types';
import {
  downloadTextFile,
  generateCsvExport,
  generateJsonExport,
  generateSqlExport,
} from '../utils/exportDatabase';
import { LiquidGlassButton } from './LiquidGlassButton';

interface ResultsExportViewProps {
  activities: LabActivity[];
  evaluations: EvaluationRecord[];
  loadingEvaluations: boolean;
}

export function ResultsExportView({
  activities,
  evaluations,
  loadingEvaluations,
}: ResultsExportViewProps) {
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showSqlPreview, setShowSqlPreview] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredEvaluations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return evaluations.filter((ev) => {
      if (activityFilter !== 'all' && ev.activityId !== activityFilter) return false;
      if (sectionFilter !== 'all' && ev.section !== sectionFilter) return false;
      if (query) {
        const hay = `${ev.activityTitle} ${ev.section} ${ev.feedback} ${ev.studentName} ${ev.studentEmail}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [evaluations, activityFilter, sectionFilter, searchTerm]);

  const metrics = useMemo(() => {
    const n = filteredEvaluations.length;
    if (n === 0) {
      return {
        count: 0,
        teachingAvg: 0,
        activityAvg: 0,
        classAvg: 0,
      };
    }
    const tchSum = filteredEvaluations.reduce((s, e) => s + e.teachingRating, 0);
    const actSum = filteredEvaluations.reduce((s, e) => s + e.activityRating, 0);
    const clsSum = filteredEvaluations.reduce((s, e) => s + e.classRating, 0);
    return {
      count: n,
      teachingAvg: tchSum / n,
      activityAvg: actSum / n,
      classAvg: clsSum / n,
    };
  }, [filteredEvaluations]);

  const activityBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        activity: LabActivity;
        count: number;
        tchSum: number;
        actSum: number;
        clsSum: number;
      }
    >();

    for (const act of activities) {
      map.set(act.id, { activity: act, count: 0, tchSum: 0, actSum: 0, clsSum: 0 });
    }

    for (const ev of filteredEvaluations) {
      const existing = map.get(ev.activityId);
      if (existing) {
        existing.count += 1;
        existing.tchSum += ev.teachingRating;
        existing.actSum += ev.activityRating;
        existing.clsSum += ev.classRating;
      }
    }

    return Array.from(map.values()).filter(
      (row) => activityFilter === 'all' || row.activity.id === activityFilter
    );
  }, [activities, filteredEvaluations, activityFilter]);

  const sqlOutput = useMemo(
    () => generateSqlExport(activities, filteredEvaluations),
    [activities, filteredEvaluations]
  );

  const dateStamp = new Date().toISOString().slice(0, 10);

  const handleExportSql = () => {
    downloadTextFile(`bsmt-ict-evaluations-${dateStamp}.sql`, sqlOutput, 'application/sql');
  };

  const handleExportCsv = () => {
    const csv = generateCsvExport(activities, filteredEvaluations);
    downloadTextFile(`bsmt-ict-evaluations-${dateStamp}.csv`, csv, 'text/csv');
  };

  const handleExportJson = () => {
    const json = generateJsonExport(activities, filteredEvaluations);
    downloadTextFile(`bsmt-ict-evaluations-${dateStamp}.json`, json, 'application/json');
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(sqlOutput);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // Clipboard fallback ignored if blocked
    }
  };

  const handleDeleteEvaluation = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'evaluations', id));
      setConfirmDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `evaluations/${id}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Results & Database Export
          </h1>
          <p className="text-sm text-slate-400">
            Student evaluations of your teaching effectiveness, web-based laboratory assessments, and deployed web simulations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <LiquidGlassButton variant="accent" size="md" onClick={handleExportSql}>
            <Database className="w-4 h-4" />
            <span>Export SQL (.sql)</span>
          </LiquidGlassButton>
          <LiquidGlassButton variant="default" size="md" onClick={handleExportCsv}>
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </LiquidGlassButton>
          <LiquidGlassButton variant="subtle" size="md" onClick={handleExportJson}>
            <FileJson className="w-4 h-4" />
            <span>Export JSON</span>
          </LiquidGlassButton>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          aria-label="Filter by laboratory activity"
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value)}
          className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-fuchsia-400/70"
        >
          <option value="all" className="bg-[#0e1017]">
            All Laboratory Sessions ({activities.length})
          </option>
          {activities.map((a) => (
            <option key={a.id} value={a.id} className="bg-[#0e1017]">
              {a.code} — {a.title}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by class section"
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-fuchsia-400/70"
        >
          <option value="all" className="bg-[#0e1017]">
            All BSMT Sections
          </option>
          {BSMT_SECTIONS.map((sec) => (
            <option key={sec} value={sec} className="bg-[#0e1017]">
              {sec}
            </option>
          ))}
        </select>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search comments or student name..."
            aria-label="Search comments or student name"
            className="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.1] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-400/70"
          />
        </div>
      </div>

      {/* 4-column Summary Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white/[0.03] border border-white/[0.09] rounded-2xl divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
        <div className="p-5 sm:p-6 space-y-1">
          <p className="text-xs text-slate-400">Responses</p>
          <p className="text-2xl sm:text-3xl font-semibold font-mono-tabular text-white">
            {metrics.count}
          </p>
          <p className="text-xs text-slate-500">Submitted evaluations</p>
        </div>

        <div className="p-5 sm:p-6 space-y-1">
          <p className="text-xs text-slate-400">Teaching Effectiveness</p>
          <p className="text-2xl sm:text-3xl font-semibold font-mono-tabular text-white">
            {metrics.count > 0 ? metrics.teachingAvg.toFixed(2) : '—'}
            <span className="text-sm text-slate-400 font-normal"> / 5</span>
          </p>
          <p className="text-xs text-slate-500">Instruction clarity & guidance</p>
        </div>

        <div className="p-5 sm:p-6 space-y-1">
          <p className="text-xs text-slate-400">Web Labs & Simulations</p>
          <p className="text-2xl sm:text-3xl font-semibold font-mono-tabular text-white">
            {metrics.count > 0 ? metrics.activityAvg.toFixed(2) : '—'}
            <span className="text-sm text-slate-400 font-normal"> / 5</span>
          </p>
          <p className="text-xs text-slate-500">Web assessment effectiveness</p>
        </div>

        <div className="p-5 sm:p-6 space-y-1">
          <p className="text-xs text-slate-400">Class Experience</p>
          <p className="text-2xl sm:text-3xl font-semibold font-mono-tabular text-white">
            {metrics.count > 0 ? metrics.classAvg.toFixed(2) : '—'}
            <span className="text-sm text-slate-400 font-normal"> / 5</span>
          </p>
          <p className="text-xs text-slate-500">Overall class session</p>
        </div>
      </div>

      {/* SQL Database Preview Toggle */}
      <div className="bg-white/[0.03] border border-white/[0.09] rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">
              Relational Database Export Preview
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Compatible with MySQL, PostgreSQL, and SQLite (<span className="font-mono-tabular">lab_activities</span> and <span className="font-mono-tabular">evaluations</span> tables).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LiquidGlassButton
              variant="subtle"
              size="sm"
              onClick={() => setShowSqlPreview((v) => !v)}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>{showSqlPreview ? 'Hide SQL' : 'Inspect SQL'}</span>
            </LiquidGlassButton>
            <LiquidGlassButton
              variant="subtle"
              size="sm"
              onClick={handleCopySql}
            >
              {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
            </LiquidGlassButton>
          </div>
        </div>

        {showSqlPreview && (
          <pre className="p-4 rounded-xl bg-[#05060a] border border-white/[0.08] text-xs font-mono-tabular text-slate-300 overflow-x-auto max-h-72 leading-relaxed">
            {sqlOutput}
          </pre>
        )}
      </div>

      {/* Per-Activity Breakdown Table */}
      <div className="bg-white/[0.03] border border-white/[0.09] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            Ratings by Laboratory Session
          </h2>
          <span className="text-xs font-mono-tabular text-slate-400">
            {activityBreakdown.length} sessions
          </span>
        </div>

        {loadingEvaluations ? (
          <div className="p-6 space-y-3">
            <div className="h-10 bg-white/[0.04] rounded-lg animate-pulse" />
            <div className="h-10 bg-white/[0.04] rounded-lg animate-pulse" />
          </div>
        ) : activityBreakdown.length === 0 ? (
          <div className="p-8 text-sm text-slate-400">
            No laboratory activities match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-xs text-slate-400">
                  <th className="py-3 px-6 font-medium">Laboratory Session</th>
                  <th className="py-3 px-4 font-medium text-right">Responses</th>
                  <th className="py-3 px-4 font-medium text-right">Teaching</th>
                  <th className="py-3 px-4 font-medium text-right">Web Lab</th>
                  <th className="py-3 px-6 font-medium text-right">Class</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-sm">
                {activityBreakdown.map(({ activity, count, tchSum, actSum, clsSum }) => {
                  const tchAvg = count > 0 ? (tchSum / count).toFixed(2) : '—';
                  const actAvg = count > 0 ? (actSum / count).toFixed(2) : '—';
                  const clsAvg = count > 0 ? (clsSum / count).toFixed(2) : '—';
                  return (
                    <tr
                      key={activity.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3.5 px-6">
                        <div className="font-medium text-white">
                          {activity.code} · {activity.title}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {activity.topic} · <span className="font-mono-tabular">{activity.sessionDate}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-tabular text-slate-200">
                        {count}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-tabular text-white font-medium">
                        {tchAvg}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-tabular text-slate-200">
                        {actAvg}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono-tabular text-slate-200">
                        {clsAvg}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Feedback Feed */}
      <div className="bg-white/[0.03] border border-white/[0.09] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            Student Comments & Feedback
          </h2>
          <span className="text-xs font-mono-tabular text-slate-400">
            {filteredEvaluations.length} entries
          </span>
        </div>

        {loadingEvaluations ? (
          <div className="p-6 space-y-4">
            <div className="h-20 bg-white/[0.04] rounded-xl animate-pulse" />
            <div className="h-20 bg-white/[0.04] rounded-xl animate-pulse" />
          </div>
        ) : filteredEvaluations.length === 0 ? (
          <div className="p-8 text-sm text-slate-400">
            No student evaluations recorded for the selected filters yet.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.07]">
            {filteredEvaluations.map((ev) => (
              <div key={ev.id} className="p-6 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                    <span className="text-slate-200 font-medium">{ev.activityTitle}</span>
                    <span aria-hidden="true">·</span>
                    <span>{ev.section}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{ev.sessionDate}</span>
                    <span aria-hidden="true">·</span>
                    {ev.isAnonymous ? (
                      <span>Anonymous Profile</span>
                    ) : (
                      <span className="text-slate-200">
                        {ev.studentName} ({ev.studentEmail})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono-tabular text-slate-300">
                      Teaching {ev.teachingRating}/5 · Web Lab {ev.activityRating}/5 · Class {ev.classRating}/5
                    </span>

                    {confirmDeleteId === ev.id ? (
                      <div className="flex items-center gap-1.5">
                        <LiquidGlassButton
                          variant="danger"
                          size="sm"
                          disabled={deletingId === ev.id}
                          onClick={() => handleDeleteEvaluation(ev.id)}
                        >
                          {deletingId === ev.id ? 'Removing...' : 'Confirm'}
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
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(ev.id)}
                        title="Delete entry"
                        aria-label="Delete feedback entry"
                        className="p-2 rounded-full text-slate-400 hover:text-rose-300 hover:bg-white/[0.06] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-200 leading-relaxed">
                  {ev.feedback ? (
                    ev.feedback
                  ) : (
                    <span className="text-slate-500 italic">
                      No written comment submitted (ratings only).
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
