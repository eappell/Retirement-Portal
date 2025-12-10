import { describe, it, expect } from 'vitest';
import { validateDob, validateRetirementAge, validateCurrentAnnualIncome } from '../lib/profileValidation';

describe('profileValidation', () => {
  describe('validateDob', () => {
    it('returns error for missing DOB', () => {
      expect(validateDob(null)).toBe('Please provide a Date of Birth');
    });

    it('returns error for invalid format', () => {
      expect(validateDob('not-a-date')).toBe('Invalid date');
    });

    it('returns error for future date', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      const iso = future.toISOString().split('T')[0];
      expect(validateDob(iso)).toBe('Date of Birth must be in the past');
    });

    it('returns error for under 18', () => {
      const under18 = new Date();
      under18.setFullYear(under18.getFullYear() - 17);
      const iso = under18.toISOString().split('T')[0];
      expect(validateDob(iso)).toBe('You must be at least 18 years old');
    });

    it('accepts valid DOB', () => {
      const thirty = new Date();
      thirty.setFullYear(thirty.getFullYear() - 30);
      const iso = thirty.toISOString().split('T')[0];
      expect(validateDob(iso)).toBeNull();
    });
  });

  describe('validateRetirementAge', () => {
    it('returns error for missing retirement age', () => {
      expect(validateRetirementAge(null)).toBe('Please provide a retirement age');
    });

    it('returns error for out of range', () => {
      expect(validateRetirementAge(10)).toBe('Retirement age should be between 40 and 100');
      expect(validateRetirementAge(120)).toBe('Retirement age should be between 40 and 100');
    });

    it('returns error if <= current age', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 50);
      const iso = dob.toISOString().split('T')[0];
      expect(validateRetirementAge(50, iso)).toBe('Retirement age must be greater than your current age');
      expect(validateRetirementAge(51, iso)).toBeNull();
    });

    it('accepts valid retirement age', () => {
      expect(validateRetirementAge(65)).toBeNull();
    });
  });

  describe('validateCurrentAnnualIncome', () => {
    it('returns error when missing', () => {
      expect(validateCurrentAnnualIncome(null)).toBe('Please provide your current annual income');
    });

    it('returns error when negative', () => {
      expect(validateCurrentAnnualIncome(-100)).toBe('Income cannot be negative');
    });

    it('accepts non-negative income', () => {
      expect(validateCurrentAnnualIncome(0)).toBeNull();
      expect(validateCurrentAnnualIncome(12345.67)).toBeNull();
    });
  });
});
