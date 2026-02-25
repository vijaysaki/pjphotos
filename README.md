# PJ Wilkinson Photography

Static site with content loaded from AdeptLogics backend API.

## Run locally

1. **Start the backend** (adeptlogics repo):
   ```bash
   cd ../adeptlogics/backend && npm run start:dev
   ```

2. **Add a tenant for localhost** (Super Admin or DB):
   - Create tenant with domain `localhost`
   - Enable modules: Services, Contact Forms, Webpages (for menu)
   - Create a contact form with slug `contact` (or `booking`)
   - Add services (Portraits, Weddings, etc.)
   - Create a header menu with items

3. **Serve pjphotos** (must use HTTP, not `file://`):
   ```bash
   npx serve -l 5000
   ```
   (Port 5000 to avoid conflict with backend on 3000.)  
   Or: `python -m http.server 8080`

4. **Open** http://localhost:5000 in the browser.

## Config

On `<body>`:
- `data-api-base` — API URL (default: `http://localhost:3000` for local)
- `data-domain` — tenant domain (default: `localhost` for local)
- `data-contact-form-slug` — contact form slug for booking (default: `contact`)

For production, set `data-api-base="https://api.adeptlogics.com"` and `data-domain="yourdomain.com"`.
