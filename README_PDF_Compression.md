# PDF Compression with iLovePDF Integration

This document explains how the PDF compression feature works in your Comic Creator application and how to set it up.

## Overview

Your Comic Creator now includes automatic PDF compression using the iLovePDF API. After generating a comic PDF, the system automatically compresses it to reduce file size while maintaining quality, giving users a smaller file to download.

## How It Works

1. **Comic Generation**: Pages are captured as screenshots and converted to PDF using the existing Puppeteer system
2. **PDF Merging**: Individual page PDFs are merged into a single comic PDF
3. **PDF Compression**: The merged PDF is sent to iLovePDF API for compression
4. **Download**: Users download the compressed version instead of the large original

## Setup Instructions

### 1. Install Dependencies

First, install the required dependencies:

```bash
npm install
```

This will install:
- `@ilovepdf/ilovepdf-nodejs` - Official iLovePDF Node.js library
- `dotenv` - Environment variable management

### 2. Get iLovePDF API Keys

1. Go to [https://developer.ilovepdf.com](https://developer.ilovepdf.com)
2. Sign up for a developer account (free tier available)
3. Create a new project
4. Copy your **Public Key** and **Secret Key**

### 3. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your API keys:
   ```env
   ILOVEPDF_PUBLIC_KEY=your_public_key_here
   ILOVEPDF_SECRET_KEY=your_secret_key_here
   ```

### 4. Start the Development Server

```bash
npm start
```

The server will now include PDF compression in the export process.

## Status Updates

The export process now includes these status stages:

1. **starting** - Job initialization
2. **processing** - Generating individual page PDFs
3. **compressing** - Compressing the merged PDF with iLovePDF API
4. **complete** - Ready for download

## API Endpoints

### Progress Tracking
```
GET /api/export-progress/:jobId
```

Response now includes compression information:
```json
{
  "jobId": "uuid",
  "status": "complete",
  "currentPage": 5,
  "totalPages": 5,
  "finalPdfPath": "/path/to/compressed.pdf",
  "compressionInfo": {
    "success": true,
    "compressed": true,
    "originalSize": 2048000,
    "compressedSize": 1024000,
    "compressionRatio": 50.0,
    "message": "Compressed successfully by 50.0%"
  },
  "error": null
}
```

## Fallback Behavior

The system is designed to be robust:

- **No API Keys**: If iLovePDF API keys are not configured, the system will skip compression and provide the original PDF
- **API Failure**: If compression fails, the system falls back to the original PDF
- **Network Issues**: All errors are logged, and users still get their comic PDF

## Compression Settings

The default compression level is set to **"recommended"** which provides a good balance between file size and quality. You can modify this in `src/server/puppeteer-export.js`:

```javascript
const compressionResult = await pdfCompressionService.compressPDF(
    finalPdfPath, 
    compressedPdfPath,
    { compressionLevel: 'extreme' } // Options: 'low', 'recommended', 'extreme'
);
```

## Cost Considerations

iLovePDF offers:
- **Free Tier**: 250 files per month
- **Paid Plans**: Various tiers for higher volume

Monitor your usage in the iLovePDF developer dashboard.

## File Structure

New files added:
- `src/server/pdf-compression.js` - PDF compression service
- `.env.example` - Environment variable template
- `README_PDF_Compression.md` - This documentation

Modified files:
- `src/server/puppeteer-export.js` - Added compression step
- `vite.config.js` - Added environment variable loading
- `package.json` - Added new dependencies

## Troubleshooting

### Compression Not Working
1. Check that API keys are correctly set in `.env`
2. Verify the keys work by testing them on iLovePDF developer console
3. Check server logs for specific error messages

### Files Too Large
- Consider using 'extreme' compression level
- Reduce image quality in the Puppeteer screenshot process
- Check if images in the comic are unnecessarily large

### API Limits Exceeded
- Monitor usage in iLovePDF dashboard
- Consider upgrading to a paid plan
- Implement usage tracking in your application

## Benefits for Users

- **Smaller Downloads**: PDFs are typically 30-70% smaller
- **Faster Downloads**: Less bandwidth required
- **Same Quality**: Visual quality is preserved
- **Automatic**: No extra steps required 