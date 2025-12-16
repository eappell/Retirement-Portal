import React from 'react';

// More detailed, colorful cartoon icons to match the dashboard aesthetic
export function IncomeBagIcon({ size = 56, className = '', colorStart = '#0EA5A2', colorEnd = '#059669' }: { size?: number; className?: string; colorStart?: string; colorEnd?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Income Bag">
      <defs>
        <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={colorStart} />
          <stop offset="100%" stopColor={colorEnd} />
        </linearGradient>
        <filter id="f1" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#022027" floodOpacity="0.18" />
        </filter>
      </defs>

      <rect x="0" y="0" width="64" height="64" rx="14" fill="url(#g1)" filter="url(#f1)" />
      <g transform="translate(0,0)">
        <rect x="10" y="12" width="44" height="36" rx="8" fill="#ffffff" opacity="0.06" />
        <g transform="translate(12,12)">
          <rect x="0" y="0" width="40" height="40" rx="8" fill="#ffffff" opacity="0.06" />
          <path d="M20 6c-4 0-6 2-6 5 0 2 1.5 3 4 3h4c2.5 0 4-1 4-3 0-3-2-5-6-5z" fill="#fff" />
          <path d="M12 20c2-4 6-6 8-6s6 2 8 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="20" y="32" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">$</text>
        </g>
      </g>
    </svg>
  );
}

// Use a lightweight image-based icon for the income estimator (first variation)
export function IncomeMoneyImage({ size = 84, className = '' }: { size?: number; className?: string }) {
  // Render the processed PNG inside the standard rounded-square icon container
  const innerSize = Math.round(size * 0.76); // 84 -> ~64
  // Income tile must always have off-white background; the outer wrapper will handle it via CSS class
  return (
    <div className={`app-tile-icon app-tile-icon--light ${className}`} style={{ background: '#F9F8F6' }}>
      <img src="/images/money1_trans.png" alt="Income" width={innerSize} height={innerSize} />
    </div>
  );
} 

export function GlobeImage({ size = 84, className = '', variant = 'globe2', bgColor }: { size?: number; className?: string; variant?: 'globe1'|'globe2'; bgColor?: string }) {
  // Use the processed globe image (choose variant). Renders inside the same rounded-square container
  const innerSize = Math.round(size * 0.76);
  const src = `/images/${variant}_trans.png`;
  return (
    <div className={`app-tile-icon app-tile-icon--light ${className}`} style={bgColor ? { background: bgColor } : undefined}>
      <img src={src} alt="Globe" width={innerSize} height={innerSize} />
    </div>
  );
}

export function ChartImage({ size = 84, className = '', variant = 'barchart1', bgColor }: { size?: number; className?: string; variant?: 'barchart1'|'barchart2'; bgColor?: string }) {
  // Use the processed chart image (choose variant). Renders inside the same rounded-square container
  const innerSize = Math.round(size * 0.76);
  const src = `/images/${variant}_trans.png`;
  return (
    <div className={`app-tile-icon app-tile-icon--light ${className}`} style={bgColor ? { background: bgColor } : undefined}>
      <img src={src} alt="Chart" width={innerSize} height={innerSize} />
    </div>
  );
}

export function HospitalImage({ size = 84, className = '', variant = 'hospital1', bgColor }: { size?: number; className?: string; variant?: 'hospital1'|'hospital2'|'hospital3'; bgColor?: string }) {
  // Healthcare image renderer (round-square container)
  const innerSize = Math.round(size * 0.76);
  const src = `/images/${variant}_trans.png`;
  return (
    <div className={`app-tile-icon app-tile-icon--light ${className}`} style={bgColor ? { background: bgColor } : undefined}>
      <img src={src} alt="Healthcare" width={innerSize} height={innerSize} />
    </div>
  );
}

export function RocketImage({ size = 84, className = '', variant = 'rocket3', bgColor }: { size?: number; className?: string; variant?: 'rocket1'|'rocket2'|'rocket3'|'rocket4'; bgColor?: string }) {
  // Rocket/activity image renderer (round-square container)
  const innerSize = Math.round(size * 0.76);
  const src = `/images/${variant}_trans.png`;
  return (
    <div className={`app-tile-icon app-tile-icon--light ${className}`} style={bgColor ? { background: bgColor } : undefined}>
      <img src={src} alt="Activity" width={innerSize} height={innerSize} />
    </div>
  );
}

export function MoneybagImage({ size = 84, className = '', variant = 'moneybag1', bgColor }: { size?: number; className?: string; variant?: 'moneybag1'|'moneybag2'|'moneybag3'; bgColor?: string }) {
  // Moneybag / finance image renderer (round-square container)
  const innerSize = Math.round(size * 0.76);
  const src = `/images/${variant}_trans.png`;
  return (
    <div className={`app-tile-icon app-tile-icon--light ${className}`} style={bgColor ? { background: bgColor } : undefined}>
      <img src={src} alt="Money" width={innerSize} height={innerSize} />
    </div>
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
      <g transform="translate(12,12)">
        <rect x="0" y="0" width="40" height="40" rx="8" fill="#fff" opacity="0.06" />
        <circle cx="20" cy="18" r="12" fill="#ffffff" opacity="0.12" />
        <path d="M8 16c3 1 5-3 12-3s9 4 12 3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
        <path d="M20 6v24" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
      </g>
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
      <g transform="translate(12,14)">
        <rect x="0" y="20" width="8" height="18" rx="3" fill="#fff" opacity="0.96" />
        <rect x="12" y="12" width="8" height="26" rx="3" fill="#fff" opacity="0.96" />
        <rect x="24" y="6" width="8" height="32" rx="3" fill="#fff" opacity="0.96" />
        <rect x="36" y="14" width="8" height="24" rx="3" fill="#fff" opacity="0.96" />
      </g>
    </svg>
  );
}

export function HealthcareCrossIcon({ size = 56, className = '', colorStart = '#fb7185', colorEnd = '#f43f5e' }: { size?: number; className?: string; colorStart?: string; colorEnd?: string }) {
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
      <g transform="translate(12,12)">
        <rect x="6" y="6" width="40" height="40" rx="8" fill="#fff" opacity="0.06" />
        <path d="M26 12h12v8H26z" fill="#fff" />
        <path d="M20 18h24v8H20z" fill="#fff" />
        <circle cx="32" cy="38" r="3" fill="#fff" />
      </g>
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
  'retire-abroad': (props) => <GlobeImage {...props} variant={'globe2'} />,
  'retire-abroad-ai': (props) => <GlobeImage {...props} variant={'globe2'} />,
  'tax-impact-analyzer': (props) => <ChartImage {...props} variant={'barchart1'} />,
  'tax': (props) => <ChartImage {...props} variant={'barchart1'} />,
  'income-estimator': IncomeMoneyImage,
  // Common alternative ids / name variants for the income estimator
  'income': IncomeMoneyImage,
  'monthly-retirement-income': IncomeMoneyImage,
  'monthly-retirement-income-ai': IncomeMoneyImage,
  'monthly-retirement-income-estimator': IncomeMoneyImage,
  'monthly-retirement-income-estimator-v1': IncomeMoneyImage,
  'healthcare-cost': (props) => <HospitalImage {...props} variant={'hospital2'} />,
  'healthcare': (props) => <HospitalImage {...props} variant={'hospital2'} />,
  'health': (props) => <HospitalImage {...props} variant={'hospital2'} />,
  'activity-budget-planner': (props) => <RocketImage {...props} variant={'rocket3'} />,
  'social-security-optimizer': (props) => <MoneybagImage {...props} variant={'moneybag1'} />,
  'social-security': (props) => <MoneybagImage {...props} variant={'moneybag1'} />,
};
