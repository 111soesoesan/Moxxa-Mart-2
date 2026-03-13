# moxxa-mart2

A Next.js 16 web application with Supabase integration, running on Replit.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: Tailwind CSS v4, shadcn/ui (Radix UI), Lucide React
- **Backend/DB**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **Language**: TypeScript
- **Package Manager**: npm

## Running the App

The app runs via the "Start application" workflow using:
```
npm run dev
```
This starts Next.js on port 5000, bound to 0.0.0.0 (required for Replit's preview proxy).

## Key Configuration

- **Port**: 5000 (Replit webview requirement)
- **Host**: 0.0.0.0 (required for Replit's proxied iframe preview)
- **Dev script**: `next dev -p 5000 -H 0.0.0.0`
- **Start script**: `next start -p 5000 -H 0.0.0.0`

## Environment Variables

If using Supabase features, you will need to set:
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anonymous/public key

Set these as secrets in the Replit Secrets panel.

## Project Structure

```
src/
  app/          # Next.js App Router pages and layouts
  components/   # Shared UI components
  lib/          # Utility functions and shared logic
public/         # Static assets
supabase/       # Supabase configuration/migrations
```
