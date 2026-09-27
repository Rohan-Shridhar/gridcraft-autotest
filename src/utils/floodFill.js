export function floodFill(cells, index, targetColor, fillColor, gridSize) {
    if (targetColor === fillColor) return cells;
    const newCells = [...cells];
    const stack = [index];
    const visited = new Set();

    while (stack.length > 0) {
        const idx = stack.pop();
        if (visited.has(idx)) continue;

        const row = Math.floor(idx / gridSize);
        const col = idx % gridSize;

        if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) continue;
        if (newCells[idx] !== targetColor) continue;

        newCells[idx] = fillColor;
        visited.add(idx);

        // Left (only if not on left edge)
        if (col > 0) stack.push(idx - 1);
        // Right (only if not on right edge)
        if (col < gridSize - 1) stack.push(idx + 1);
        // Up
        if (row > 0) stack.push(idx - gridSize);
        // Down
        if (row < gridSize - 1) stack.push(idx + gridSize);
    }

    return newCells;
}
