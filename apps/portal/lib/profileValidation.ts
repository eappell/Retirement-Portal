export function validateDob(dob: string | null): string | null {
  if (!dob) return "Please provide a Date of Birth";
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoRegex.test(dob)) return "Invalid date";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "Invalid date";
  const now = new Date();
  if (d > now) return "Date of Birth must be in the past";
  const age = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  if (age < 18) return "You must be at least 18 years old";
  return null;
}

export function validateRetirementAge(retirementAge: number | null, dob?: string | null): string | null {
  if (retirementAge === null || retirementAge === undefined) return "Please provide a retirement age";
  if (retirementAge < 40 || retirementAge > 100) return "Retirement age should be between 40 and 100";
  if (dob) {
    const d = new Date(dob);
    if (!Number.isNaN(d.getTime())) {
      const now = new Date();
      const currentAge = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      if (retirementAge <= currentAge) return "Retirement age must be greater than your current age";
    }
  }
  return null;
}

export function validateCurrentAnnualIncome(income: number | null): string | null {
  if (income === null || income === undefined) return "Please provide your current annual income";
  if (income < 0) return "Income cannot be negative";
  return null;
}

export const validators = { validateDob, validateRetirementAge, validateCurrentAnnualIncome };
