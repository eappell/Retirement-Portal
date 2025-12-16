import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ThemeProvider } from '@/lib/theme';

describe('ThemeProvider', () => {
  beforeAll(() => {
    // JSDOM doesn't implement matchMedia by default; stub it so ThemeProvider can call it
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
  });

  test('applies light class when saved theme is light', async () => {
    localStorage.setItem('theme', 'light');

    render(
      <ThemeProvider>
        <div data-testid="child">child</div>
      </ThemeProvider>
    );

    await waitFor(() => expect(document.documentElement.classList.contains('light')).toBe(true));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  test('applies dark class when saved theme is dark', async () => {
    localStorage.setItem('theme', 'dark');

    render(
      <ThemeProvider>
        <div data-testid="child">child</div>
      </ThemeProvider>
    );

    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });
});
