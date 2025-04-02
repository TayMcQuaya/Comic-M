// Convert array to object for easier lookup
export const layouts = {
    'single': {
        name: 'Single Panel',
        description: 'One large panel for a single scene',
        panels: [
            { x: 0, y: 0, width: 100, height: 100 }
        ]
    },
    'two-vertical': {
        name: 'Two Vertical Panels',
        description: 'Classic manga-style vertical split',
        panels: [
            { x: 0, y: 0, width: 49, height: 100 },
            { x: 51, y: 0, width: 49, height: 100 }
        ]
    },
    'two-horizontal': {
        name: 'Two Horizontal Panels',
        description: 'Two panels side by side',
        panels: [
            { x: 0, y: 0, width: 50, height: 100 },
            { x: 50, y: 0, width: 50, height: 100 }
        ]
    },
    'three-horizontal': {
        name: 'Three Horizontal Panels',
        description: 'Three panels side by side',
        panels: [
            { x: 0, y: 0, width: 33, height: 100 },
            { x: 33, y: 0, width: 34, height: 100 },
            { x: 67, y: 0, width: 33, height: 100 }
        ]
    },
    'three-stack': {
        name: 'Three Panel Stack',
        description: 'Three panels stacked vertically',
        panels: [
            { x: 0, y: 0, width: 100, height: 33 },
            { x: 0, y: 33, width: 100, height: 33 },
            { x: 0, y: 66, width: 100, height: 34 }
        ]
    },
    'four-grid': {
        name: 'Classic 2×2 Grid',
        description: 'Traditional four-panel comic layout',
        panels: [
            { x: 0, y: 0, width: 49, height: 49 },
            { x: 51, y: 0, width: 49, height: 49 },
            { x: 0, y: 51, width: 49, height: 49 },
            { x: 51, y: 51, width: 49, height: 49 }
        ]
    },
    'manga-style': {
        name: 'Manga Style',
        description: 'Asymmetrical manga-inspired layout',
        panels: [
            { x: 0, y: 0, width: 60, height: 100 },
            { x: 60, y: 0, width: 40, height: 50 },
            { x: 60, y: 50, width: 40, height: 50 }
        ]
    },
    mangaAction: {
        name: "Manga Action Layout",
        description: "Dynamic layout for action scenes",
        panels: [
            { x: 0, y: 0, width: 60, height: 60 },
            { x: 62, y: 0, width: 38, height: 38 },
            { x: 62, y: 40, width: 38, height: 38 },
            { x: 0, y: 62, width: 38, height: 38 },
            { x: 40, y: 62, width: 60, height: 38 }
        ]
    },
    sixPanel: {
        name: "Six Panel Grid",
        description: "Detailed storytelling layout",
        panels: [
            { x: 0, y: 0, width: 32, height: 49 },
            { x: 34, y: 0, width: 32, height: 49 },
            { x: 68, y: 0, width: 32, height: 49 },
            { x: 0, y: 51, width: 32, height: 49 },
            { x: 34, y: 51, width: 32, height: 49 },
            { x: 68, y: 51, width: 32, height: 49 }
        ]
    },
    mangaDramatic: {
        name: "Dramatic Manga Layout",
        description: "Emphasis on key moments",
        panels: [
            { x: 0, y: 0, width: 100, height: 40 },
            { x: 0, y: 42, width: 32, height: 58 },
            { x: 34, y: 42, width: 32, height: 28 },
            { x: 68, y: 42, width: 32, height: 28 },
            { x: 34, y: 72, width: 66, height: 28 }
        ]
    },
    threeUneven: {
        name: "Three Uneven Panels",
        description: "Dynamic storytelling with emphasis",
        panels: [
            { x: 0, y: 0, width: 49, height: 100 },
            { x: 51, y: 0, width: 49, height: 49 },
            { x: 51, y: 51, width: 49, height: 49 }
        ]
    }
};

// Helper function to create custom grid layouts
export function createGridLayout(rows, cols) {
    const panels = [];
    const cellWidth = 100 / cols;
    const cellHeight = 100 / rows;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            panels.push({
                x: col * cellWidth,
                y: row * cellHeight,
                width: cellWidth,
                height: cellHeight
            });
        }
    }

    return {
        id: `custom-${rows}x${cols}`,
        name: `${rows}×${cols} Grid`,
        description: `Custom ${rows} by ${cols} grid layout`,
        panels: panels
    };
} 