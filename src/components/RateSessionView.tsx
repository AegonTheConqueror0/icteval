import React, { useEffect, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Check, EyeOff, RotateCcw, Send, UserCheck } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  BLUEPRINT_LIMITS,
  BSMT_SECTIONS,
  isHcdcEmail,
  isTeacherEmail,
  LabActivity,
} from '../types';
import { LiquidGlassButton, RatingScaleControl } from './LiquidGlassButton';

interface RateSessionViewProps {
  activities: LabActivity[];
  loadingActivities: boolean;
  preselectedActivityId?: string;
  signedInEmail: string | null;
  signedInName: string | null;
  isGoogleAuth: boolean;
}

export function RateSessionView({
  activities,
  loadingActivities,
  preselectedActivityId,
  signedInEmail,
  signedInName,
  isGoogleAuth,
}: RateSessionViewProps) {
  const activeActivities = activities.filter((a) => a.status === 'active');

  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [section, setSection] = useState<string>('BSMT-1A');
  const [teachingRating, setTeachingRating] = useState<number>(0);
  const [activityRating, setActivityRating] = useState<number>(0);
  const [classRating, setClassRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [useAnonymousProfile, setUseAnonymousProfile] = useState<boolean>(
    !signedInEmail
  );
  const [typedName, setTypedName] = useState<string>(signedInName || '');
  const [typedEmail, setTypedEmail] = useState<string>(signedInEmail || '');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedSummary, setSubmittedSummary] = useState<{
    title: string;
    anonymous: boolean;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (signedInEmail) {
      setTypedEmail(signedInEmail);
      if (signedInName) {
        setTypedName(signedInName);
      }
      if (!isTeacherEmail(signedInEmail)) {
        setUseAnonymousProfile(false);
      }
    }
  }, [signedInEmail, signedInName]);

  useEffect(() => {
    if (activeActivities.length === 0) {
      setSelectedActivityId('');
      return;
    }
    if (
      preselectedActivityId &&
      activeActivities.some((a) => a.id === preselectedActivityId)
    ) {
      setSelectedActivityId(preselectedActivityId);
      return;
    }
    if (!activeActivities.some((a) => a.id === selectedActivityId)) {
      setSelectedActivityId(activeActivities[0].id);
    }
  }, [activeActivities, preselectedActivityId, selectedActivityId]);

  const selectedActivity = activeActivities.find(
    (a) => a.id === selectedActivityId
  );

  const handleReset = () => {
    setTeachingRating(0);
    setActivityRating(0);
    setClassRating(0);
    setFeedback('');
    setFormError(null);
    setSubmittedSummary(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedActivity) {
      setFormError('Please select a laboratory activity session.');
      return;
    }

    if (teachingRating < 1 || activityRating < 1 || classRating < 1) {
      setFormError(
        'Please rate all three areas (Teaching Effectiveness, Web Lab & Simulation, and Class Experience).'
      );
      return;
    }

    let resolvedName = '';
    let resolvedEmail = '';

    if (!useAnonymousProfile) {
      const cleanName = typedName.trim();
      const cleanEmail = (isGoogleAuth && signedInEmail ? signedInEmail : typedEmail)
        .trim()
        .toLowerCase();

      if (cleanName.length < 1) {
        setFormError('Please enter your name or choose "Use Anonymous Profile".');
        return;
      }

      if (!isHcdcEmail(cleanEmail)) {
        setFormError(
          'Email must be a valid @hcdc.edu.ph address, or choose "Use Anonymous Profile".'
        );
        return;
      }

      if (isTeacherEmail(cleanEmail) && !isGoogleAuth) {
        setFormError(
          'Please enter your own student @hcdc.edu.ph email or switch to "Use Anonymous Profile".'
        );
        return;
      }

      resolvedName = cleanName.slice(0, BLUEPRINT_LIMITS.studentNameMaxLength);
      resolvedEmail = cleanEmail.slice(0, BLUEPRINT_LIMITS.studentEmailMaxLength);
    }

    const sanitizedFeedback = feedback
      .trim()
      .slice(0, BLUEPRINT_LIMITS.feedbackMaxLength);
    const sanitizedSection = (section || 'Unspecified')
      .trim()
      .slice(0, BLUEPRINT_LIMITS.sectionMaxLength);
    const sanitizedTitle = selectedActivity.title
      .trim()
      .slice(0, BLUEPRINT_LIMITS.titleMaxLength);

    const evaluationId = `eval_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    setSubmitting(true);
    try {
      await setDoc(doc(db, 'evaluations', evaluationId), {
        activityId: selectedActivity.id,
        activityTitle: sanitizedTitle,
        teachingRating: Math.trunc(teachingRating),
        activityRating: Math.trunc(activityRating),
        classRating: Math.trunc(classRating),
        feedback: sanitizedFeedback,
        section: sanitizedSection,
        sessionDate: selectedActivity.sessionDate,
        isAnonymous: useAnonymousProfile,
        studentName: resolvedName,
        studentEmail: resolvedEmail,
        createdAt: serverTimestamp(),
      });

      setSubmittedSummary({
        title: `${selectedActivity.code} · ${selectedActivity.title}`,
        anonymous: useAnonymousProfile,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `evaluations/${evaluationId}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingActivities) {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        <div className="h-8 w-64 bg-white/[0.06] rounded-lg animate-pulse" />
        <div className="h-24 w-full bg-white/[0.04] rounded-2xl animate-pulse" />
        <div className="h-64 w-full bg-white/[0.04] rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (activeActivities.length === 0) {
    return (
      <div className="max-w-3xl mx-auto bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 space-y-3">
        <h2 className="text-xl font-semibold text-white">
          No active laboratory sessions right now
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
          Laboratory assessments and web simulations will appear here as soon as your teacher publishes them.
        </p>
      </div>
    );
  }

  if (submittedSummary) {
    return (
      <div className="max-w-3xl mx-auto bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 sm:p-10 space-y-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/[0.08] border border-white/20 text-white">
          <Check className="w-5 h-5" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">
            {submittedSummary.anonymous
              ? 'Anonymous evaluation recorded'
              : 'Evaluation recorded'}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Thank you. Your ratings and comment for{' '}
            <span className="text-white font-medium">{submittedSummary.title}</span>{' '}
            {submittedSummary.anonymous
              ? 'were saved with an anonymous profile (name and email omitted).'
              : 'have been saved to the database.'}
          </p>
        </div>
        <div className="pt-2">
          <LiquidGlassButton variant="accent" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
            <span>Evaluate Another Session</span>
          </LiquidGlassButton>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white [text-wrap:balance]">
          Teaching & Web Lab Evaluation
        </h1>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          Evaluate how effective the teaching, web-based laboratory assessments, and deployed web simulations were after your session.
        </p>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.09] rounded-2xl p-6 sm:p-8 space-y-6">
        {/* Session Picker */}
        <div className="space-y-3">
          <label
            htmlFor="lab-activity-select"
            className="block text-sm font-medium text-slate-200"
          >
            Laboratory Activity / Web Simulation Session
          </label>
          <select
            id="lab-activity-select"
            value={selectedActivityId}
            onChange={(e) => setSelectedActivityId(e.target.value)}
            className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#0e1017] border border-white/[0.14] text-sm text-white focus:outline-none focus:border-fuchsia-400/70 transition-colors"
          >
            {activeActivities.map((act) => (
              <option key={act.id} value={act.id}>
                {act.code} — {act.title} ({act.sessionDate})
              </option>
            ))}
          </select>
          {selectedActivity && (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
              <span>{selectedActivity.code}</span>
              <span aria-hidden="true">·</span>
              <span>{selectedActivity.topic}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">{selectedActivity.sessionDate}</span>
            </div>
          )}
        </div>

        {/* Section Selector */}
        <div className="space-y-3 pt-2 border-t border-white/[0.08]">
          <span className="block text-sm font-medium text-slate-200">
            Class Section (Optional)
          </span>
          <div className="flex flex-wrap gap-2">
            {BSMT_SECTIONS.map((sec) => {
              const active = section === sec;
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setSection(sec)}
                  className={`min-h-[40px] px-4 py-1.5 text-xs font-medium ${
                    active
                      ? 'liquid-glass-btn liquid-glass-btn-accent text-white'
                      : 'liquid-glass-btn liquid-glass-btn-subtle text-slate-300'
                  }`}
                >
                  {sec === 'Unspecified' ? 'Prefer not to say' : sec}
                </button>
              );
            })}
          </div>
        </div>

        {/* Three Core Ratings */}
        <div className="pt-2 border-t border-white/[0.08]">
          <RatingScaleControl
            id="rating-teaching"
            label="1. Teaching Effectiveness"
            description="How clear, helpful, and effective was the way of teaching and guiding you through the session?"
            value={teachingRating}
            onChange={setTeachingRating}
          />
          <RatingScaleControl
            id="rating-activity"
            label="2. Web-Based Lab & Simulation Effectiveness"
            description="How well did the web-based laboratory assessment or deployed web simulation help you understand and apply the lesson?"
            value={activityRating}
            onChange={setActivityRating}
          />
          <RatingScaleControl
            id="rating-class"
            label="3. Overall Class Experience"
            description="How good was the overall class flow, pacing, and laboratory atmosphere?"
            value={classRating}
            onChange={setClassRating}
          />
        </div>

        {/* Comments / Feedback */}
        <div className="space-y-2.5 pt-2 border-t border-white/[0.08]">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="session-feedback"
              className="text-sm font-medium text-slate-200"
            >
              Comments on Teaching, Web Lab & Simulation
            </label>
            <span className="text-xs font-mono-tabular text-slate-400">
              {feedback.length} / {BLUEPRINT_LIMITS.feedbackMaxLength}
            </span>
          </div>
          <textarea
            id="session-feedback"
            rows={4}
            maxLength={BLUEPRINT_LIMITS.feedbackMaxLength}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share what helped you learn, how effective the web-based assessment or web simulation was, or what can be improved in the teaching..."
            className="w-full px-4 py-3 rounded-xl bg-[#0e1017] border border-white/[0.14] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-400/70 transition-colors resize-y"
          />
        </div>

        {/* Anonymous Profile vs Type Name & @hcdc.edu.ph Email */}
        <div className="space-y-3 pt-2 border-t border-white/[0.08]">
          <span className="block text-sm font-medium text-slate-200">
            Student Identity (Optional — No Password Needed)
          </span>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setUseAnonymousProfile(true)}
              className={`min-h-[42px] px-4 py-2 text-xs font-medium ${
                useAnonymousProfile
                  ? 'liquid-glass-btn liquid-glass-btn-accent text-white'
                  : 'liquid-glass-btn liquid-glass-btn-subtle text-slate-300'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Use Anonymous Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setUseAnonymousProfile(false)}
              className={`min-h-[42px] px-4 py-2 text-xs font-medium ${
                !useAnonymousProfile
                  ? 'liquid-glass-btn liquid-glass-btn-accent text-white'
                  : 'liquid-glass-btn liquid-glass-btn-subtle text-slate-300'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Include My Name & @hcdc.edu.ph Email</span>
            </button>
          </div>

          {useAnonymousProfile ? (
            <p className="text-xs text-slate-400">
              Anonymous profile selected — no name or email will be stored with your evaluation.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label htmlFor="student-name" className="text-xs text-slate-300 block">
                  Your Name
                </label>
                <input
                  id="student-name"
                  type="text"
                  maxLength={BLUEPRINT_LIMITS.studentNameMaxLength}
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Juan Dela Cruz"
                  className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-[#0e1017] border border-white/[0.14] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-400/70"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="student-email" className="text-xs text-slate-300 block">
                  HCDC Email (@hcdc.edu.ph)
                </label>
                <input
                  id="student-email"
                  type="email"
                  readOnly={isGoogleAuth && Boolean(signedInEmail)}
                  maxLength={BLUEPRINT_LIMITS.studentEmailMaxLength}
                  value={isGoogleAuth && signedInEmail ? signedInEmail : typedEmail}
                  onChange={(e) => setTypedEmail(e.target.value)}
                  placeholder="name@hcdc.edu.ph"
                  className={`w-full min-h-[40px] px-3.5 py-2 rounded-xl border text-sm font-mono-tabular focus:outline-none ${
                    isGoogleAuth && signedInEmail
                      ? 'bg-white/[0.03] border-white/[0.1] text-slate-300 cursor-not-allowed'
                      : 'bg-[#0e1017] border-white/[0.14] text-white placeholder:text-slate-500 focus:border-fuchsia-400/70'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {formError && (
          <p
            role="alert"
            className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-4 py-3"
          >
            {formError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <LiquidGlassButton
            type="button"
            variant="subtle"
            onClick={handleReset}
            disabled={submitting}
          >
            Clear Form
          </LiquidGlassButton>

          <LiquidGlassButton
            type="submit"
            variant="accent"
            size="lg"
            disabled={submitting}
          >
            <Send className="w-4 h-4" />
            <span>
              {submitting
                ? 'Submitting...'
                : useAnonymousProfile
                  ? 'Submit Anonymous Feedback'
                  : 'Submit Evaluation'}
            </span>
          </LiquidGlassButton>
        </div>
      </div>
    </form>
  );
}
