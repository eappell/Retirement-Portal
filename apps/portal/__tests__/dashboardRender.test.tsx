import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock auth so the dashboard renders
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { uid: 'uid1', email: 'a@b.com' } }) }));
vi.mock('@/lib/useUserTier', () => ({ useUserTier: () => ({ tier: 'paid', loading: false }) }));
vi.mock('@/lib/theme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: () => {} }) }));

// Mock firebase to provide two apps
const enabledApp = { id: 'enabled-app', name: 'Enabled App', url: 'http://localhost:1000/', disabled: false, icon: 'Sparkles', description: 'An enabled app' };
const otherApp = { id: 'other-app', name: 'Other App', url: 'http://localhost:1001/', disabled: false, icon: '🚀', description: 'Another app' };

vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  collection: () => ({}),
  getDocs: async () => ({
    forEach: (cb: (d: any) => void) => {
      [enabledApp, otherApp].forEach((app) => cb({ data: () => app }));
    },
  }),
}));

import DashboardPage from '@/app/dashboard/page';

describe('Dashboard render', () => {
  test('renders app cards from firestore data', async () => {
    const { container } = render(<DashboardPage />);

    await waitFor(() => expect(container.querySelector('[data-app-id="enabled-app"]')).toBeTruthy());
    expect(container.querySelector('[data-app-id="other-app"]')).toBeTruthy();

    const cards = container.querySelectorAll('.app-tile');
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });
});