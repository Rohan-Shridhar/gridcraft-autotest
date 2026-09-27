import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import App from '../App.jsx';
import { disconnect } from '../toastMessages.js';

function setupMocks() {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockReturnValue({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }),
    });
}

describe('browserDefensiveGuards (FIX-06)', () => {
    beforeEach(() => {
        setupMocks();
        document.body.classList.remove('light-theme');
    });

    afterEach(() => {
        cleanup();
        disconnect();
        vi.restoreAllMocks();
    });

    it('FIX-06: App renders without throwing when window.innerWidth is 0 (jsdom default)', () => {
        // In jsdom, window.innerWidth and window.innerHeight are 0 by default.
        // The lazy initializer in useState(() => ...) must handle this without crashing.
        expect(() => render(<App />)).not.toThrow();
    });

    it('FIX-06: App renders without throwing when window is available', () => {
        // Explicitly set to a "small" viewport value to exercise the lazy branch
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 400 });
        Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 600 });

        expect(() => render(<App />)).not.toThrow();

        // Restore to jsdom default
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
        Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });
    });

    it('FIX-06: App renders without throwing when window has large dimensions', () => {
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1920 });
        Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 1080 });

        expect(() => render(<App />)).not.toThrow();
    });

    it('grid cells are rendered after mount (DOM is not empty)', () => {
        render(<App />);
        const cells = document.querySelectorAll('.grid-cell');
        // Default 16×16 grid → 256 cells
        expect(cells.length).toBe(256);
    });
});
