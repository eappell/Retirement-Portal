import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock auth and user tier so the dashboard renders
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { uid: 'uid1', email: 'a@b.com' } }) }));
vi.mock('@/lib/useUserTier', () => ({ useUserTier: () => ({ tier: 'paid', loading: false }) }));
vi.mock('@/lib/theme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: () => {} }) }));

// Mock firebase getDocs/collection to supply an app that is disabled and one that is enabled
const disabledApp = { id: 'disabled-app', name: 'Disabled App', url: 'http://localhost/', disabled: true };
const enabledApp = { id: 'enabled-app', name: 'Enabled App', url: 'http://localhost:1000/', disabled: false };

vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  collection: () => ({}),
  getDocs: async () => ({
    forEach: (cb: (d: any) => void) => {
      [disabledApp, enabledApp].forEach((app) => cb({ data: () => app }));
    },
  }),
}));

// Import after mocks
import DashboardPage from '@/app/dashboard/page';

describe('Dashboard disabled handling', () => {
  test('hides apps that are disabled', async () => {
    const { container } = render(<DashboardPage />);

    // Wait for the dashboard to finish loading apps and rendering nodes
    await waitFor(() => expect(container.querySelector('[data-app-id="enabled-app"]')).toBeTruthy());

    // Ensure disabled app is not rendered
    expect(container.querySelector('[data-app-id="disabled-app"]')).toBeNull();
  });
});
