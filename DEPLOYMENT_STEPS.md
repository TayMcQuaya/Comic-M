# Step-by-Step Deployment Instructions

## 📋 Phase 1: Prepare Your Environment

### Step 1.1: Create Environment Files
```bash
# In your project root, create these files:
cp env.example .env.local
cp env.example .env.production
```

### Step 1.2: Update Environment Variables

**Edit `.env.local`** for local development:
```env
NODE_ENV=development
VITE_API_BASE_URL=http://localhost:5173/api
COMIC_CREATOR_URL=http://localhost:5173
ILOVEPDF_PUBLIC_KEY=your_ilovepdf_public_key_here
ILOVEPDF_SECRET_KEY=your_ilovepdf_secret_key_here
EXPORT_OUTPUT_DIR=./comic_exports_output
VITE_PORT=5173
```

**Edit `.env.production`** for production (update URLs after deployment):
```env
NODE_ENV=production
VITE_API_BASE_URL=https://YOUR_PDF_SERVICE_URL.ondigitalocean.app/api
COMIC_CREATOR_URL=https://YOUR_COMIC_APP.vercel.app
ILOVEPDF_PUBLIC_KEY=your_ilovepdf_public_key_here
ILOVEPDF_SECRET_KEY=your_ilovepdf_secret_key_here
EXPORT_OUTPUT_DIR=/tmp/exports
```

### Step 1.3: Test Local Setup
```bash
# Install dependencies
npm install

# Start the development server
npm start
```

Test that everything works locally before deploying.

---

## 📋 Phase 2: Deploy PDF Service to DigitalOcean

### Step 2.1: Create DigitalOcean Account
1. Go to [DigitalOcean](https://www.digitalocean.com/)
2. Sign up for an account
3. Navigate to **App Platform**

### Step 2.2: Create New App
1. Click **"Create App"**
2. Choose **"GitHub"** as source
3. **Select your repository**
4. **Choose the `pdf-service` folder** as the source directory
5. **Select branch** (usually `main` or `master`)

### Step 2.3: Configure Build Settings
- **Build Command**: `npm install`
- **Run Command**: `npm start`
- **Environment**: `Node.js`
- **Plan**: Basic ($5/month)

### Step 2.4: Set Environment Variables
In the DigitalOcean dashboard, add these environment variables:
```
NODE_ENV=production
COMIC_CREATOR_URL=https://YOUR_VERCEL_APP.vercel.app
ILOVEPDF_PUBLIC_KEY=your_key_here
ILOVEPDF_SECRET_KEY=your_secret_here
EXPORT_OUTPUT_DIR=/tmp/exports
```

### Step 2.5: Deploy and Test
1. Click **"Create Resources"**
2. Wait for deployment to complete
3. Copy the service URL (e.g., `https://comic-pro-pdf-abcd1234.ondigitalocean.app`)
4. Test health endpoint: `https://YOUR_URL.ondigitalocean.app/health`

---

## 📋 Phase 3: Deploy Frontend to Vercel

### Step 3.1: Prepare Vercel Account
1. Go to [Vercel](https://vercel.com/)
2. Sign up with GitHub
3. Install Vercel CLI: `npm i -g vercel`

### Step 3.2: Update Production Environment
**Edit your `.env.production`** with the actual DigitalOcean URL:
```env
VITE_API_BASE_URL=https://YOUR_ACTUAL_PDF_SERVICE.ondigitalocean.app/api
```

### Step 3.3: Deploy to Vercel
```bash
# In your project root
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name: comic-pro (or your preferred name)
# - Directory: ./ (current directory)
```

### Step 3.4: Set Vercel Environment Variables
```bash
# Set production environment variables
vercel env add VITE_API_BASE_URL production
# Enter: https://YOUR_PDF_SERVICE.ondigitalocean.app/api

vercel env add NODE_ENV production
# Enter: production
```

### Step 3.5: Update CORS Configuration
**In your PDF service**, update the CORS origins in `pdf-service/server.js`:
```javascript
'https://your-comic-app.vercel.app', // Replace with your actual Vercel URL
```

Redeploy the PDF service after this change.

---

## 📋 Phase 4: Final Configuration

### Step 4.1: Update URLs
1. **Copy your Vercel app URL** (e.g., `https://comic-pro-abc123.vercel.app`)
2. **Update DigitalOcean environment variables**:
   - `COMIC_CREATOR_URL=https://comic-pro-abc123.vercel.app`
3. **Update your local `.env.production`** file with correct URLs

### Step 4.2: Test End-to-End
1. Visit your Vercel app
2. Create a comic with some panels
3. Try to export to PDF
4. Verify the export works completely

### Step 4.3: Setup Domain (Optional)
- Add custom domain in Vercel dashboard
- Update CORS settings in PDF service
- Update environment variables

---

## ✅ Verification Checklist

### Local Development
- [ ] `npm start` works
- [ ] Comic creator loads
- [ ] PDF export completes locally

### PDF Service (DigitalOcean)
- [ ] Service deploys successfully
- [ ] Health check responds: `GET /health`
- [ ] Environment variables are set
- [ ] Logs show no errors

### Frontend (Vercel)
- [ ] App deploys successfully
- [ ] Environment variables are set
- [ ] App loads in browser
- [ ] API calls reach DigitalOcean service

### End-to-End
- [ ] Can create comic panels
- [ ] Can export to PDF
- [ ] PDF downloads successfully
- [ ] No CORS errors in browser console

---

## 🔧 Troubleshooting

### Common Issues

**CORS Error**: 
- Check DigitalOcean service CORS configuration
- Verify Vercel URL in allowed origins

**Service Not Found**:
- Verify DigitalOcean service is running
- Check environment variable URLs

**Export Fails**:
- Check DigitalOcean service logs
- Verify iLovePDF API keys
- Check Puppeteer dependencies

### Getting Help
1. Check service logs in DigitalOcean dashboard
2. Check browser console for errors
3. Verify all URLs are correct
4. Test each service individually

---

## 🎉 Success!

Once all checklist items are complete, your Comic-Pro app is successfully deployed with:
- ✅ Frontend on Vercel (free)
- ✅ PDF service on DigitalOcean ($5/month)
- ✅ Full export functionality working
- ✅ Works locally and in production 