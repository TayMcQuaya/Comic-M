import { defineConfig } from 'vite';
// const configurePuppeteerExport = require('./src/server/puppeteer-export.js'); // Old CJS import
import configurePuppeteerExport from './src/server/puppeteer-export.js'; // New ES Module import
import path from 'path';
import fs from 'fs'; // fs-extra is used in puppeteer-export, but fs might still be needed here or can be removed if not.
import express from 'express'; // Import express properly
import { config } from 'dotenv'; // Add dotenv for environment variables

// Load environment variables from .env file
config();

// Helper function to get the project root (where vite.config.js is)
const projectRoot = process.cwd();

// Helper to parse JSON body from request - THIS CAN BE REMOVED if puppeteer-export.js handles it with Express-like middleware
// async function parseJsonBody(req) { ... } // Keeping for now, but ideally puppeteer-export.js handles this if router is Express-based

export default defineConfig({
  plugins: [
    {
      name: 'configure-server-for-puppeteer',
      configureServer(server) {
        // The new puppeteer-export.js module expects an Express-like router.
        // Vite's server.middlewares can be used directly if the module is adapted,
        // or we can create a minimal Express app/router to pass if needed.
        // For simplicity, let's assume the module can work with server.middlewares.use directly
        // or that it's simple enough to adapt.

        // Define the base output directory for exports
        const outputDirBase = path.join(projectRoot, 'comic_exports_output'); // Changed name for clarity
        if (!fs.existsSync(outputDirBase)) {
          fs.mkdirSync(outputDirBase, { recursive: true });
        }
        console.log(`[Vite Server] Base output directory for PDF exports: ${outputDirBase}`);
        
        // Get the URL of the comic creator (can be determined once)
        // Assuming default Vite dev server port 5173 if not specified
        const port = server.config.server.port || 5173;
        const protocol = server.config.server.https ? 'https' : 'http';
        // const host = server.config.server.host || 'localhost'; // host might resolve to '0.0.0.0' or similar
        const host = 'localhost'; // Better to use localhost explicitly for URL construction
        const comicCreatorUrl = `${protocol}://${host}:${port}`;
        console.log(`[Vite Server] Comic Creator URL determined as: ${comicCreatorUrl}`);

        // Configure the puppeteer export route by calling the exported function
        // We pass server.middlewares, which is not exactly an Express router,
        // but the puppeteer-export.js function uses router.post(path, handler)
        // which is a common pattern. If it strictly needs an Express router,
        // we might need to instantiate one: const express = require('express'); const router = express.Router();
        // And then: server.middlewares.use(router);
        // For now, let's try passing `server.middlewares` and see if the structure aligns.
        // The puppeteer-export.js `module.exports = function(router, ...)` will use this.
        // If it expects a full Express app, we'd do `server.middlewares.use(app)`
        
        // The function in puppeteer-export.js now defines the POST handler.
        // We just need to make sure it's "mounted" or made available.
        // Vite's `server.middlewares.use` is for adding middleware.
        // The simplest way to adapt the `puppeteer-export.js` which expects a router
        // is to use a mini express app for the routing.
        
        const app = express(); // Create an mini express app
        
        // Enable JSON body parsing for this mini-app, as puppeteer-export expects req.body
        app.use(express.json({ limit: '500mb' })); // Set a large limit, same as before potentially

        configurePuppeteerExport(app, comicCreatorUrl, outputDirBase); // Pass the express app as the router

        // Mount this mini-app onto Vite's middleware stack
        server.middlewares.use('/api', app); // Mount it under /api, so /api/export-pdf will be handled by 'app'

        console.log('[Vite Server] Puppeteer PDF export route configured at /api/export-pdf');

        // The old middleware logic is now entirely within puppeteer-export.js
        /*
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/export-pdf' && req.method === 'POST') {
            // ... THIS LOGIC IS NOW MOVED TO puppeteer-export.js ...
          } else {
            next();
          }
        });
        */
      }
    }
  ],
  server: {
    // port: 5173, // You can specify a port if needed
  }
}); 