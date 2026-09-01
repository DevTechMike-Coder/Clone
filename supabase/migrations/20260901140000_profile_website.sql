-- The profile editor already reads/writes a `website` column, and the
-- profile page renders it as a clickable link, but the initial schema did
-- not include it. Add it idempotently so existing deployments don't break.

alter table public.profiles
    add column if not exists website text;

-- RLS on profiles already allows the owner to update any column; no policy
-- changes are required.
