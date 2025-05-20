import { defineConfig } from 'vite';
import { capturePageAsImage } from './src/server/puppeteer-export.js';
import path from 'path'; // Needed for resolving path for downloads
import fs from 'fs'; // Needed for reading the file to send back

// Helper function to get the project root (where vite.config.js is)
const projectRoot = process.cwd();

// Helper to parse JSON body from request
async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export default defineConfig({
  plugins: [
    {
      name: 'configure-server-for-puppeteer',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/export-pdf' && req.method === 'POST') {
            console.log('[Vite Server] Received POST request for /api/export-pdf');
            try {
              const projectState = await parseJsonBody(req);
              console.log('[Vite Server] Parsed projectState from request body');
              // console.log('[Vite Server] Project state page count:', projectState.pages.length);

              const comicAppUrl = `http://localhost:${server.config.server.port || 5173}`;
              const outputDir = path.join(projectRoot, 'temp_exports');

              // Pass projectState to capturePageAsImage
              const result = await capturePageAsImage(comicAppUrl, outputDir, projectState);

              if (result.success && result.imagePath) {
                console.log(`[Vite Server] Puppeteer capture successful: ${result.imagePath}`);
                if (fs.existsSync(result.imagePath)) {
                    res.setHeader('Content-Type', 'image/png');
                    res.setHeader('Content-Disposition', `attachment; filename="captured_page.png"`);
                    fs.createReadStream(result.imagePath).pipe(res);
                    console.log('[Vite Server] Sent captured image to client.');
                } else {
                    console.error('[Vite Server] Captured image file not found:', result.imagePath);
                    res.statusCode = 500;
                    res.end(JSON.stringify({ success: false, error: 'Captured image not found post-processing.' }));
                }
              } else {
                console.error('[Vite Server] Puppeteer capture failed:', result.error);
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: result.error || 'Puppeteer capture failed' }));
              }
            } catch (e) {
              console.error('[Vite Server] Error processing /api/export-pdf POST request:', e);
              res.statusCode = 500;
              if (e instanceof SyntaxError) { // Check if it's a JSON parsing error
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON in request body.' }));
              } else {
                res.end(JSON.stringify({ success: false, error: e.message }));
              }
            }
          } else {
            next(); // Pass to other middlewares if not our endpoint
          }
        });
      }
    }
  ],
  server: {
    // port: 5173, // You can specify a port if needed
  }
}); 