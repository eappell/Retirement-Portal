import React from 'react';

// More detailed, colorful cartoon icons to match the dashboard aesthetic
export function IncomeBagIcon({ size = 56, className = '', colorStart = '#10b981', colorEnd = '#059669' }: { size?: number; className?: string; colorStart?: string; colorEnd?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Income Bag">
      <defs>
        <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={colorStart} />
          <stop offset="100%" stopColor={colorEnd} />
        </linearGradient>
        <filter id="f1" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#07202a" floodOpacity="0.18" />
        </filter>
      </defs>
      <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#g1)" filter="url(#f1)" />
      <path d="M32 22c-4 0-6 2-6 5 0 2 1.5 3 4 3h4c2.5 0 4-1 4-3 0-3-2-5-6-5z" fill="#fff" opacity="0.96" />
      <path d="M24 34c2-4 6-6 8-6s6 2 8 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.96" />
      <text x="32" y="44" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">$</text>
    </svg>
  );
}

export function GlobeIcon({ size = 56, className = '', colorStart = '#60a5fa', colorEnd = '#3b82f6' }: { size?: number; className?: string; colorStart?: string; colorEnd?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Globe">
      <defs>
        <linearGradient id="g2" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={colorStart} />
          <stop offset="100%" stopColor={colorEnd} />
        </linearGradient>
        <filter id="f2" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#041226" floodOpacity="0.18" />
        </filter>
      </defs>
      <rect width="64" height="64" rx="12" fill="url(#g2)" filter="url(#f2)" />
      <circle cx="32" cy="30" r="12" fill="#fff" opacity="0.08" />
      <path d="M20 28c3 1 5-3 12-3s9 4 12 3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
      <path d="M32 18v24" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
      <path d="M24 20c1.5 3 1.5 8 1.5 8" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}

export function TaxBarsIcon({ size = 56, className = '', colorStart = '#8b5cf6', colorEnd = '#7c3aed' }: { size?: number; className?: string; colorStart?: string; colorEnd?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tax Bars">
      <defs>
        <linearGradient id="g3" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={colorStart} />
          <stop offset="100%" stopColor={colorEnd} />
        </linearGradient>
        <filter id="f3" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#07021a" floodOpacity="0.18" />
        </filter>
      </defs>
      <rect width="64" height="64" rx="12" fill="url(#g3)" filter="url(#f3)" />
      <rect x="16" y="34" width="6" height="14" rx="2" fill="#fff" opacity="0.96" />
      <rect x="26" y="26" width="6" height="22" rx="2" fill="#fff" opacity="0.96" />
      <rect x="36" y="20" width="6" height="28" rx="2" fill="#fff" opacity="0.96" />
      <rect x="46" y="28" width="6" height="20" rx="2" fill="#fff" opacity="0.96" />
    </svg>
  );
}

export function HealthcareCrossIcon({ size = 56, className = '', colorStart = '#f472b6', colorEnd = '#ec4899' }: { size?: number; className?: string; colorStart?: string; colorEnd?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Healthcare">
      <defs>
        <linearGradient id="g4" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={colorStart} />
          <stop offset="100%" stopColor={colorEnd} />
        </linearGradient>
        <filter id="f4" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#3a0216" floodOpacity="0.16" />
        </filter>
      </defs>
      <rect width="64" height="64" rx="12" fill="url(#g4)" filter="url(#f4)" />
      <rect x="26" y="20" width="12" height="24" rx="2" fill="#fff" />
      <rect x="20" y="26" width="24" height="12" rx="2" fill="#fff" />
      <circle cx="32" cy="42" r="3" fill="#fff" />
    </svg>
  );
}

export function ActivityRocketIcon({ size = 56, className = '', colorStart = '#fb923c', colorEnd = '#f97316' }: { size?: number; className?: string; colorStart?: string; colorEnd?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Activity Rocket">
      <defs>
        <linearGradient id="g5" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={colorStart} />
          <stop offset="100%" stopColor={colorEnd} />
        </linearGradient>
        <filter id="f5" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#2c1400" floodOpacity="0.12" />
        </filter>
      </defs>
      <rect width="64" height="64" rx="12" fill="url(#g5)" filter="url(#f5)" />
      <path d="M22 38s6-8 14-10l4-4s-2 8-8 12c-6 4-10 2-10 2z" fill="#fff" opacity="0.96" />
      <circle cx="40" cy="20" r="3" fill="#fff" />
    </svg>
  );
}

export function SocialSecurityIcon({ size = 56, className = '', colorStart = '#f59e0b', colorEnd = '#fbbf24' }: { size?: number; className?: string; colorStart?: string; colorEnd?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Social Security">
      <defs>
        <linearGradient id="g6" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={colorStart} />
          <stop offset="100%" stopColor={colorEnd} />
        </linearGradient>
        <filter id="f6" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#24180a" floodOpacity="0.12" />
        </filter>
      </defs>
      <rect width="64" height="64" rx="12" fill="url(#g6)" filter="url(#f6)" />
      <rect x="16" y="24" width="32" height="20" rx="3" fill="#fff" opacity="0.96" />
      <circle cx="28" cy="34" r="3" fill="#f59e0b" />
      <circle cx="36" cy="34" r="3" fill="#f59e0b" />
    </svg>
  );
}

export const CARTOON_ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; className?: string }>> = {
  'retire-abroad': GlobeIcon,
  'retire-abroad-ai': GlobeIcon,
  'tax-impact-analyzer': TaxBarsIcon,
  'income-estimator': IncomeBagIcon,
  'healthcare-cost': HealthcareCrossIcon,
  'activity-budget-planner': ActivityRocketIcon,
  'social-security-optimizer': SocialSecurityIcon,
};
