# EcoQuest Live

A real-time observation viewer for biodiversity monitoring in Costa Rica.

## Features

- **Bronze Mode**: Real-time map-based observation viewer with:
  - Interactive Leaflet map centered on Tortuguero, Costa Rica
  - Observation filtering by date range, quality grade, and user logins
  - Location overlays (circles) and corridor overlays (buffered polygons)
  - Live feed of observations sorted by date
  - Developer tools for debugging

## Setup

1. Copy the environment template:
```sh
cp .env.example .env
```

2. Fill in your Supabase credentials in `.env`:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Install dependencies:
```sh
npm i
```

4. Start the development server:
```sh
npm run dev
```

## Database Schema

The Bronze mode expects the following Supabase schema (public):

### View: `observations_public_v1`
- `inat_obs_id` (bigint)
- `user_login` (text)
- `latitude` (float8)
- `longitude` (float8)
- `quality_grade` (text)
- `observed_at_utc` (timestamptz) or `time_observed_at` (timestamptz)
- `taxon_name` (text) or `species_guess` (text)
- `photo_url` (text, optional)

### RPC: `obs_bbox_v1` (optional, with fallback)
```sql
obs_bbox_v1(
  sw_lat float8,
  sw_lon float8,
  ne_lat float8,
  ne_lon float8,
  d_from timestamptz default now()-interval '30 days',
  d_to timestamptz default now(),
  qg text[] default array['research','needs_id','casual'],
  logins text[] default null
)
```

If the RPC is not available, the app will automatically fall back to direct queries on `observations_public_v1`.

### Overlays:
- `trip_locations` (slug, label, radius_km, lat, lon)
- `trip_corridors` (slug, label, width_km, lat1, lon1, lat2, lon2)

## Security

This app uses **only the Supabase anonymous key** for read-only access. No service role key is required or used.

## Technologies

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui components
- Supabase for backend
- Leaflet + React-Leaflet for maps
- Turf.js for geospatial operations
- Zustand for state management
- date-fns for date formatting

## Project info

**URL**: https://lovable.dev/projects/b7d658fa-a7d1-4165-8966-0a62c6c2f973
