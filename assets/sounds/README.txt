Drop the sound-library audio files here before running:

  npm run seed:music

File names and every other field are defined by ../supabase/seed/music_catalog.json
(one entry per track: id, title, artist, license, attribution, localFile, ...).

This directory is gitignored on purpose:
  - tens of MB of binaries do not belong in a git history,
  - Supabase Storage (`sounds` bucket) is where the app reads them from, so the
    bucket -- not the repo -- is the canonical copy once seeded,
  - downloaded tracks are licensed to *you*; committing them hands your copy to
    everyone who can read the repo, which is the one thing most of these
    licences (Pixabay's especially) forbid standing alone.

Keep the ids in the manifest stable. Posts snapshot music_track_id, so renaming
an entry orphans the sound label on posts already published.
