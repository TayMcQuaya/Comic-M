# Comic-Pro PDF Export Service

This is a standalone Express.js service for handling PDF exports from the Comic-Pro application using Puppeteer.

## 🚀 Quick Start

### Local Development
```bash
cd pdf-service
npm install
npm start
```

The service will run on `http://localhost:3001`

### Environment Variables
Copy the environment variables from the main project's `env.example` file:

```env
NODE_ENV=production
COMIC_CREATOR_URL=https://your-comic-app.vercel.app
ILOVEPDF_PUBLIC_KEY=your_key_here
ILOVEPDF_SECRET_KEY=your_secret_here
EXPORT_OUTPUT_DIR=/tmp/exports
PORT=3001
```

## 📡 API Endpoints

- `GET /health` - Health check
- `POST /api/export-pdf` - Initiate PDF export (returns jobId)
- `GET /api/export-progress/:jobId` - Check export progress
- `GET /api/download-pdf/:jobId` - Download completed PDF

## 🌐 CORS Configuration

The service is configured to accept requests from:
- `localhost:*` (development)
- `*.vercel.app` (Vercel deployments)
- Your specific production domain

## 🔧 DigitalOcean Deployment

1. **Create new App** in DigitalOcean App Platform
2. **Connect this directory** as the source
3. **Set build command**: `npm install`
4. **Set run command**: `npm start`
5. **Configure environment variables** in the dashboard
6. **Deploy**

## 📝 Notes

- Requires Node.js 18+
- Uses Puppeteer for PDF generation
- Includes automatic job cleanup
- Supports PDF compression via iLovePDF API 