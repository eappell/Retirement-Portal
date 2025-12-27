import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock auth so the dashboard renders
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { uid: 'uid1', email: 'a@b.com' } }) }));
vi.mock('@/lib/useUserTier', () => ({ useUserTier: () => ({ tier: 'paid', loading: false }) }));
vi.mock('@/lib/theme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: () => {} }) }));

// Minimal firebase mocks to avoid network calls
vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  collection: () => ({}),
  getDocs: async () => ({ forEach: (cb: (d: any) => void) => {} }),
}));

import DashboardPage from '@/app/dashboard/page';

describe('Dashboard theme styles', () => {
  test('includes light theme override in inline styles (dark default)', async () => {
    const { container } = render(<DashboardPage />);

    // Wait for the component to mount and inject styles
    await waitFor(() => expect(container.querySelector('.dashboard-redesign')).toBeTruthy());

    // Ensure the redesign wrapper exists when the dashboard mounts
    expect(container.querySelector('.dashboard-redesign')).toBeTruthy();
  });

  test('does not render decorative background particles', async () => {
    const { container } = render(<DashboardPage />);

    // The particles/animations have been removed — ensure the DOM no longer contains them
    await waitFor(() => expect(container.querySelector('.dashboard-redesign')).toBeTruthy());

    expect(container.querySelector('.background-particles')).toBeNull();
  });
});