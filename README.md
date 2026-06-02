# Pookie Smelly Belly

A bright little love-counter app with two tappable circles, saved tap counts, and a bad-day love note.

## Run Locally

```bash
python3 -m http.server 5173
```

Then open `http://localhost:5173`.

## Supabase Memory

The app uses the Supabase project already configured in `script.js`. To enable cloud memory, run `supabase-setup.sql` in the Supabase SQL editor for that project.

Each tap is stored as its own row in `public.pookie_love_taps`, so the app remembers the actual tap history instead of only saving totals. If the table is not available yet, the app keeps working with browser local storage.

For realtime updates between two browsers, enable realtime for `public.pookie_love_taps` in Supabase after creating the table.
