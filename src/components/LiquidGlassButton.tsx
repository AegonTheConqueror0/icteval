import React from 'react';
import { RATING_LABELS } from '../types';

type ButtonVariant = 'default' | 'accent' | 'subtle' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface LiquidGlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[38px] px-4 py-1.5 text-xs',
  md: 'min-h-[44px] px-6 py-2.5 text-sm',
  lg: 'min-h-[48px] px-7 py-3 text-sm sm:text-base',
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default: 'liquid-glass-btn',
  accent: 'liquid-glass-btn liquid-glass-btn-accent',
  subtle: 'liquid-glass-btn liquid-glass-btn-subtle',
  danger: 'liquid-glass-btn liquid-glass-btn-danger',
};

export function LiquidGlassButton({
  variant = 'default',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...rest
}: LiquidGlassButtonProps) {
  return (
    <button
      type={type}
      className={`${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

interface RatingScaleControlProps {
  id: string;
  label: string;
  description: string;
  value: number;
  onChange: (rating: number) => void;
}

export function RatingScaleControl({
  id,
  label,
  description,
  value,
  onChange,
}: RatingScaleControlProps) {
  return (
    <div className="py-6 border-b border-white/[0.08] last:border-b-0 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1.5">
        <div>
          <label htmlFor={id} className="text-base font-medium text-white block">
            {label}
          </label>
          <p className="text-sm text-slate-400 mt-0.5">{description}</p>
        </div>
        <span className="text-xs font-mono-tabular text-slate-300 shrink-0">
          {value > 0 ? `${value} / 5 · ${RATING_LABELS[value]}` : 'Select 1–5'}
        </span>
      </div>

      <div
        id={id}
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-5 gap-2.5 sm:gap-3"
      >
        {[1, 2, 3, 4, 5].map((score) => {
          const isSelected = value === score;
          return (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(score)}
              className={`min-h-[48px] px-2 py-2.5 flex flex-col items-center justify-center gap-0.5 text-center transition-all ${
                isSelected
                  ? 'liquid-glass-btn liquid-glass-btn-accent text-white'
                  : 'liquid-glass-btn liquid-glass-btn-subtle text-slate-300 hover:text-white'
              }`}
            >
              <span className="text-sm font-semibold font-mono-tabular leading-none">
                {score}
              </span>
              <span className="text-[11px] text-slate-300/90 hidden sm:inline leading-tight truncate max-w-full">
                {RATING_LABELS[score]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
