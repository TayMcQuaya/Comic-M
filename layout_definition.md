# Layout System Modularity and Future Changes

This document outlines the modularity of the comic creator's layout system and considerations for future expansions, particularly regarding different canvas dimensions and new layout additions.

## Core Modularity

The system is designed to be reasonably modular, especially when adding new panel layouts for an *existing* canvas dimension.

*   **Panels:** Panel definitions (using `x`, `y`, `width`, `height` as percentages) are inherently tied to the canvas they are placed on. The `PanelManager` correctly interprets these percentages relative to the *current* canvas dimensions (thanks to `panelManager.updateCanvasSize`). This means adding new panel configurations for a specific dimension (e.g., more layouts for "Amazon KDP") primarily involves adding new entries to the corresponding layout object (e.g., `amazonKDPLayouts`) in `src/js/layouts.js`. No changes to the panel rendering logic itself should be needed for new *arrangements* of panels.

*   **Text Bubbles, Stickers, Backgrounds:**
    *   **Positioning:** These elements are usually positioned relative to either the entire canvas or specific panels. If their positioning logic uses percentages or is dynamically calculated based on panel/canvas boundaries, they should adapt well to different panel layouts within a dimension. For instance, a text bubble centered in a panel should remain centered even if that panel is smaller or larger in a different layout.
    *   **Sizing:** This is an area that might require attention.
        *   If elements are sized *relative* to their parent panel or the canvas (e.g., width: 50% of panel), they will scale automatically. This is the ideal scenario.
        *   If they have *absolute pixel sizes*, they might appear too large on small panels or too small on large ones. Consideration should be given to whether these absolute sizes are appropriate across various panel dimensions that arise from different layouts.
    *   **Content:** Text content within bubbles is independent of layout. Simple backgrounds (colors, basic patterns) should also adapt. Complex image backgrounds designed for specific aspect ratios might need different versions or more sophisticated scaling/cropping if the default behavior isn't ideal for all panel shapes.

## Adding New Layouts for Existing Dimensions

1.  **Modify `src/js/layouts.js`:**
    *   Locate the layout collection object for the target dimension (e.g., `squareLayouts`, `amazonKDPLayouts`, `landscapeLayouts`).
    *   Add a new entry to this object. The key will be the unique ID for your new layout, and the value will be an object containing:
        *   `name`: A user-friendly name for the layout.
        *   `description`: A brief description.
        *   `panels`: An array of panel objects, each with `x`, `y`, `width`, and `height` defined as percentages (0-100).

## Adding New Canvas Dimensions

1.  **Modify `src/js/main.js`:**
    *   In the `ComicCreator` constructor, add a new entry to the `this.canvasDimensions` object. The key should be a unique identifier for the new dimension (e.g., `webtoonVertical`), and the value should be an object with `width` (in pixels), `height` (in pixels), and a `name` (user-friendly string).
    *   Example: `webtoonVertical: { width: 800, height: 1280, name: "Webtoon Vertical (800x1280px)" }`
2.  **Modify `src/js/layouts.js`:**
    *   Create a new exported layout collection object for this dimension (e.g., `export const webtoonVerticalLayouts = { ... };`).
    *   Populate this object with at least one layout definition, similar to how `amazonKDPLayouts` or `landscapeLayouts` were started (e.g., a simple 'single panel' layout).
3.  **Update `this.layoutCollections` in `src/js/main.js`:**
    *   In the `ComicCreator` constructor, add a new entry to `this.layoutCollections` that maps your new dimension key (from step 1) to the new layout collection object you created in `src/js/layouts.js` (from step 2).
    *   Example: `webtoonVertical: webtoonVerticalLayouts,`
4.  **Update UI for Dimension Selection (HTML & JS):**
    *   Add a new button in your `index.html` for selecting this new canvas dimension.
    *   In `src/js/main.js`, within `setupEventListeners()`, add an event listener for this new button that calls `this.setCanvasDimension('yourNewDimensionKey')`.
    *   In `setCanvasDimension()`, ensure the new button's active state is correctly toggled.

## Potential Areas for Future Adjustments

As you add more complex layouts or dimensions, consider these:

1.  **Minimum/Maximum Sizes:** For very small panels, you might want to enforce minimum sizes for text bubbles or stickers to maintain readability and usability.
2.  **Aspect Ratio Dependencies:** If sticker graphics or background images are designed for specific aspect ratios, they might not look ideal in panels of significantly different aspect ratios. You might eventually need different asset versions or more sophisticated scaling/cropping.
3.  **User Experience for Small Panels:** Adding text or detailed stickers to very tiny panels can be difficult. This is a UX consideration.
4.  **Specific Styling per Dimension/Layout Type:** While core functionality should be modular, you might want to introduce CSS rules for subtle styling adjustments based on active dimension or layout type (e.g., different default font sizes). This would be an enhancement.

By following this structure, the layout system can be expanded systematically. The use of percentage-based panel dimensions is a strong foundation for adapting to various canvas sizes and configurations. 