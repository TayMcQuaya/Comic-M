// Convert array to object for easier lookup
export const layouts = {
    'single': {
        name: 'Single Panel',
        description: 'One large panel for a single scene',
        panels: [
            { x: 0, y: 0, width: 100, height: 100 }
        ]
    },
    'empty': {
        name: 'Empty Canvas',
        description: 'Blank canvas with no panels',
        panels: []
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
    },
    // Add new layouts
    'cross-layout': {
        name: "Cross Layout",
        description: "Panels arranged in a cross pattern",
        panels: [
            { x: 33, y: 0, width: 34, height: 32 },
            { x: 0, y: 34, width: 32, height: 32 },
            { x: 34, y: 34, width: 32, height: 32 },
            { x: 68, y: 34, width: 32, height: 32 },
            { x: 33, y: 68, width: 34, height: 32 }
        ]
    },
    'pyramid': {
        name: "Pyramid Layout",
        description: "Panels stacked in a pyramid formation",
        panels: [
            { x: 25, y: 0, width: 50, height: 32 },
            { x: 12, y: 34, width: 38, height: 32 },
            { x: 50, y: 34, width: 38, height: 32 },
            { x: 0, y: 68, width: 32, height: 32 },
            { x: 34, y: 68, width: 32, height: 32 },
            { x: 68, y: 68, width: 32, height: 32 }
        ]
    },
    'zigzag': {
        name: "Zigzag Flow",
        description: "Panels arranged in a zigzag reading pattern",
        panels: [
            { x: 0, y: 0, width: 48, height: 32 },
            { x: 52, y: 0, width: 48, height: 32 },
            { x: 26, y: 34, width: 48, height: 32 },
            { x: 0, y: 68, width: 48, height: 32 },
            { x: 52, y: 68, width: 48, height: 32 }
        ]
    },
    'panoramic-focus': {
        name: "Panoramic Focus",
        description: "Wide panoramic panel with supporting panels",
        panels: [
            { x: 0, y: 0, width: 100, height: 40 },
            { x: 0, y: 42, width: 48, height: 28 },
            { x: 52, y: 42, width: 48, height: 28 },
            { x: 0, y: 72, width: 32, height: 28 },
            { x: 34, y: 72, width: 32, height: 28 },
            { x: 68, y: 72, width: 32, height: 28 }
        ]
    },
    'storyboard': {
        name: "Storyboard Layout",
        description: "Film-style storyboard arrangement",
        panels: [
            { x: 0, y: 0, width: 74, height: 48 },
            { x: 76, y: 0, width: 24, height: 48 },
            { x: 0, y: 52, width: 24, height: 48 },
            { x: 26, y: 52, width: 74, height: 48 }
        ]
    },
    'circular-narrative': {
        name: "Circular Narrative",
        description: "Panels arranged in a circular reading pattern",
        panels: [
            { x: 0, y: 0, width: 48, height: 48 },
            { x: 52, y: 0, width: 48, height: 48 },
            { x: 52, y: 52, width: 48, height: 48 },
            { x: 0, y: 52, width: 48, height: 48 },
            { x: 26, y: 26, width: 48, height: 48 }
        ]
    },
    'split-screen': {
        name: "Split Screen",
        description: "Parallel narrative layout with split panels",
        panels: [
            { x: 0, y: 0, width: 48, height: 100 },
            { x: 52, y: 0, width: 48, height: 32 },
            { x: 52, y: 34, width: 48, height: 32 },
            { x: 52, y: 68, width: 48, height: 32 }
        ]
    },
    'cascade': {
        name: "Cascade Layout",
        description: "Panels cascading in size from top to bottom",
        panels: [
            { x: 0, y: 0, width: 100, height: 32 },
            { x: 10, y: 34, width: 80, height: 32 },
            { x: 20, y: 68, width: 60, height: 32 }
        ]
    },
    'mosaic': {
        name: "Mosaic Grid",
        description: "Complex mosaic of varying panel sizes",
        panels: [
            { x: 0, y: 0, width: 38, height: 38 },
            { x: 40, y: 0, width: 28, height: 58 },
            { x: 70, y: 0, width: 30, height: 38 },
            { x: 0, y: 40, width: 38, height: 60 },
            { x: 70, y: 40, width: 30, height: 60 },
            { x: 40, y: 60, width: 28, height: 40 }
        ]
    },
    'double-spread': {
        name: "Double Spread",
        description: "Magazine-style double spread layout",
        panels: [
            { x: 0, y: 0, width: 60, height: 70 },
            { x: 62, y: 0, width: 38, height: 34 },
            { x: 62, y: 36, width: 38, height: 34 },
            { x: 0, y: 72, width: 100, height: 28 }
        ]
    },
    'cinematic-widescreen': {
        name: "Cinematic Widescreen",
        description: "Movie-style widescreen panel arrangement",
        panels: [
            { x: 0, y: 0, width: 100, height: 24 },
            { x: 0, y: 26, width: 48, height: 48 },
            { x: 52, y: 26, width: 48, height: 48 },
            { x: 0, y: 76, width: 100, height: 24 }
        ]
    },
    'dynamic-diagonal': {
        name: "Dynamic Diagonal",
        description: "Panels arranged along diagonal lines",
        panels: [
            { x: 0, y: 0, width: 48, height: 48 },
            { x: 26, y: 26, width: 48, height: 48 },
            { x: 52, y: 52, width: 48, height: 48 }
        ]
    },
    'golden-ratio': {
        name: "Golden Ratio",
        description: "Panels following the golden ratio proportions",
        panels: [
            { x: 0, y: 0, width: 62, height: 62 },
            { x: 64, y: 0, width: 36, height: 36 },
            { x: 64, y: 38, width: 36, height: 24 },
            { x: 0, y: 64, width: 100, height: 36 }
        ]
    },
    'radial-burst': {
        name: "Radial Burst",
        description: "Panels radiating from center point",
        panels: [
            { x: 25, y: 25, width: 50, height: 50 },
            { x: 0, y: 0, width: 32, height: 32 },
            { x: 68, y: 0, width: 32, height: 32 },
            { x: 0, y: 68, width: 32, height: 32 },
            { x: 68, y: 68, width: 32, height: 32 }
        ]
    },
    // Minimalist layouts with generous gutters
    'center-vertical': {
        name: "Center Vertical",
        description: "Single vertical panel centered on the page",
        panels: [
            { x: 30, y: 10, width: 40, height: 80 }
        ]
    },
    'center-horizontal': {
        name: "Center Horizontal",
        description: "Single horizontal panel centered on the page",
        panels: [
            { x: 10, y: 30, width: 80, height: 40 }
        ]
    },
    'floating-trio': {
        name: "Floating Trio",
        description: "Three small panels with plenty of white space",
        panels: [
            { x: 15, y: 15, width: 30, height: 30 },
            { x: 55, y: 15, width: 30, height: 30 },
            { x: 35, y: 55, width: 30, height: 30 }
        ]
    },
    'wide-margins': {
        name: "Wide Margins",
        description: "Four panels with extra wide margins",
        panels: [
            { x: 15, y: 15, width: 30, height: 30 },
            { x: 55, y: 15, width: 30, height: 30 },
            { x: 15, y: 55, width: 30, height: 30 },
            { x: 55, y: 55, width: 30, height: 30 }
        ]
    },
    'letterbox': {
        name: "Letterbox",
        description: "Wide horizontal panel with generous top and bottom margins",
        panels: [
            { x: 10, y: 35, width: 80, height: 30 }
        ]
    },
    'pillarbox': {
        name: 'Pillarbox',
        description: 'Tall panel with narrow side gutters',
        panels: [
            // Main tall panel (50% width, 98% height, centered)
            { x: 25, y: 1, width: 50, height: 98 }
        ]
    },
    'pillarbox-inset': {
        name: 'Pillarbox with Top-Right Inset',
        description: 'Tall panel with a small overlapping square in the top-right corner',
        panels: [
            // Main tall panel (shifted left)
            { x: 5, y: 1, width: 50, height: 98 },
            // Larger square overlapping top-right (shifted left)
            { x: 45, y: 5, width: 48, height: 48 } 
        ]
    },
    'pillarbox-inset-top-left': {
        name: 'Pillarbox with Top-Left Inset',
        description: 'Tall panel with an overlapping square in the top-left corner',
        panels: [
            // Main tall panel (shifted right)
            { x: 45, y: 1, width: 50, height: 98 },
            // Square overlapping top-left
            { x: 7, y: 5, width: 48, height: 48 }
        ]
    },
    'pillarbox-inset-bottom-right': {
        name: 'Pillarbox with Bottom-Right Inset',
        description: 'Tall panel with an overlapping square in the bottom-right corner',
        panels: [
            // Main tall panel (shifted left)
            { x: 5, y: 1, width: 50, height: 98 },
            // Square overlapping bottom-right
            { x: 45, y: 50, width: 48, height: 48 }
        ]
    },
    'pillarbox-inset-bottom-left': {
        name: 'Pillarbox with Bottom-Left Inset',
        description: 'Tall panel with an overlapping square in the bottom-left corner',
        panels: [
            // Main tall panel (shifted right)
            { x: 45, y: 1, width: 50, height: 98 },
            // Square overlapping bottom-left
            { x: 7, y: 50, width: 48, height: 48 }
        ]
    },
    'pillarbox-dual-insets': {
        name: 'Pillarbox with Dual Insets',
        description: 'Tall panel with insets in opposite corners',
        panels: [
            // Main tall panel (centered)
            { x: 25, y: 1, width: 50, height: 98 },
            // Top-right inset
            { x: 65, y: 5, width: 30, height: 30 },
            // Bottom-left inset
            { x: 5, y: 65, width: 30, height: 30 }
        ]
    },
    'landscape-inset-top-right': {
        name: 'Landscape with Top-Right Inset',
        description: 'Wide panel with an overlapping square in the top-right corner',
        panels: [
            // Main landscape panel
            { x: 1, y: 25, width: 98, height: 50 },
            // Inset in top-right
            { x: 65, y: 5, width: 30, height: 30 }
        ]
    },
    'landscape-inset-bottom-left': {
        name: 'Landscape with Bottom-Left Inset',
        description: 'Wide panel with an overlapping square in the bottom-left corner',
        panels: [
            // Main landscape panel
            { x: 1, y: 25, width: 98, height: 50 },
            // Inset in bottom-left
            { x: 5, y: 65, width: 30, height: 30 }
        ]
    },
    'square-with-corner-insets': {
        name: 'Square with Corner Insets',
        description: 'Large central square with smaller squares in three corners',
        panels: [
            // Main square panel
            { x: 15, y: 15, width: 70, height: 70 },
            // Top-left inset
            { x: 5, y: 5, width: 20, height: 20 },
            // Top-right inset
            { x: 75, y: 5, width: 20, height: 20 },
            // Bottom-right inset
            { x: 75, y: 75, width: 20, height: 20 }
        ]
    },
    'triple-vertical-inset': {
        name: 'Triple Vertical with Inset',
        description: 'Three vertical panels with an overlapping inset',
        panels: [
            // Three vertical panels
            { x: 0, y: 0, width: 30, height: 100 },
            { x: 33, y: 0, width: 34, height: 100 },
            { x: 70, y: 0, width: 30, height: 100 },
            // Inset overlapping the middle
            { x: 45, y: 35, width: 30, height: 30 }
        ]
    },
    'grid-with-center-inset': {
        name: 'Grid with Center Inset',
        description: '2×2 grid with a central overlapping inset',
        panels: [
            // 2×2 grid
            { x: 0, y: 0, width: 49, height: 49 },
            { x: 51, y: 0, width: 49, height: 49 },
            { x: 0, y: 51, width: 49, height: 49 },
            { x: 51, y: 51, width: 49, height: 49 },
            // Central overlapping inset
            { x: 35, y: 35, width: 30, height: 30 }
        ]
    },
    'diagonal-inset': {
        name: 'Diagonal with Inset',
        description: 'Diagonal panel arrangement with corner inset',
        panels: [
            // Diagonal panels
            { x: 0, y: 0, width: 65, height: 65 },
            { x: 35, y: 35, width: 65, height: 65 },
            // Corner inset
            { x: 75, y: 5, width: 20, height: 20 }
        ]
    },
    'l-shape-inset': {
        name: 'L-Shape with Inset',
        description: 'L-shaped panel arrangement with inset',
        panels: [
            // L-shape panels
            { x: 0, y: 0, width: 70, height: 60 },
            { x: 0, y: 62, width: 100, height: 38 },
            // Inset
            { x: 75, y: 10, width: 20, height: 20 }
        ]
    },
    'inset-inception': {
        name: 'Inset Inception',
        description: 'Inset within an inset for layered storytelling',
        panels: [
            // Main panel
            { x: 5, y: 5, width: 90, height: 90 },
            // First inset
            { x: 65, y: 15, width: 30, height: 30 },
            // Second inset (within first)
            { x: 75, y: 25, width: 15, height: 15 }
        ]
    },
    'panoramic-with-insets': {
        name: 'Panoramic with Insets',
        description: 'Wide panoramic panel with smaller inset panels',
        panels: [
            // Main panoramic panel
            { x: 0, y: 30, width: 100, height: 40 },
            // Top-left inset
            { x: 5, y: 5, width: 25, height: 20 },
            // Top-right inset
            { x: 70, y: 5, width: 25, height: 20 },
            // Bottom-left inset
            { x: 5, y: 75, width: 25, height: 20 },
            // Bottom-right inset
            { x: 70, y: 75, width: 25, height: 20 }
        ]
    },
    'staggered-insets': {
        name: 'Staggered Insets',
        description: 'Main panel with staggered inset pattern',
        panels: [
            // Main panel
            { x: 10, y: 10, width: 80, height: 80 },
            // Staggered insets
            { x: 70, y: 5, width: 20, height: 20 },
            { x: 60, y: 30, width: 15, height: 15 },
            { x: 75, y: 50, width: 10, height: 10 }
        ]
    },
    'floating-insets': {
        name: 'Floating Insets',
        description: 'Multiple small inset panels without a main panel',
        panels: [
            { x: 10, y: 10, width: 35, height: 35 },
            { x: 55, y: 10, width: 35, height: 35 },
            { x: 10, y: 55, width: 35, height: 35 },
            { x: 55, y: 55, width: 35, height: 35 },
            { x: 35, y: 35, width: 30, height: 30 }
        ]
    },
    'floating-square': {
        name: "Floating Square",
        description: "Single square panel centered with generous margins",
        panels: [
            { x: 25, y: 25, width: 50, height: 50 }
        ]
    },
    'vertical-thirds-centered': {
        name: "Vertical Thirds Centered",
        description: "Three vertical panels with extra gutter space",
        panels: [
            { x: 20, y: 10, width: 20, height: 80 },
            { x: 45, y: 10, width: 20, height: 80 },
            { x: 70, y: 10, width: 20, height: 80 }
        ]
    },
    'horizontal-thirds-centered': {
        name: "Horizontal Thirds Centered",
        description: "Three horizontal panels with extra gutter space",
        panels: [
            { x: 10, y: 20, width: 80, height: 20 },
            { x: 10, y: 45, width: 80, height: 20 },
            { x: 10, y: 70, width: 80, height: 20 }
        ]
    },
    'landscape-top-inset': {
        name: "Landscape with Top-Centre Inset",
        description: "Wide landscape panel with a smaller panel inset at the top center",
        panels: [
            { x: 0, y: 0, width: 100, height: 100 }, // Main background panel
            { x: 30, y: 10, width: 40, height: 30 }  // Top-center inset panel
        ]
    },
    'landscape-large-bottom-inset': {
        name: "Landscape with Large Bottom-Left Inset",
        description: "Wide landscape panel positioned higher with a larger inset at the bottom left",
        panels: [
            // Main landscape panel moved up
            { x: 1, y: 15, width: 98, height: 45 },
            // Larger inset in bottom-left
            { x: 5, y: 62, width: 40, height: 35 }
        ]
    },
    // Layouts from user images
    'top-left-inset': {
        name: "TOP-LEFT INSET",
        description: "A horizontal bottom panel with a square inset panel overlapping from the top-left",
        panels: [
            { x: 0, y: 20, width: 100, height: 80 },  // Main horizontal panel
            { x: 10, y: 0, width: 35, height: 35 }    // Top-left inset panel
        ]
    },
    'single-panel-large-square': {
        name: "SINGLE PANEL LARGE SQUARE",
        description: "A large square panel floating in the middle",
        panels: [
            { x: 20, y: 20, width: 60, height: 60 }   // Centered square panel
        ]
    },
    'two-square-one-vertical': {
        name: "TWO SQUARE ONE VERTICAL",
        description: "Two square panels on the left with one vertical panel on the right",
        panels: [
            { x: 0, y: 0, width: 49, height: 49 },    // Top-left square
            { x: 0, y: 51, width: 49, height: 49 },   // Bottom-left square
            { x: 51, y: 0, width: 49, height: 100 }   // Right vertical panel
        ]
    },
    'single-vertical-panel-medium': {
        name: "SINGLE VERTICAL PANEL MEDIUM",
        description: "A larger vertical panel option",
        panels: [
            { x: 20, y: 0, width: 60, height: 100 }   // Centered vertical panel
        ]
    },
    'split-screen': {
        name: "SPLIT SCREEN",
        description: "Side-by-side panels showing parallel action",
        panels: [
            { x: 0, y: 0, width: 49, height: 32 },    // Top-left
            { x: 51, y: 0, width: 49, height: 32 },   // Top-right
            { x: 0, y: 34, width: 49, height: 32 },   // Middle-left
            { x: 51, y: 34, width: 49, height: 32 },  // Middle-right
            { x: 0, y: 68, width: 49, height: 32 },   // Bottom-left
            { x: 51, y: 68, width: 49, height: 32 }   // Bottom-right
        ]
    },
    'asymmetrical-dynamic': {
        name: "ASYMMETRICAL DYNAMIC",
        description: "Complex asymmetrical layout for dynamic storytelling",
        panels: [
            { x: 0, y: 0, width: 55, height: 35 },    // Top-left large panel
            { x: 57, y: 0, width: 43, height: 60 },   // Right vertical panel
            { x: 0, y: 37, width: 27, height: 23 },   // Middle-left small panel
            { x: 29, y: 37, width: 26, height: 43 },  // Middle-center small panel
            { x: 0, y: 62, width: 55, height: 38 },   // Bottom-left medium panel
            { x: 57, y: 62, width: 43, height: 38 }   // Bottom-right medium panel
        ]
    },
    'comic-book-style': {
        name: "COMIC BOOK STYLE",
        description: "Dynamic asymmetrical layout with varying panel sizes",
        panels: [
            { x: 0, y: 0, width: 60, height: 49 },    // Top-left large panel
            { x: 62, y: 0, width: 38, height: 24 },   // Top-right small panel
            { x: 62, y: 26, width: 38, height: 23 },  // Middle-right small panel
            { x: 0, y: 51, width: 49, height: 49 },   // Bottom-left medium panel
            { x: 51, y: 51, width: 49, height: 49 }   // Bottom-right medium panel
        ]
    },
    'single-horizontal-panel-medium': {
        name: "SINGLE HORIZONTAL PANEL MEDIUM",
        description: "A larger horizontal panel option",
        panels: [
            { x: 0, y: 35, width: 100, height: 30 }   // Centered horizontal panel
        ]
    },
    'landscape-with-bottom-left-inset': {
        name: "LANDSCAPE WITH BOTTOM LEFT INSET",
        description: "Wide mangel with an overlapping square in the bottom-left",
        panels: [
            { x: 0, y: 0, width: 100, height: 70 },    // Main wide panel at the top
            { x: 10, y: 60, width: 30, height: 30 }    // Overlapping square in the bottom-left
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