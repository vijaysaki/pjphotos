# PJ Wilkinson Photography

Static site with content loaded from AdeptLogics backend API.

## Run locally

1. **Start the backend** (adeptlogics repo):
   ```bash
   cd ../adeptlogics/backend && npm run start:dev
   ```

2. **Add a tenant** (Super Admin or DB):
   - Create tenant with domain `localhost` (or use `tenantId` in config.js)
   - Enable modules: Services, Contact Forms, Webpages, **Galleries**
   - Create a contact form with slug `contact`
   - Add services, create a header menu, and create gallery folders with images

3. **Serve pjphotos** (must use HTTP, not `file://`):
   ```bash
   npx serve -l 5000
   ```
   (Port 5000 to avoid conflict with backend on 3000.)  
   Or: `python -m http.server 8080`

4. **Open** http://localhost:5000 in the browser.

The nav **Gallery** item shows a dropdown with the full folder hierarchy. Click a folder to jump directly to that gallery.

## Config

Edit `config.js` — single place for API, tenant, and contact form settings:
- `apiBase` — API URL
- `domain` — tenant domain
- `tenantId` — tenant UUID (used when domain doesn’t match, e.g. local dev)
- `contactFormSlug` — contact form slug for booking

For local dev, set `apiBase: "http://localhost:3000"` in `config.js`.
