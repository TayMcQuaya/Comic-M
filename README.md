# Comic Book Maker

A powerful, browser-based comic creation tool that lets you design professional-looking comics using your own images. All processing happens client-side in your browser - no server required!

## Features

- **Rich Panel Layout Library**: Over 35 different panel layouts including single-panel, standard grids (2x1, 1x2, 2x2, 3x1, 1x3, 3x2, 3x3), manga-inspired styles, and numerous creative and dynamic layouts like spirals, diagonals, insets, and cinematic arrangements.
- **Image Management**: Upload and organize your own images with drag-and-drop functionality. Reorder images in the library.
- **Advanced Image Controls**: Adjust images within panels with zoom and pan functionality. Fine-tune zoom using direct numerical input.
- **Stickers**: Add sticker images to panels. Stickers stay within panel boundaries and automatically layer behind text.
- **Backgrounds**: Add custom background images to the entire canvas or apply predefined style patterns (vintage paper, halftone, etc.). Apply custom images or styles to all pages.
- **Text Customization**: Add speech bubbles (including standard, whisper, and jagged styles), thought bubbles, and captions with customizable fonts, sizes, colors, and effects.
- **Advanced Text Effects**: Includes smooth text outlines positioned behind the text, shadow effects, adjustable line spacing, and 50% opacity control for text elements.
- **Fine Control**: Sliders for zoom, size, rotation, and line height now support direct numerical input for precise adjustments.
- **Save & Load Projects**: Save your entire comic project (pages, images, text, styles, backgrounds, stickers) to a JSON file and load it later to continue working.
- **Multi-page Support**: Create multi-page comics with different layouts per page. Reorder pages easily via a drag-and-drop interface.
- **PDF Export**: Download your finished comic as a high-quality PDF, prompting for a custom filename.
- **Responsive Design**: Works on various screen sizes and devices.
- **Modern UI**: Includes tabbed sidebars, clear controls, and user feedback notifications.

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm (v6+)

### Installation

1. Clone the repository or download the source code
   ```bash
   git clone https://github.com/yourusername/Comic-Book-Maker.git
   cd Comic-Book-Maker
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

To create an optimized production build:

```bash
npm run build
```

The built files will be in the `dist` directory and can be served from any static file server.

## How to Use

### Creating a Comic

1. **Upload Images or Load Project**:
   - Click the upload area or drag and drop images to import them.
   - Alternatively, click "Load Project" to load a previously saved `.json` file.
   - All uploaded images appear in your library for easy access.
   - Drag images within the library to reorder them.

2. **Choose a Layout**:
   - Browse through the extensive list of available panel layouts.
   - Each layout shows a preview and description.
   - Click on your preferred layout to select it for the current page.

3. **Add Images / Backgrounds / Stickers**:
   - Use the sidebar tabs to switch between adding Panel Images, Backgrounds, or Stickers.
   - **Panel Images**: Drag images from your library to panels.
   - **Backgrounds**: Drag images from your library onto the canvas (outside panels) or select a predefined style. Use the "Apply This Image to All Pages" button if needed.
   - **Stickers**: Drag images from your library onto a specific panel. (Note: Stickers must be dropped *on* a panel).

4. **Adjust Elements**:
   - **Panel Images**: Use the zoom slider/input and position controls in the right sidebar.
   - **Stickers**: Select a sticker, then use the size slider/input and position controls in the right sidebar.
   - Images and stickers automatically maintain their aspect ratio.

5. **Add Text and Bubbles**:
   - Select a panel, then click the "Add Text" button.
   - Click the palette icon on a text bubble to open the formatting popup.
   - Choose fonts, adjust size/color/line-height (using slider or direct input), apply styles (bold, italic, etc.).
   - Select bubble styles (speech, thought, caption, shout, whisper, jagged, or no bubble).
   - Position the bubble tail.
   - Apply effects like outlines (with thickness/color control), shadows, and opacity.
   - Drag to position text anywhere within the panel; use the rotation slider/input for angles.

6. **Manage Pages**:
   - Add new pages to create longer comics.
   - Each page can have a different layout and background.
   - Navigate between pages using the page controls.
   - Click "Reorder Pages" to open a modal where you can drag-and-drop pages into a new sequence.

7. **Save Your Project**:
   - Click the "Save Project" button in the editor toolbar to download your current work as a `.json` file (you'll be prompted for a filename).

8. **Export Your Comic**:
   - Click the "Download Comic" button to save your finished creation as a PDF (you'll be prompted for a filename).
   - All pages are combined into a single PDF document.

## Panel Layouts

The Comic Book Maker offers a wide variety of panel layouts (over 35 options), including:

### Basic & Grid Layouts
- Single Panel
- Two Vertical Panels
- Two Horizontal Panels
- Three Horizontal Panels
- Three Panel Stack
- Classic 2×2 Grid
- Six Panel Grid (3x2)
- Nine Panel Grid (3x3)
- Four Panel Strip (Horizontal and Vertical)

### Manga-inspired Layouts
- Manga Style (asymmetrical)
- Manga Action Layout
- Dramatic Manga Layout

### Advanced & Creative Layouts
- **Emphasis & Focus**: L-Shape, Diagonal Focus, Inset Panel, Asymmetrical Three, Diamond Focus, Triangular Focus, Spiral Focus, Cross Layout, Pyramid, Windmill, Radial Burst, Golden Ratio, Pillarbox
- **Story Flow**: Five Panel Dynamic, Zigzag Flow, Panoramic Focus, Storyboard, Circular Narrative, Split Screen, Cascade, Mosaic, Double Spread, Cinematic Widescreen, Dynamic Diagonal, Three-Tiered, Staggered Panels, Widescreen Trio

All layouts fit perfectly within a 700 x 700 pixel square canvas. Each layout includes proper gutters between panels and margins around the edges.

## Text Features

- **Font Selection**: Choose from comic-specific fonts including:
  - Common fonts (Arial, Comic Sans MS, Times New Roman)
  - Sound effect fonts (Impact, Bangers, Anton, Russo One, Fredoka One)
  - Handwriting styles (Comic Neue, Permanent Marker, Gloria Hallelujah, etc.)
  - Title/Header fonts (Luckiest Guy, Boogaloo, Acme, Press Start 2P)

- **Text Styling**: Control size, color, line height, bold, italic, underline, alignment.
- **Advanced Effects**: Apply shadows, smooth outlines (with thickness/color control), and 50% opacity.
- **Bubble Styles**: Choose from standard speech, thought, caption, shout, whisper, jagged, or no bubble.
- **Positioning & Rotation**: Drag text elements freely and rotate them using a slider or direct input.
- **Precise Control**: Use sliders or type exact values for font size, line height, and rotation.

## Technical Details

### Project Structure

```
Comic-Book-Maker/
├── index.html            # Main HTML file
├── package.json          # Project dependencies and scripts
├── src/
│   ├── js/
│   │   ├── main.js       # Main application logic, event handling, UI updates
│   │   ├── layouts.js    # Panel layout definitions
│   │   └── ComicCreator.js # Core class managing state and functionality (Deprecated/Refactored into main.js)
│   └── styles/
│       └── main.css      # Application styling
└── README.md             # This documentation
```

*Note: Functionality previously in `ComicCreator.js` has been integrated into `main.js`.*

### Technologies Used

- **Frontend Framework**: Vanilla JavaScript (no framework dependencies)
- **Bundler**: Vite for fast development and optimized builds
- **PDF Generation**: jsPDF & html2canvas for creating downloadable comics
- **UI Components**: Font Awesome for icons
- **Styling**: Custom CSS with CSS variables for theming

### Layout System

Layouts are defined in `layouts.js` as a collection of panels with percentage-based coordinates:

```javascript
{
  name: "Layout Name",
  description: "Layout description",
  panels: [
    { x: 0, y: 0, width: 49, height: 49 },
    { x: 51, y: 0, width: 49, height: 49 },
    // Additional panels...
  ]
}
```

- `x` and `y`: Position coordinates as percentages (0-100)
- `width` and `height`: Size as percentages (0-100)
- A default gap (controlled via CSS) is automatically maintained between panels.

## Browser Compatibility

The Comic Book Maker works best in modern browsers that support:

- HTML5 Canvas
- CSS Grid
- ES6+ JavaScript
- File API

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests for new features, bug fixes, or improvements.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use and modify for your own projects!

## Acknowledgments

- Font Awesome for the icon library
- Google Fonts for the text font options
- jsPDF & html2canvas for the PDF export functionality
- The comic book community for inspiration 