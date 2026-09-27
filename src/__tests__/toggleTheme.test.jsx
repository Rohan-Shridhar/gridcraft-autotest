import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from '../App.jsx';
import { disconnect } from '../toastMessages.js';

// Mock SVG images that jsdom can't render
vi.mock('../images', () => ({}), { virtual: true });

function setupMocks() {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    // matchMedia stub (jsdom doesn't implement it)
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockReturnValue({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }),
    });
}

describe('toggleTheme (FIX-02)', () => {
    beforeEach(() => {
        setupMocks();
        // Start each test in dark theme (default)
        document.body.classList.remove('light-theme');
    });

    afterEach(() => {
        cleanup();
        disconnect();
        vi.restoreAllMocks();
        document.body.classList.remove('light-theme');
    });

    it('first click adds light-theme class to document.body', () => {
        render(<App />);

        const themeBtn = screen.getByTitle('Toggle theme');
        fireEvent.click(themeBtn);

        expect(document.body.classList.contains('light-theme')).toBe(true);
    });

    it('second click removes light-theme class from document.body', () => {
        render(<App />);

        const themeBtn = screen.getByTitle('Toggle theme');
        fireEvent.click(themeBtn); // → light mode
        fireEvent.click(themeBtn); // → dark mode

        expect(document.body.classList.contains('light-theme')).toBe(false);
    });

    it('toggles the theme icon between sun and moon', () => {
        render(<App />);
        const themeBtn = screen.getByTitle('Toggle theme');

        // Initial state: dark theme → sun icon shown
        expect(themeBtn.querySelector('.fa-sun')).not.toBeNull();

        fireEvent.click(themeBtn); // → light mode
        expect(themeBtn.querySelector('.fa-moon')).not.toBeNull();

        fireEvent.click(themeBtn); // → dark mode
        expect(themeBtn.querySelector('.fa-sun')).not.toBeNull();
    });
});
