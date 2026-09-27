import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
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
 * Returns the color of the first grid cell.
 * Cells are plain <div class="grid-cell"> elements.
 */
function firstCellColor() {
    const cell = document.querySelector('.grid-cell');
    return cell ? cell.style.backgroundColor : null;
}

/**
 * Paint the cell at DOM index `idx` via mousedown.
 */
function paintCell(idx) {
    const cells = document.querySelectorAll('.grid-cell');
    fireEvent.mouseDown(cells[idx]);
}

describe('undo/redo (FIX-03)', () => {
    beforeEach(() => {
        setupMocks();
        document.body.classList.remove('light-theme');
    });

    afterEach(() => {
        cleanup();
        disconnect();
        vi.restoreAllMocks();
    });

    it('Ctrl+Z undoes the most recent paint operation', async () => {
        render(<App />);

        // Paint cell 0
        const cell0 = document.querySelector('.grid-cell');
        fireEvent.mouseDown(cell0);

        // Cell should now have a background color
        const colorAfterPaint = cell0.style.backgroundColor;

        // Undo via keyboard
        fireEvent.keyDown(document, { key: 'z', ctrlKey: true });

        // After undo the cell should be back to transparent / empty
        expect(cell0.style.backgroundColor).not.toBe(colorAfterPaint);
    });

    it('Ctrl+Y redoes after undo', async () => {
        render(<App />);

        const cell0 = document.querySelector('.grid-cell');
        fireEvent.mouseDown(cell0);
        const colorAfterPaint = cell0.style.backgroundColor;

        // Undo
        fireEvent.keyDown(document, { key: 'z', ctrlKey: true });
        // Redo
        fireEvent.keyDown(document, { key: 'y', ctrlKey: true });

        expect(cell0.style.backgroundColor).toBe(colorAfterPaint);
    });

    it('undo button is enabled after painting a cell', () => {
        render(<App />);

        const cell0 = document.querySelector('.grid-cell');
        fireEvent.mouseDown(cell0);

        const undoBtn = screen.getByTitle(/Undo \(Ctrl\+Z\)/i);
        expect(undoBtn).not.toBeDisabled();
    });

    it('undo button is disabled before any paint', () => {
        render(<App />);

        const undoBtn = screen.getByTitle('Nothing to undo');
        expect(undoBtn).toBeDisabled();
    });

    it('redo button is disabled until an undo has occurred', () => {
        render(<App />);

        const cell0 = document.querySelector('.grid-cell');
        fireEvent.mouseDown(cell0);

        // No undo yet → redo should be disabled
        const redoBtn = screen.getByTitle('Nothing to redo');
        expect(redoBtn).toBeDisabled();
    });

    it('sequential undos restore each previous state in order', () => {
        render(<App />);

        const cells = document.querySelectorAll('.grid-cell');

        // Paint cells 0, 1, 2 (each is a separate history entry)
        fireEvent.mouseDown(cells[0]);
        fireEvent.mouseDown(cells[1]);
        fireEvent.mouseDown(cells[2]);

        const colorCell2 = cells[2].style.backgroundColor;

        // Undo once → cell 2 should clear
        fireEvent.keyDown(document, { key: 'z', ctrlKey: true });
        expect(cells[2].style.backgroundColor).not.toBe(colorCell2);

        // Undo again → cell 1 should clear
        fireEvent.keyDown(document, { key: 'z', ctrlKey: true });
        // After 2 undos, cell 1 should be back to transparent (null cell renders as 'transparent')
        expect(cells[1].style.backgroundColor).toBe('transparent');
    });
});
