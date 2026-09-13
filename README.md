# JW Original Songs Lyrics

A progressive web app (PWA) built with React (Vite) and Supabase for browsing, reading, and listening to Original Songs.

## Features
- **Browse Categories**: Filter songs by collections (e.g., Original Songs, Become Jehovah's Friend).
- **Lyrics & Audio**: Read beautifully formatted lyrics and listen to the song simultaneously.
- **Offline Support**: Read lyrics even without an internet connection (cached via Service Workers).
- **Dark/Light Mode**: Premium dark purple theme by default, with an optional light mode.
- **Admin Panel**: Manage categories and songs via a built-in protected route (`/admin/login`).

## Tech Stack
- Frontend: React (Vite) + Vanilla CSS
- Backend: Supabase (Postgres, Storage, Auth)
- Icons: lucide-react
- PWA: vite-plugin-pwa

## Setup Instructions

1. **Clone the repository** and install dependencies:
   ```bash
   npm install
   ```

2. **Configure Supabase**:
   - Create a new Supabase project.
   - Run the SQL migration in `supabase/migrations/00_initial_schema.sql` in your Supabase SQL Editor.
   - Create an Admin user via the Supabase Auth dashboard (Email/Password).
   - Set up a Storage Bucket named `images` if you plan to host feature images on Supabase.

3. **Set Environment Variables**:
   Create a `.env` file in the root directory and add:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run Locally**:
   ```bash
   npm run dev
   ```

5. **Deploy to Vercel**:
   - Connect your GitHub repo to Vercel.
   - Add the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your Vercel project environment variables.
   - Deploy!

## Admin Panel
Access the admin panel locally at `http://localhost:5173/admin/login`. 
Use the credentials you created in Supabase Auth to log in and manage your content.
