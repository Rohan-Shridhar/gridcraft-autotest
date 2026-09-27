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

describe('changeGridSize (FIX-04)', () => {
    beforeEach(() => {
        setupMocks();
        document.body.classList.remove('light-theme');
    });

    afterEach(() => {
        cleanup();
        disconnect();
        vi.restoreAllMocks();
    });

    it('FIX-04: switching to 32×32 does NOT force preview mode (showGrid stays true)', () => {
        render(<App />);

        // Default state: showGrid = true → tool buttons have normal titles (not preview)
        const eraserBefore = document.querySelector('[title="Eraser (E)"]');
        expect(eraserBefore).not.toBeNull();

        // Click the 32×32 grid size button
        const btn32 = screen.getByRole('button', { name: '32×32' });
        fireEvent.click(btn32);

        // After resize, eraser button should still have its normal title (not disabled title)
        const eraserAfter = document.querySelector('[title="Eraser (E)"]');
        expect(eraserAfter).not.toBeNull();
    });

    it('FIX-04: switching to 64×64 does NOT force preview mode', () => {
        render(<App />);

        const btn64 = screen.getByRole('button', { name: '64×64' });
        fireEvent.click(btn64);

        // Tools should still be in normal mode
        const brushBtn = document.querySelector('[title="Paint brush (A)"]');
        expect(brushBtn).not.toBeNull();
    });

    it('FIX-04: switching to 128×128 does NOT force preview mode', () => {
        render(<App />);

        const btn128 = screen.getByRole('button', { name: '128×128' });
        fireEvent.click(btn128);

        const brushBtn = document.querySelector('[title="Paint brush (A)"]');
        expect(brushBtn).not.toBeNull();
    });

    it('grid size buttons are disabled when in preview mode', () => {
        render(<App />);

        // Enter preview mode
        const eyeBtn = document.querySelector('[title="Toggle grid lines"]');
        fireEvent.click(eyeBtn);

        // All grid-size buttons should now be disabled
        const btn32 = screen.getByRole('button', { name: '32×32' });
        expect(btn32).toBeDisabled();
    });

    it('changing grid size resets the history', () => {
        render(<App />);

        // Paint a cell to create history
        const cell0 = document.querySelector('.grid-cell');
        fireEvent.mouseDown(cell0);

        // Undo button should now be enabled
        const undoBtn = document.querySelector('[title="Undo (Ctrl+Z)"]');
        expect(undoBtn).not.toBeNull();

        // Change grid size
        const btn32 = screen.getByRole('button', { name: '32×32' });
        fireEvent.click(btn32);

        // After resize history should be cleared → undo button disabled
        const undoBtnAfter = document.querySelector('[title="Nothing to undo"]');
        expect(undoBtnAfter).not.toBeNull();
    });
});
