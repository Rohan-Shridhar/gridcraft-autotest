import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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

/**
 * The eraser button title changes based on preview state.
 * In normal mode it's "Eraser (E)".
 */
function getEraserBtn() {
    return document.querySelector('[title="Eraser (E)"]');
}
function getBrushBtn() {
    return document.querySelector('[title="Paint brush (A)"]');
}
function getFillBtn() {
    return document.querySelector('[title="Fill (B)"]');
}

describe('keyboard shortcuts', () => {
    beforeEach(() => {
        setupMocks();
        document.body.classList.remove('light-theme');
    });

    afterEach(() => {
        cleanup();
        disconnect();
        vi.restoreAllMocks();
    });

    // ---------- paint-mode shortcuts ----------

    it('pressing E toggles the eraser tool on', () => {
        render(<App />);
        fireEvent.keyDown(document, { key: 'e' });
        expect(getEraserBtn().classList.contains('tool-btn--active')).toBe(true);
    });

    it('pressing E a second time toggles the eraser tool off', () => {
        render(<App />);
        fireEvent.keyDown(document, { key: 'E' });
        fireEvent.keyDown(document, { key: 'e' });
        expect(getEraserBtn().classList.contains('tool-btn--active')).toBe(false);
    });

    it('pressing A selects the paint brush (deactivates eraser)', () => {
        render(<App />);
        // First enable eraser
        fireEvent.keyDown(document, { key: 'e' });
        expect(getEraserBtn().classList.contains('tool-btn--active')).toBe(true);

        // Then switch to brush
        fireEvent.keyDown(document, { key: 'a' });
        expect(getEraserBtn().classList.contains('tool-btn--active')).toBe(false);
        expect(getBrushBtn().classList.contains('tool-btn--active')).toBe(true);
    });

    it('pressing B toggles the fill tool on', () => {
        render(<App />);
        fireEvent.keyDown(document, { key: 'b' });
        expect(getFillBtn().classList.contains('tool-btn--active')).toBe(true);
    });

    it('pressing B a second time toggles the fill tool off', () => {
        render(<App />);
        fireEvent.keyDown(document, { key: 'b' });
        fireEvent.keyDown(document, { key: 'b' });
        expect(getFillBtn().classList.contains('tool-btn--active')).toBe(false);
    });

    // ---------- Ctrl+Z / Ctrl+Y ----------

    it('Ctrl+Z is a no-op when history is empty (does not throw)', () => {
        render(<App />);
        expect(() => {
            fireEvent.keyDown(document, { key: 'z', ctrlKey: true });
        }).not.toThrow();
    });

    it('Ctrl+Y is a no-op when future is empty (does not throw)', () => {
        render(<App />);
        expect(() => {
            fireEvent.keyDown(document, { key: 'y', ctrlKey: true });
        }).not.toThrow();
    });

    // ---------- preview-mode blocking ----------

    it('tool shortcuts show a toast in preview mode instead of switching tools', () => {
        render(<App />);

        // Enter preview mode by clicking the eye button
        const eyeBtn = document.querySelector('[title="Toggle grid lines"]');
        fireEvent.click(eyeBtn); // showGrid → false (preview on)

        // Wait for toast to appear before pressing 'e'
        // In preview mode pressing 'e' should NOT activate eraser
        const eraserBefore = document.querySelector('.tool-btn--active[title]');

        fireEvent.keyDown(document, { key: 'e' });

        // Toast with preview message should be visible
        const toast = document.querySelector('.toast');
        expect(toast).not.toBeNull();
        expect(toast.textContent).toContain("Can't edit while preview");
    });

    it('Ctrl+Z still works in preview mode', () => {
        render(<App />);

        // Paint a cell first
        const cell0 = document.querySelector('.grid-cell');
        fireEvent.mouseDown(cell0);
        const colorAfterPaint = cell0.style.backgroundColor;

        // Enter preview mode
        const eyeBtn = document.querySelector('[title="Toggle grid lines"]');
        fireEvent.click(eyeBtn);

        // Undo should still work
        fireEvent.keyDown(document, { key: 'z', ctrlKey: true });
        expect(cell0.style.backgroundColor).not.toBe(colorAfterPaint);
    });
});
