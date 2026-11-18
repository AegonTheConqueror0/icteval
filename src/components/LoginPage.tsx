import React, { useState } from 'react';
import { EyeOff, Mail } from 'lucide-react';
import { isHcdcEmail, isTeacherEmail } from '../types';
import { LiquidGlassButton } from './LiquidGlassButton';

interface LoginPageProps {
  signingInWithGoogle: boolean;
  authError: string | null;
  onGoogleSignIn: () => void;
  onStudentEmailContinue: (name: string, email: string) => void;
  onContinueAnonymous: () => void;
}

export function LoginPage({
  signingInWithGoogle,
  authError,
  onGoogleSignIn,
  onStudentEmailContinue,
  onContinueAnonymous,
}: LoginPageProps) {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleInstitutionalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      setLocalError('Please enter your full name.');
      return;
    }

    if (!isHcdcEmail(cleanEmail)) {
      setLocalError('Only @hcdc.edu.ph institutional emails are accepted.');
      return;
    }

    if (isTeacherEmail(cleanEmail)) {
      setLocalError(
        'Please use "Sign In with Google (@hcdc.edu.ph)" below to verify the teacher account.'
      );
      return;
    }

    onStudentEmailContinue(cleanName, cleanEmail);
  };

  return (
    <div className="max-w-lg mx-auto py-4 sm:py-8 space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white [text-wrap:balance]">
          ICT Laboratory & Teaching Evaluation
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          BS Marine Transportation — choose to continue anonymously or use your <span className="text-slate-200">@hcdc.edu.ph</span> institutional email (no password required).
        </p>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.09] rounded-2xl p-6 sm:p-8 space-y-6">
        {/* Option 1: Stay Anonymous */}
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-white">
              Option 1 · Stay Anonymous
            </h2>
            <p className="text-xs text-slate-400">
              Rate teaching effectiveness, web-based labs, and simulations without sharing your name or email.
            </p>
          </div>
          <LiquidGlassButton
            type="button"
            variant="accent"
            size="lg"
            className="w-full"
            onClick={onContinueAnonymous}
          >
            <EyeOff className="w-4 h-4" />
            <span>Continue Anonymously</span>
          </LiquidGlassButton>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-white/[0.08] w-full" />
          <span className="px-3 text-xs text-slate-500 bg-[#0d0f16] rounded-full whitespace-nowrap">
            or use institutional email
          </span>
          <div className="border-t border-white/[0.08] w-full" />
        </div>

        {/* Option 2: Type @hcdc.edu.ph Institutional Email (No Password) */}
        <form onSubmit={handleInstitutionalSubmit} className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-white">
              Option 2 · Institutional Email (@hcdc.edu.ph)
            </h2>
            <p className="text-xs text-slate-400">
              Enter your name and HCDC email, or sign in with your HCDC Google account.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="login-name" className="text-xs text-slate-300 block">
                Full Name
              </label>
              <input
                id="login-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan Dela Cruz"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0e1017] border border-white/[0.14] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-400/70"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="login-email" className="text-xs text-slate-300 block">
                Institutional Email (no password required)
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@hcdc.edu.ph"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0e1017] border border-white/[0.14] text-sm font-mono-tabular text-white placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-400/70"
              />
            </div>
          </div>

          {(localError || authError) && (
            <p
              role="alert"
              className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3.5 py-2.5"
            >
              {localError || authError}
            </p>
          )}

          <div className="space-y-2.5 pt-1">
            <LiquidGlassButton
              type="submit"
              variant="default"
              size="md"
              className="w-full"
            >
              <Mail className="w-4 h-4" />
              <span>Continue with @hcdc.edu.ph Email</span>
            </LiquidGlassButton>

            <LiquidGlassButton
              type="button"
              variant="subtle"
              size="md"
              className="w-full"
              disabled={signingInWithGoogle}
              onClick={onGoogleSignIn}
            >
              <span>
                {signingInWithGoogle
                  ? 'Connecting Google...'
                  : 'Sign In with Google (@hcdc.edu.ph)'}
              </span>
            </LiquidGlassButton>
          </div>
        </form>
      </div>
    </div>
  );
}
