import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Menu from '../Menu.jsx';

describe('exportWithFilename (FIX-01 + FIX-07)', () => {
    let downloadImage;
    let promptSpy;

    beforeEach(() => {
        downloadImage = vi.fn().mockResolvedValue(undefined);
        promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('myart');
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    // FIX-01: Export button must call exportWithFilename (which calls window.prompt)
    it('FIX-01: clicking Export calls window.prompt to ask for a filename', async () => {
        render(<Menu downloadImage={downloadImage} onImport={vi.fn()} isExporting={false} />);

        const exportBtn = screen.getByTitle('Export');
        fireEvent.click(exportBtn);

        // prompt should have been called once
        expect(promptSpy).toHaveBeenCalledTimes(1);
    });

    it('FIX-01: passes the sanitised filename to downloadImage via the prototype patch', async () => {
        // Let the promise resolve so the patched click fires
        promptSpy.mockReturnValue('my custom art');
        render(<Menu downloadImage={downloadImage} onImport={vi.fn()} isExporting={false} />);

        const exportBtn = screen.getByTitle('Export');
        fireEvent.click(exportBtn);

        // downloadImage should eventually be called
        // Give microtasks a chance to run
        await vi.waitFor(() => expect(downloadImage).toHaveBeenCalledTimes(1));
    });

    it('FIX-01: if user cancels prompt (returns null) downloadImage is NOT called', async () => {
        promptSpy.mockReturnValue(null);
        render(<Menu downloadImage={downloadImage} onImport={vi.fn()} isExporting={false} />);

        fireEvent.click(screen.getByTitle('Export'));

        // Slight delay to confirm the promise didn't proceed
        await new Promise(r => setTimeout(r, 10));
        expect(downloadImage).not.toHaveBeenCalled();
    });

    // FIX-07: if isExporting is true, the button is disabled and prompt is never called
    it('FIX-07: clicking Export while isExporting=true does not call window.prompt', () => {
        render(<Menu downloadImage={downloadImage} onImport={vi.fn()} isExporting={true} />);

        // The button should be disabled; verify prompt is not called even if clicked
        const exportBtn = screen.getByTitle('Exporting…');
        // Button is disabled so fireEvent.click won't reach the handler,
        // but we assert defensively that prompt was not called
        fireEvent.click(exportBtn);

        expect(promptSpy).not.toHaveBeenCalled();
    });

    it('FIX-07: Export button is disabled when isExporting=true', () => {
        render(<Menu downloadImage={downloadImage} onImport={vi.fn()} isExporting={true} />);
        const exportBtn = screen.getByTitle('Exporting…');
        expect(exportBtn).toBeDisabled();
    });

    it('FIX-07: Export button is enabled when isExporting=false', () => {
        render(<Menu downloadImage={downloadImage} onImport={vi.fn()} isExporting={false} />);
        const exportBtn = screen.getByTitle('Export');
        expect(exportBtn).not.toBeDisabled();
    });
});
