import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
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

describe('importImage (FIX-09)', () => {
    beforeEach(() => {
        setupMocks();
        document.body.classList.remove('light-theme');
    });

    afterEach(() => {
        cleanup();
        disconnect();
        vi.restoreAllMocks();
    });

    it('FIX-09: shows an error toast when canvas.getContext returns null', async () => {
        // Mock getContext to return null (simulates resource-exhausted canvas)
        const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

        render(<App />);

        // Find the hidden file input
        const fileInput = document.querySelector('input[type="file"]');
        expect(fileInput).not.toBeNull();

        // Create a fake PNG file
        const fakeFile = new File(['fake-image-data'], 'test.png', { type: 'image/png' });

        // Mock FileReader so the onload fires synchronously
        const originalFileReader = global.FileReader;
        class MockFileReader {
            constructor() {
                this.onload = null;
            }
            readAsDataURL() {
                // Schedule onload after current microtask
                setTimeout(() => {
                    if (this.onload) {
                        this.onload({ target: { result: 'data:image/png;base64,abc' } });
                    }
                }, 0);
            }
        }
        vi.stubGlobal('FileReader', MockFileReader);

        // Mock Image so img.onload fires synchronously after src is set
        const originalImage = global.Image;
        class MockImage {
            constructor() {
                this.onload = null;
                this._src = '';
            }
            set src(val) {
                this._src = val;
                setTimeout(() => {
                    if (this.onload) this.onload();
                }, 0);
            }
            get src() { return this._src; }
        }
        vi.stubGlobal('Image', MockImage);

        // Trigger the file change
        fireEvent.change(fileInput, { target: { files: [fakeFile] } });

        // Wait for the error toast to appear
        await waitFor(() => {
            const toast = document.querySelector('.toast');
            expect(toast).not.toBeNull();
            expect(toast.textContent).toContain('Import failed');
        }, { timeout: 2000 });

        getContextSpy.mockRestore();
        vi.stubGlobal('FileReader', originalFileReader);
        vi.stubGlobal('Image', originalImage);
    });

    it('FIX-09: does not crash when canvas context is null (no unhandled error)', async () => {
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

        render(<App />);

        const fileInput = document.querySelector('input[type="file"]');
        const fakeFile = new File(['fake'], 'test.png', { type: 'image/png' });

        const originalFileReader = global.FileReader;
        class MockFileReader {
            readAsDataURL() {
                setTimeout(() => { if (this.onload) this.onload({ target: { result: 'data:image/png;base64,abc' } }); }, 0);
            }
        }
        vi.stubGlobal('FileReader', MockFileReader);

        const originalImage = global.Image;
        class MockImage {
            set src(v) { setTimeout(() => { if (this.onload) this.onload(); }, 0); }
            get src() { return ''; }
        }
        vi.stubGlobal('Image', MockImage);

        // Should not throw
        await expect(async () => {
            fireEvent.change(fileInput, { target: { files: [fakeFile] } });
            await new Promise(r => setTimeout(r, 50));
        }).not.toThrow();

        vi.stubGlobal('FileReader', originalFileReader);
        vi.stubGlobal('Image', originalImage);
    });

    it('rejects non-image files with an error toast', async () => {
        render(<App />);

        const fileInput = document.querySelector('input[type="file"]');
        const textFile = new File(['hello'], 'note.txt', { type: 'text/plain' });

        fireEvent.change(fileInput, { target: { files: [textFile] } });

        await waitFor(() => {
            const toast = document.querySelector('.toast');
            expect(toast).not.toBeNull();
            expect(toast.textContent).toContain('Invalid image file');
        }, { timeout: 1000 });
    });
});
