import { describe, it, expect } from 'vitest';
import { getIconComponent } from '../components/icon-map';
import { RocketLaunchIcon, SparklesIcon, CalculatorIcon } from '@heroicons/react/24/outline';

describe('icon map resolver', () => {
  it('resolves rocket names to RocketLaunchIcon', () => {
    expect(getIconComponent('Rocket')).toBe(RocketLaunchIcon);
    expect(getIconComponent('rocket')).toBe(RocketLaunchIcon);
    expect(getIconComponent('Rocket Launch')).toBe(RocketLaunchIcon);
  });

  it('resolves sparkles to SparklesIcon', () => {
    expect(getIconComponent('Sparkles')).toBe(SparklesIcon);
  });

  it('falls back to calculator for unknown icon', () => {
    expect(getIconComponent('unknown-icon-name')).toBe(CalculatorIcon);
  });
});
