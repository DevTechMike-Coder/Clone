-- ============================================================
-- STORY TEXT OVERLAYS
-- The camera studio lets users add draggable, styled text to a
-- capture before sharing it as a story. Previously that text was
-- dropped on publish (nothing was persisted), so stories played
-- back without it. Store the overlays as JSON so the story
-- viewer can render them exactly where the user placed them.
-- ============================================================

alter table public.stories
    add column if not exists text_overlays jsonb;

comment on column public.stories.text_overlays is
    'Array of camera text overlays: { id, text, color, bgColor, bgMode, fontStyle, textAlign, fontSize, x, y, scale, rotation }';
