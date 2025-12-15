import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock auth so the dashboard renders
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { uid: 'uid1', email: 'a@b.com' } }) }));
vi.mock('@/lib/useUserTier', () => ({ useUserTier: () => ({ tier: 'paid', loading: false }) }));
vi.mock('@/lib/theme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: () => {} }) }));

// Minimal firebase mocks to avoid network calls
vi.mock('@/lib/firebase', () => ({
  db: {},
  collection: () => ({}),
  getDocs: async () => ({ forEach: (cb: (d: any) => void) => {} }),
}));

import DashboardPage from '@/app/dashboard/page';

describe('Dashboard theme styles', () => {
  test('includes light theme override in inline styles (dark default)', async () => {
    const { container } = render(<DashboardPage />);

    // Wait for the component to mount and inject styles
    await waitFor(() => expect(container.querySelector('.dashboard-redesign')).toBeTruthy());

    const style = Array.from(container.querySelectorAll('style')).map((s) => s.textContent || '').join('\n');
    expect(style).toContain('.light .dashboard-redesign');
  });
});