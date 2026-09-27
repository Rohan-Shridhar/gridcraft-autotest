import { describe, it, expect } from 'vitest';
import { floodFill } from '../utils/floodFill.js';

// 4×4 grid helpers
// Index layout:
//  0  1  2  3
//  4  5  6  7
//  8  9 10 11
// 12 13 14 15

const GRID_SIZE = 4;
const makeGrid = (val = null) => Array(GRID_SIZE * GRID_SIZE).fill(val);

describe('floodFill', () => {
    it('fills a connected region with the new color', () => {
        // All cells null; fill from index 0 → all become red
        const cells = makeGrid(null);
        const result = floodFill(cells, 0, null, '#ff0000', GRID_SIZE);
        expect(result.every(c => c === '#ff0000')).toBe(true);
    });

    it('same-color no-op: returns the original array reference', () => {
        const cells = makeGrid('#aabbcc');
        const result = floodFill(cells, 5, '#aabbcc', '#aabbcc', GRID_SIZE);
        // targetColor === fillColor → short-circuit, same reference
        expect(result).toBe(cells);
    });

    it('fills only the connected region, leaving isolated cells untouched', () => {
        // Top-left 2×2 is '#aaa', rest is null
        const cells = makeGrid(null);
        cells[0] = '#aaa'; cells[1] = '#aaa';
        cells[4] = '#aaa'; cells[5] = '#aaa';

        const result = floodFill(cells, 0, '#aaa', '#bbb', GRID_SIZE);

        // Filled region
        expect(result[0]).toBe('#bbb');
        expect(result[1]).toBe('#bbb');
        expect(result[4]).toBe('#bbb');
        expect(result[5]).toBe('#bbb');

        // Rest unchanged
        expect(result[2]).toBe(null);
        expect(result[6]).toBe(null);
        expect(result[15]).toBe(null);
    });

    it('fills at top-left corner (index 0)', () => {
        const cells = makeGrid(null);
        const result = floodFill(cells, 0, null, '#corner', GRID_SIZE);
        expect(result[0]).toBe('#corner');
        // Full grid was null so all should be filled
        expect(result.every(c => c === '#corner')).toBe(true);
    });

    it('fills at bottom-right corner (index 15)', () => {
        const cells = makeGrid(null);
        const result = floodFill(cells, 15, null, '#br', GRID_SIZE);
        expect(result[15]).toBe('#br');
        // Full grid — all filled
        expect(result.every(c => c === '#br')).toBe(true);
    });

    it('fills at right edge (col = gridSize - 1) without bleeding past edge', () => {
        // Column 3 (indices 3, 7, 11, 15) is '#edge'; rest is null
        const cells = makeGrid(null);
        cells[3] = '#edge'; cells[7] = '#edge';
        cells[11] = '#edge'; cells[15] = '#edge';

        const result = floodFill(cells, 3, '#edge', '#filled', GRID_SIZE);

        expect(result[3]).toBe('#filled');
        expect(result[7]).toBe('#filled');
        expect(result[11]).toBe('#filled');
        expect(result[15]).toBe('#filled');

        // Column 2 untouched
        expect(result[2]).toBe(null);
        expect(result[6]).toBe(null);
    });

    it('fills at left edge (col = 0) without bleeding past edge', () => {
        // Column 0 (indices 0, 4, 8, 12) is '#left'; rest is null
        const cells = makeGrid(null);
        cells[0] = '#left'; cells[4] = '#left';
        cells[8] = '#left'; cells[12] = '#left';

        const result = floodFill(cells, 0, '#left', '#filled', GRID_SIZE);

        expect(result[0]).toBe('#filled');
        expect(result[4]).toBe('#filled');
        expect(result[8]).toBe('#filled');
        expect(result[12]).toBe('#filled');

        // Column 1 untouched
        expect(result[1]).toBe(null);
        expect(result[5]).toBe(null);
    });

    it('full grid fill when all cells are same color', () => {
        const cells = makeGrid('#uniform');
        const result = floodFill(cells, 5, '#uniform', '#new', GRID_SIZE);
        expect(result.length).toBe(GRID_SIZE * GRID_SIZE);
        expect(result.every(c => c === '#new')).toBe(true);
    });

    it('does not mutate the original cells array', () => {
        const cells = makeGrid(null);
        const original = [...cells];
        floodFill(cells, 0, null, '#mutcheck', GRID_SIZE);
        expect(cells).toEqual(original);
    });

    it('returns a new array (not the same reference) when a fill happens', () => {
        const cells = makeGrid(null);
        const result = floodFill(cells, 0, null, '#new', GRID_SIZE);
        expect(result).not.toBe(cells);
    });
});
