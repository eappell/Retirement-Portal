import React from 'react';

export function RetireAbroadIcon({ size = 48, color = '#2563eb', className = '' }: { size?: number; color?: string; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Retire Abroad">
      <rect width="48" height="48" rx="12" fill={color} />
      <path d="M14 34c2-4 6-7 10-7s8 3 10 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="24" cy="18" r="6" fill="#fff" />
      <path d="M20 20l-2 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IncomeEstimatorIcon({ size = 48, color = '#059669', className = '' }: { size?: number; color?: string; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Income Estimator">
      <rect width="48" height="48" rx="12" fill={color} />
      <path d="M14 30h20M14 24h12M14 18h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="34" cy="16" r="3" fill="#fff" />
    </svg>
  );
}

export function TaxImpactIcon({ size = 48, color = '#7c3aed', className = '' }: { size?: number; color?: string; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tax Impact">
      <rect width="48" height="48" rx="12" fill={color} />
      <path d="M18 32l6-10 6 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 36h20" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HealthcareIcon({ size = 48, color = '#ef4444', className = '' }: { size?: number; color?: string; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Healthcare">
      <rect width="48" height="48" rx="12" fill={color} />
      <path d="M24 14v20" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 20h12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="30" r="3" fill="#fff" />
    </svg>
  );
}

export const CARTOON_ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; className?: string }>> = {
  'retire-abroad': RetireAbroadIcon,
  'retire-abroad-ai': RetireAbroadIcon,
  'tax-impact-analyzer': TaxImpactIcon,
  'income-estimator': IncomeEstimatorIcon,
  'healthcare-cost': HealthcareIcon,
};
