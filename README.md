# Comic Book Maker

A web-based tool for creating digital comic books with a drag-and-drop interface, text bubbles, and export capabilities.

## Features

- **Panel Layouts**: Choose from over 35 predefined panel layouts or create custom layouts
- **Image Management**: Upload, organize, and place images in panels
- **Text System**: 
  - Add text bubbles with 5 different styles (speech, thought, caption, shout, whisper)
  - Format text with various fonts, sizes, colors, and styles
  - Apply effects like outlines and shadows
  - Adjust bubble padding (vertical and horizontal) for perfect text fit
  - Save and reuse custom text styles
- **Stickers**: Add and position decorative elements on your pages
- **Backgrounds**: Apply custom images or predefined styles to pages
- **Organization**: Group assets with a folder system
- **Project Management**: Save, load, and export your comic book projects
- **Export**: Generate PDF files of your completed comics

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/comic-book-maker.git
   ```

2. Open the project directory:
   ```
   cd comic-book-maker
   ```

3. Open `index.html` in your web browser or set up a local server.

## Usage

1. **Getting Started**:
   - Click "New Project" to begin
   - Select a panel layout for your first page
   - Upload images to the image library

2. **Adding Content**:
   - Drag images from the library to panels
   - Click on a panel to adjust the image position and zoom
   - Add text bubbles using the text tool
   - Place stickers to enhance your comic

3. **Formatting Text**:
   - Select a text bubble to open the formatting popup
   - Change the bubble type, font, size, color, and alignment
   - Add effects like outlines and shadows
   - Adjust bubble padding (vertical and horizontal) for optimal text spacing
   - Save custom styles for reuse

4. **Managing Pages**:
   - Add new pages with the "+" button in the page navigator
   - Navigate between pages using the page thumbnails
   - Set backgrounds per page or globally

5. **Saving & Exporting**:
   - Save your project regularly with the Save button
   - Export as PDF when your comic is complete

## Technical Details

The application uses a modular JavaScript architecture with specialized manager classes for different features. For more technical information, see [TECHNICAL.md](TECHNICAL.md).

## Browser Compatibility

The Comic Book Maker works best in modern browsers:
- Chrome (recommended)
- Firefox
- Edge
- Safari

## License

[MIT License](LICENSE)

## Acknowledgements

- Font Awesome for icons
- Google Fonts for text options
- jsPDF for PDF generation
- All contributors to this project

## Support

For issues, feature requests, or questions, please open an issue on the GitHub repository. 


IF YOU ENCOUNTER ANY PROBLEM WITH THE REFACTORED TEXT MANAGER VERSION AND WANT REVERT, 
JUST DELETE THEM AND MOVE TEXTMANAGEROLD.JS to MODULES FOLER and RENAME IT TO "TextManager.js"

--------------------------------------------------------------------------------------------
🔍 How to Monitor (Simple Version):

  For Non-Technical Users:
  1. Press F12 → Click Console tab
  2. Export any comic
  3. Look for green messages = Good, Red = Problem
  4. Type this to see your stats: JSON.parse(localStorage.getItem('exportMetrics')).slice(-5)

  For Technical Users:
  // Browser console commands:
  localStorage.getItem('exportMetrics') // Raw data
  console.table(JSON.parse(localStorage.getItem('exportMetrics')).slice(-10)) // Nice table

  // Server monitoring:
  pm2 monit // Real-time
  pm2 logs comic-pro-pdf-service // Logs

--------------------------------------------------------------------------------------------
🔍 Monitoring for Your Friend (WITHOUT server access):

  This is ALL you need:

  // 1. Quick Health Check (F12 → Console)
  // After any export, look for:
  [Export Metrics] {method: 'client', success: true}  // ✅ Good
  [Export Metrics] {method: 'server', success: false} // ❌ Problem

  // 2. See Recent Exports
  JSON.parse(localStorage.getItem('exportMetrics')).slice(-5)

  // 3. Check Success Rate
  const m = JSON.parse(localStorage.getItem('exportMetrics') || '[]');
  const rate = (m.filter(x => x.success).length / m.length * 100).toFixed(0);
  console.log(`Success rate: ${rate}%`);

  // 4. See Average Export Time
  const m = JSON.parse(localStorage.getItem('exportMetrics') || '[]');
  const avg = m.reduce((s,x) => s + x.duration, 0) / m.length / 1000;
  console.log(`Avg time: ${avg.toFixed(1)} seconds`);

  What You Should Watch For:

  Good Signs:
  - Green console messages
  - Success rate > 90%
  - Client exports < 20 seconds
  - No red error messages

  Warning Signs:
  - Multiple failures in a row
  - "Request entity too large" errors (hit MB limit)
  - "Memory insufficient" errors
  - Exports taking > 2 minutes

  Simple Troubleshooting Guide for Friend:

  Problem: "Export failed"
  → Try: Smaller comic or different method

  Problem: "Request too large"
  → Issue: Hit 300MB limit
  → Fix: Remove unused images from library

  Problem: "Server busy"
  → Wait 1 minute and retry

  Problem: Slow exports
  → Client export: Close other tabs
  → Server export: Normal if < 2 minutes

  One-Line Health Check:

  You can bookmark this as a snippet:
  // Paste this for instant health report:
  (() => { const m = JSON.parse(localStorage.getItem('exportMetrics') || '[]').slice(-10); const success = m.filter(x
  => x.success).length; console.log(`📊 Last 10 exports: ${success}/10 successful (${success*10}%)`); const avg =
  m.reduce((s,x) => s + x.duration, 0) / m.length / 1000; console.log(`⏱️ Avg time: ${avg.toFixed(1)}s`); const last =
   m[m.length-1]; if(last) console.log(`📄 Last export: ${last.pageCount} pages, ${last.method}, ${last.success ? '✅'
   : '❌'}`); })();

  This gives them:
  📊 Last 10 exports: 9/10 successful (90%)
  ⏱️ Avg time: 12.3s
  📄 Last export: 25 pages, client, ✅

--------------------------------------------------------------------------------------------

UPDATED VERSION
HOW TO RUN LOCALLY:
2 terminals ( frontend and backend)

frontend:
root directory
npm start

backend:
cd comic-pro-pdf-service-deploy
npm start


HOW TO UPDATE CODE:
frontend:

root directory
git add .
git commit -m "your message"
git push origin production
npm run build
---------------------------------
vercel --prod

backend:

cd comic-pro-pdf-service-deploy
git add .
git commit -m "your message"
git push origin main
---------------------------------
ssh root@IP_DROPLET
type in password
cd Comic-M-Backend
git pull
pm2 restart all

place where nginx file is stored on backend: 
/etc/nginx/sites-available/comic-pro-pdf 