import { describe, it, expect } from 'vitest';
import { getIconComponent } from '../components/icon-map';
import { HomeIcon, CreditCardIcon, SparklesIcon, ChartBarIcon, CalculatorIcon } from '@heroicons/react/24/outline';

describe('icon-map getIconComponent', () => {
  it('returns HomeIcon for "Home"', () => {
    const Icon = getIconComponent('Home');
    expect(Icon).toBe(HomeIcon);
  });

  it('returns CreditCardIcon for "Credit Card"', () => {
    const Icon = getIconComponent('Credit Card');
    expect(Icon).toBe(CreditCardIcon);
  });

  it('returns SparklesIcon for "Sparkles"', () => {
    const Icon = getIconComponent('Sparkles');
    expect(Icon).toBe(SparklesIcon);
  });

  it('returns ChartBarIcon for "Chart Bar"', () => {
    const Icon = getIconComponent('Chart Bar');
    expect(Icon).toBe(ChartBarIcon);
  });

  it('falls back to CalculatorIcon for unknown icon', () => {
    const Icon = getIconComponent('some-unknown-icon');
    expect(Icon).toBe(CalculatorIcon);
  });
});
