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

1.  **Modify `src/js/layouts.js`:**
    *   Create a new exported layout collection object for this dimension (e.g., `export const webtoonVerticalLayouts = { /* ... layouts ... */ };`).
    *   Populate this object with at least one layout definition (e.g., a simple 'single panel' layout).

2.  **Modify `src/js/main.js`:**
    *   **Import the new layout collection:** At the top of the file, add your new layout collection to the import statement from `'./layouts.js'`.
        *   Example: `import { layouts, amazonKDPLayouts, landscapeLayouts, webtoonVerticalLayouts } from './layouts.js';`
    *   **Add to `ComicCreator` constructor:**
        *   Add a new entry to the `this.canvasDimensions` object. The key should be a unique identifier for the new dimension (e.g., `webtoonVertical`), and the value should be an object with `width` (in pixels), `height` (in pixels), and a `name` (user-friendly string).
            *   Example: `webtoonVertical: { width: 800, height: 1280, name: "Webtoon Vertical (800x1280px)" }`
        *   Assign the imported layout collection to a new property on `this`.
            *   Example: `this.webtoonVerticalLayouts = webtoonVerticalLayouts;`
    *   **Update `setupLayoutSelection()` method:**
        *   Add a new `case` to the `switch (this.selectedCanvasDimension)` statement to handle your new dimension key. This case should set `activeLayoutCollection` to the new layout property you defined on `this`.
            *   Example:
                ```javascript
                // ...
                switch (this.selectedCanvasDimension) {
                    // ... existing cases ...
                    case 'webtoonVertical':
                        activeLayoutCollection = this.webtoonVerticalLayouts;
                        break;
                    default:
                        activeLayoutCollection = this.layouts;
                        break;
                }
                // ...
                ```
    *   **Update `getLayoutConfig()` method:**
        *   Modify the section where `config` is assigned to include your new layout collection in the search order. It's generally best to add it before the default `this.layouts` if these are dimension-specific, or in an order that makes sense for your desired fallback behavior.
            *   Example (adding `this.webtoonVerticalLayouts`):
                ```javascript
                // ...
                if (typeof layoutName === 'string') {
                    config = this.amazonKDPLayouts[layoutName] ||      // Existing
                             this.landscapeLayouts[layoutName] ||     // Existing
                             this.webtoonVerticalLayouts[layoutName] || // New
                             this.layouts[layoutName];                // Default/Square (often last)
                }
                // ...
                ```

3.  **Update UI for Dimension Selection (HTML & JS):**
    *   Add a new button in your `index.html` (likely within the `.canvas-size-selection .button-row`) for selecting this new canvas dimension. Give it a unique ID.
        *   Example: `<button class="primary-btn" id="set-canvas-webtoonVertical">Webtoon Vertical</button>`
    *   In `src/js/main.js`, within the `setupEventListeners()` method (specifically in the canvas dimension button listeners part):
        *   Add an event listener for your new button that calls `this.setCanvasDimension('yourNewDimensionKey')`.
            *   Example: `document.getElementById('set-canvas-webtoonVertical').addEventListener('click', () => this.setCanvasDimension('webtoonVertical'));`
    *   In the `setCanvasDimension(dimensionKey)` method:
        *   Ensure the new button's active state is correctly managed (add `classList.add('active-size')` to the new button and `classList.remove('active-size')` from others).

**Note on Scalability:** The current system uses individual properties for each dimension's layouts (e.g., `this.amazonKDPLayouts`) and a `switch` statement in `setupLayoutSelection`. The `getLayoutConfig` method also requires manual updates. For significantly more dimensions, consider refactoring to use a single `this.layoutCollections` map in the `ComicCreator` constructor. This map could store all layout objects (predefined and custom) keyed by dimension. Such a change would simplify `setupLayoutSelection` and `getLayoutConfig`, making them more dynamic and less prone to needing manual updates for each new dimension.

## Custom Layouts and Dimensions

Currently, the comic creator handles custom layouts (those created via the "Layout Builder" or uploaded as `.layout` files) in the following way:

*   **Storage:** All custom layouts are stored within the primary `this.layouts` object in the `ComicCreator` instance. This is the same object that holds the predefined layouts for the default (square 1:1) canvas dimension.
*   **Availability:** Because they are in `this.layouts`, and `getLayoutConfig` searches `this.layouts` (typically as a fallback), these custom layouts become technically available regardless of which canvas dimension is currently selected.
*   **Behavior:** When a custom layout is applied, its panel definitions (which are percentage-based: `x, y, width, height`) are rendered relative to the currently active canvas dimensions. This means a custom layout designed visually while the "Amazon KDP" dimension was active will still have its percentages applied to an "Amazon KDP" sized canvas if selected under that dimension.

**Limitations and Considerations:**

*   **No Formal Dimension Link:** Custom layouts do not have a formal, stored association with the specific canvas dimension that was active when they were created. Their "link" is implicit based on the user's design intent and current selection.
*   **Naming Conflicts:** If a custom layout is given an ID (filename) that matches a predefined layout ID in one of the dimension-specific collections (e.g., `amazonKDPLayouts`), the predefined layout might be found first by `getLayoutConfig` depending on its search order, potentially overriding the user's custom layout if they intended to use that ID.

**Future Enhancements (Advanced):**

For a more robust system where custom layouts are explicitly tied to dimensions:

1.  **Dimension-Specific Custom Layout Storage:** Modify the custom layout saving/loading logic (e.g., in `LayoutBuilderManager.js` or when handling `.layout` file uploads) to store custom layouts in a structure that associates them with the `selectedCanvasDimension` active at the time of creation/upload. This might involve creating dynamic properties on `this` like `this.customAmazonKDPLayouts`, or a nested object structure.
2.  **Update `getLayoutConfig`:** Enhance `getLayoutConfig` to first search for custom layouts associated with the current dimension before falling back to the general `this.layouts` or predefined dimension-specific layouts.

These advanced changes would require more significant modifications to the JavaScript logic. For now, the system relies on the flexibility of percentage-based layouts and the current search order in `getLayoutConfig`.

## Potential Areas for Future Adjustments

As you add more complex layouts or dimensions, consider these:

1.  **Minimum/Maximum Sizes:** For very small panels, you might want to enforce minimum sizes for text bubbles or stickers to maintain readability and usability.
2.  **Aspect Ratio Dependencies:** If sticker graphics or background images are designed for specific aspect ratios, they might not look ideal in panels of significantly different aspect ratios. You might eventually need different asset versions or more sophisticated scaling/cropping.
3.  **User Experience for Small Panels:** Adding text or detailed stickers to very tiny panels can be difficult. This is a UX consideration.
4.  **Specific Styling per Dimension/Layout Type:** While core functionality should be modular, you might want to introduce CSS rules for subtle styling adjustments based on active dimension or layout type (e.g., different default font sizes). This would be an enhancement.

By following this structure, the layout system can be expanded systematically. The use of percentage-based panel dimensions is a strong foundation for adapting to various canvas sizes and configurations. 