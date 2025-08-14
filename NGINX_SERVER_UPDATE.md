# Nginx Configuration Update Instructions

## When to Execute
Execute these commands on your DigitalOcean droplet AFTER deploying the backend code changes.

## Step-by-Step Instructions

### 1. SSH into your server
```bash
ssh root@YOUR_DROPLET_IP
# Enter your password when prompted
```

### 2. Update the Nginx configuration
```bash
sudo nano /etc/nginx/sites-available/comic-pro-pdf
```

### 3. Find and update the client_max_body_size
Look for the line:
```nginx
client_max_body_size 200M;
```

Change it to:
```nginx
client_max_body_size 300M;
```

### 4. Add timeout settings (if not already present)
Add these lines in the `location /` block if they don't exist:
```nginx
# Timeout settings for large file processing
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;
```

### 5. Save and exit
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

### 6. Test the configuration
```bash
sudo nginx -t
```

You should see:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 7. Reload Nginx
```bash
sudo systemctl reload nginx
```

### 8. Deploy backend changes and restart PM2
```bash
cd ~/Comic-M-Backend
git pull
pm2 restart comic-pro-pdf-service
```

### 9. Verify the service is running
```bash
pm2 status
pm2 logs comic-pro-pdf-service --lines 20
```

## Expected Nginx Configuration
Your final nginx config should look like this in the relevant sections:

```nginx
server {
    listen 443 ssl;
    server_name pdf.conference-router-planner.org;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/pdf.conference-router-planner.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pdf.conference-router-planner.org/privkey.pem;

    # Client upload size limit for large comics
    client_max_body_size 300M;  # <-- Updated from 200M
    
    # Add request buffering settings
    client_body_buffer_size 150M;
    proxy_buffer_size 150k;
    proxy_buffers 8 150k;
    proxy_busy_buffers_size 150k;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings for large file processing
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        
        # NO CORS headers here - Express handles them
    }
}
```

## Verification
After completing these steps, test with a comic export to verify:
1. No more 413 (Request Entity Too Large) errors
2. Comics up to ~40-50 pages should now work
3. Check memory usage: `pm2 monit`

## Rollback (if needed)
If issues occur, revert the changes:
```bash
# Change back to 200M
sudo nano /etc/nginx/sites-available/comic-pro-pdf
# Edit the client_max_body_size back to 200M
sudo nginx -t
sudo systemctl reload nginx
```