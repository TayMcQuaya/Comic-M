# Comic Book Maker

A powerful, browser-based comic creation tool that lets you design professional-looking comics using your own images. All processing happens client-side in your browser - no server required!

## Features

- **Rich Panel Layout Library**: Over 20 different panel layouts including single-panel, two-panel (side-by-side and top-bottom), three-panel (horizontal, vertical, L-shape), four-panel grids, and experimental layouts like overlapping panels, dynamic diagonals, and comic-style insets
- **Image Management**: Upload and organize your own images with drag-and-drop functionality
- **Advanced Image Controls**: Adjust images within panels with zoom and pan functionality
- **Text Customization**: Add speech bubbles, thought bubbles, and captions with customizable fonts, sizes, colors, and effects
- **Multi-page Support**: Create multi-page comics with different layouts per page
- **Background Styling**: Apply different background styles to panels
- **PDF Export**: Download your finished comic as a high-quality PDF
- **Responsive Design**: Works on various screen sizes and devices

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

1. **Upload Images**:
   - Click the upload area or drag and drop images to import them
   - All uploaded images appear in your library for easy access

2. **Choose a Layout**:
   - Browse through the available panel layouts
   - Each layout shows a preview and description
   - Click on your preferred layout to select it

3. **Add Images to Panels**:
   - Click on a panel, then click an image from your library to place it
   - Alternatively, drag images directly from your library to panels

4. **Adjust Images**:
   - Use the zoom slider to resize images within panels
   - Use the position controls to pan and position images perfectly
   - Images automatically maintain their aspect ratio

5. **Add Text and Speech Bubbles**:
   - Click the "Add Text" button to add text to a selected panel
   - Choose from various font families optimized for comics
   - Adjust size, color, and text effects
   - Drag to position text anywhere within the panel

6. **Multi-page Comics**:
   - Add new pages to create longer comics
   - Each page can have a different layout
   - Navigate between pages using the page controls

7. **Export Your Comic**:
   - Click the "Download Comic" button to save your creation as a PDF
   - All pages are combined into a single PDF document

## Panel Layouts

The Comic Book Maker offers a wide variety of panel layouts, including:

### Basic Layouts
- Single Panel
- Two Vertical Panels
- Two Horizontal Panels
- Classic 2×2 Grid
- Three Horizontal Panels
- Three Panel Stack

### Manga-inspired Layouts
- Manga Style (asymmetrical)
- Manga Action Layout
- Dramatic Manga Layout

### Experimental Layouts
- L-Shape Layout
- Diagonal Focus
- Four Panel Strip (Horizontal and Vertical)
- Inset Panel
- Asymmetrical Three
- Five Panel Dynamic
- Diamond Focus
- Diagonal Split
- Three-Tiered
- Staggered Panels
- Triangular Focus
- Widescreen Trio
- Nine Panel Grid (Watchmen-style)

All layouts fit perfectly within a 694 x 694 pixel square to maintain compatibility with the PDF export format. Each layout includes proper gutters between panels and margins around the edges.

## Text Features

- **Font Selection**: Choose from comic-specific fonts including:
  - Common fonts (Arial, Comic Sans MS, Times New Roman)
  - Sound effect fonts (Impact, Bangers, Anton, Russo One, Fredoka One)
  - Handwriting styles (Comic Neue, Permanent Marker, Gloria Hallelujah, etc.)
  - Title/Header fonts (Luckiest Guy, Boogaloo, Acme, Press Start 2P)

- **Text Styling**: Control size, color, and effects including:
  - Text shadows
  - Outlines
  - Rotation
  - Speech bubble styles

## Technical Details

### Project Structure

```
Comic-Book-Maker/
├── index.html            # Main HTML file
├── package.json          # Project dependencies and scripts
├── src/
│   ├── js/
│   │   ├── main.js       # Main application logic
│   │   ├── layouts.js    # Panel layout definitions
│   │   └── ComicCreator.js # Core functionality
│   └── styles/
│       └── main.css      # Application styling
└── README.md             # This documentation
```

### Technologies Used

- **Frontend Framework**: Vanilla JavaScript (no framework dependencies)
- **Bundler**: Vite for fast development and optimized builds
- **PDF Generation**: jsPDF for creating downloadable comics
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
- A 2% gap is automatically maintained between panels

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
- jsPDF for the PDF export functionality
- The comic book community for inspiration 