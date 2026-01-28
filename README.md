# Query Tracker Web App

A Next.js web application for the Query Tracker system, designed to work with the Chrome extension for seamless Google authentication.

## Features

- **Bucket View**: Visual Kanban-style display of queries organized by status
- **List View**: Traditional table view with sortable columns
- **Query Details**: Modal with full audit trail (added by, assigned by, edited by)
- **Auto-refresh**: Automatically updates every 30 seconds
- **Demo Mode**: Test the UI without authentication

## Setup

### 1. Install Dependencies

```bash
cd web-app
npm install
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```bash
cp .env.local.example .env.local
```

Required variables:

- `GOOGLE_CLIENT_ID`: Your Google Cloud OAuth 2.0 Client ID
- `GOOGLE_CLIENT_SECRET`: Your Google Cloud OAuth 2.0 Client Secret
- `SPREADSHEET_ID`: The Google Sheets ID (already set to existing sheet)
- `NEXT_PUBLIC_APP_URL`: Your deployment URL (http://localhost:3000 for dev)

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Test Demo Mode

Visit [http://localhost:3000/dashboard?demo=true](http://localhost:3000/dashboard?demo=true) to see the UI with sample data.

## How Authentication Works

1. User clicks the Chrome extension icon
2. Extension uses `chrome.identity.getAuthToken()` for seamless Google sign-in
3. Extension opens the web app with token: `http://localhost:3000/auth/callback?token=...`
4. Web app validates the token and stores it in localStorage
5. Token is used to fetch data from Google Sheets API

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Other Platforms

Build the production version:

```bash
npm run build
npm start
```

## Project Structure

```
web-app/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   ├── globals.css         # Global styles
│   ├── auth/
│   │   └── callback/
│   │       └── page.tsx    # Auth callback handler
│   ├── dashboard/
│   │   └── page.tsx        # Main dashboard
│   └── api/
│       └── queries/
│           └── route.ts    # API endpoint for fetching queries
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Integration with Chrome Extension

The Chrome extension passes the OAuth token to this web app via URL parameter. Make sure to:

1. Update the extension's `popup.js` with the correct web app URL
2. Both extension and web app should use the same Google Cloud project/OAuth credentials
