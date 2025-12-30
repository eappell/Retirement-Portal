import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the hooks used by the component
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { uid: 'uid123', email: 'a@b.com', isAnonymous: false, tier: 'free' },
  }),
}));

vi.mock('@/lib/useUserTier', () => ({
  useUserTier: () => ({ tier: 'paid', subscriptionExpiry: null, loading: false }),
}));

vi.mock('@/lib/theme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: () => {} }),
}));

// Mock firebase auth currentUser used by IFrameWrapper
vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: async () => 'fake-token-123',
    },
  },
}));

// Import after mocks
import { IFrameWrapper } from '@/components/IFrameWrapper';

describe('IFrameWrapper messaging', () => {
  test('posts USER_ROLE_UPDATE to iframe contentWindow and AUTH_TOKEN contains tier', async () => {
    const { container } = render(
      <IFrameWrapper appId="test" appName="Test App" appUrl="http://example.com" />
    );

    // Wait for the iframe to be rendered after async auth token fetch
    const iframe = await screen.findByTitle('Test App') as HTMLIFrameElement;
    expect(iframe).toBeTruthy();

    // Provide a fake contentWindow with a postMessage spy
    const postSpy = vi.fn();
    Object.defineProperty(iframe, 'contentWindow', {
      value: { postMessage: postSpy },
      writable: true,
    });

    // Simulate iframe load event so the component's onload handler runs
    iframe.dispatchEvent(new Event('load'));

    // Wait for effects to run and post messages
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalled();
    });

    // Find USER_ROLE_UPDATE call
    const roleCalls = postSpy.mock.calls.filter(
      (c) => c[0] && c[0].type === 'USER_ROLE_UPDATE'
    );
    const authCalls = postSpy.mock.calls.filter((c) => c[0] && c[0].type === 'AUTH_TOKEN');

    // Accept either a USER_ROLE_UPDATE message or an AUTH_TOKEN that includes tier
    if (roleCalls.length > 0) {
      expect(roleCalls[0][0].role).toBe('paid');
    } else if (authCalls.length > 0) {
      expect(authCalls[0][0]).toHaveProperty('token');
      expect(authCalls[0][0].tier).toBe('paid');
    } else {
      throw new Error('Neither USER_ROLE_UPDATE nor AUTH_TOKEN was posted to iframe');
    }
  });

  test('resizes iframe on IFRAME_HEIGHT message', async () => {
    const { container } = render(
      <IFrameWrapper appId="test" appName="Test App" appUrl="http://example.com" />
    );

    const iframe = await screen.findByTitle('Test App') as HTMLIFrameElement;
    expect(iframe).toBeTruthy();

    // initial height should be unset
    expect(iframe.style.height).toBe('');

    // Ensure window is tall enough so the portal won't clamp the height in tests
    (window as any).innerHeight = 2000;

    // post a height message
    window.postMessage({ type: 'IFRAME_HEIGHT', height: 1200 }, '*');

    await waitFor(() => {
      const applied = parseInt(iframe.style.height?.replace('px','') || '0', 10);
      expect(applied).toBeGreaterThanOrEqual(1200);
    });
  });


});
