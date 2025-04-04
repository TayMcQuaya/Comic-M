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
        description: 'Two panels stacked vertically',
        panels: [
            { x: 0, y: 0, width: 100, height: 49 },
            { x: 0, y: 51, width: 100, height: 49 }
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
    },
    // New layouts
    'l-shape': {
        name: "L-Shape Layout",
        description: "Three panels arranged in an L shape",
        panels: [
            { x: 0, y: 0, width: 66, height: 60 },
            { x: 68, y: 0, width: 32, height: 60 },
            { x: 0, y: 62, width: 100, height: 38 }
        ]
    },
    'diagonal-focus': {
        name: "Diagonal Focus",
        description: "Dynamic layout with diagonal emphasis",
        panels: [
            { x: 0, y: 0, width: 49, height: 49 },
            { x: 51, y: 0, width: 49, height: 33 },
            { x: 51, y: 35, width: 49, height: 33 },
            { x: 51, y: 70, width: 49, height: 30 },
            { x: 0, y: 51, width: 49, height: 49 }
        ]
    },
    'four-strip-horizontal': {
        name: "Four Panel Strip (Horizontal)",
        description: "Classic four-panel comic strip layout",
        panels: [
            { x: 0, y: 0, width: 24, height: 100 },
            { x: 26, y: 0, width: 24, height: 100 },
            { x: 52, y: 0, width: 24, height: 100 },
            { x: 78, y: 0, width: 22, height: 100 }
        ]
    },
    'four-strip-vertical': {
        name: "Four Panel Strip (Vertical)",
        description: "Vertical comic strip layout",
        panels: [
            { x: 0, y: 0, width: 100, height: 24 },
            { x: 0, y: 26, width: 100, height: 24 },
            { x: 0, y: 52, width: 100, height: 24 },
            { x: 0, y: 78, width: 100, height: 22 }
        ]
    },
    'inset-panel': {
        name: "Inset Panel",
        description: "Dramatic layout with inset panel",
        panels: [
            { x: 0, y: 0, width: 100, height: 100 },
            { x: 65, y: 65, width: 33, height: 33 }
        ]
    },
    'asymmetrical-three': {
        name: "Asymmetrical Three",
        description: "Three panels with one dominant",
        panels: [
            { x: 0, y: 0, width: 100, height: 60 },
            { x: 0, y: 62, width: 49, height: 38 },
            { x: 51, y: 62, width: 49, height: 38 }
        ]
    },
    'five-panel-dynamic': {
        name: "Five Panel Dynamic",
        description: "Five panels for complex storytelling",
        panels: [
            { x: 0, y: 0, width: 60, height: 38 },
            { x: 62, y: 0, width: 38, height: 38 },
            { x: 0, y: 40, width: 38, height: 38 },
            { x: 40, y: 40, width: 60, height: 38 },
            { x: 0, y: 80, width: 100, height: 20 }
        ]
    },
    'diamond-focus': {
        name: "Diamond Focus",
        description: "Center-focused layout with four panels",
        panels: [
            { x: 0, y: 0, width: 49, height: 49 },
            { x: 51, y: 0, width: 49, height: 49 },
            { x: 0, y: 51, width: 49, height: 49 },
            { x: 51, y: 51, width: 49, height: 49 },
            { x: 25, y: 25, width: 50, height: 50 }
        ]
    },
    'diagonal-split': {
        name: "Diagonal Split",
        description: "Two panels with diagonal split",
        panels: [
            { x: 0, y: 0, width: 60, height: 60 },
            { x: 40, y: 40, width: 60, height: 60 }
        ]
    },
    'three-tiered': {
        name: "Three-Tiered",
        description: "Three panels of varying sizes stacked",
        panels: [
            { x: 0, y: 0, width: 100, height: 25 },
            { x: 0, y: 27, width: 100, height: 46 },
            { x: 0, y: 75, width: 100, height: 25 }
        ]
    },
    'staggered-panels': {
        name: "Staggered Panels",
        description: "Four panels with staggered arrangement",
        panels: [
            { x: 0, y: 0, width: 74, height: 32 },
            { x: 26, y: 34, width: 74, height: 32 },
            { x: 0, y: 68, width: 74, height: 32 },
            { x: 76, y: 0, width: 24, height: 100 }
        ]
    },
    'triangular-focus': {
        name: "Triangular Focus",
        description: "Three panels arranged in a triangle pattern",
        panels: [
            { x: 0, y: 0, width: 100, height: 49 },
            { x: 0, y: 51, width: 49, height: 49 },
            { x: 51, y: 51, width: 49, height: 49 }
        ]
    },
    'widescreen-trio': {
        name: "Widescreen Trio",
        description: "Three wide panels for cinematic effect",
        panels: [
            { x: 0, y: 0, width: 100, height: 30 },
            { x: 0, y: 32, width: 100, height: 36 },
            { x: 0, y: 70, width: 100, height: 30 }
        ]
    },
    'nine-panel-grid': {
        name: "Nine Panel Grid",
        description: "Classic Watchmen-style layout",
        panels: [
            { x: 0, y: 0, width: 32, height: 32 },
            { x: 34, y: 0, width: 32, height: 32 },
            { x: 68, y: 0, width: 32, height: 32 },
            { x: 0, y: 34, width: 32, height: 32 },
            { x: 34, y: 34, width: 32, height: 32 },
            { x: 68, y: 34, width: 32, height: 32 },
            { x: 0, y: 68, width: 32, height: 32 },
            { x: 34, y: 68, width: 32, height: 32 },
            { x: 68, y: 68, width: 32, height: 32 }
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