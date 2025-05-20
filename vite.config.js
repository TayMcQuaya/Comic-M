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
              // Parse the project state from the request body
              const projectState = await parseJsonBody(req);
              console.log('[Vite Server] Parsed projectState from request body');

              // Create temporary directory for exports
              const outputDirectory = path.join(projectRoot, 'temp_exports');
              if (!fs.existsSync(outputDirectory)) {
                fs.mkdirSync(outputDirectory, { recursive: true });
              }

              // Get the URL of the comic creator
              const protocol = req.protocol || 'http';
              const host = req.headers.host || 'localhost:5173';
              const comicCreatorUrl = `${protocol}://${host}`;

              // Generate the PDF
              const result = await capturePageAsImage(comicCreatorUrl, outputDirectory, projectState);

              // Read the generated PDF
              const pdfData = fs.readFileSync(result.pdfPath);

              // Set response headers
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', 'attachment; filename="comic.pdf"');
              res.setHeader('Content-Length', pdfData.length);

              // Send the PDF
              res.end(pdfData);

              // Clean up temporary files
              fs.unlinkSync(result.pdfPath);
              
            } catch (error) {
              console.error('[Vite Server] Error processing /api/export-pdf POST request:', error);
              res.statusCode = 500;
              res.end(`Error generating PDF: ${error.message}`);
            }
          } else {
            next();
          }
        });
      }
    }
  ],
  server: {
    // port: 5173, // You can specify a port if needed
  }
}); 