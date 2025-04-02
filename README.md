# Comic Creator

A simple, browser-based comic creator that lets you build comics using your own images. All processing happens in your browser - no server required!

## Features

- Create comics with various panel layouts (1×1, 2×2, etc.)
- Upload and use your own images
- Adjust images within panels (zoom and pan)
- Add text overlays with customizable fonts and colors
- Download your comic as a PDF

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Open your browser and navigate to `http://localhost:5173`

## How to Use

1. Click "Create New Comic" to start
2. Choose a panel layout from the available options
3. Upload images using the "Upload Images" button or drag-and-drop
4. Click a panel, then click an image from your library to place it
5. Adjust the image using the zoom slider and pan controls
6. Add text boxes using the "Add Text" button
7. Customize text properties (font, size, color)
8. When finished, click "Download" to save your comic as a PDF

## Browser Compatibility

Works best in modern browsers that support:
- HTML5 Canvas
- CSS Grid
- ES6+ JavaScript
- File API

## Dependencies

- Vite (for development and building)
- jsPDF (for PDF export)
- Font Awesome (for icons)

## Development

The project structure is organized as follows:

```
comic-creator/
├── index.html
├── package.json
├── src/
│   ├── js/
│   │   ├── main.js
│   │   ├── ComicCreator.js
│   │   └── layouts.js
│   └── styles/
│       └── main.css
└── README.md
```

## License

MIT License - feel free to use and modify for your own projects! 