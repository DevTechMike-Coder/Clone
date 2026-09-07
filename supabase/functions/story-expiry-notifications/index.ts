// ============================================================================
// Edge Function: story-expiry-notifications
// ============================================================================
// The "your story is about to disappear" reminder is the one notification that
// no database event can trigger: at T-2h nothing is written to any table, so
// there is no insert to hang a trigger on. It needs a clock, which is what
// pg_cron provides (see 20260907140000_story_expiry_schedule.sql).
//
// This function is deliberately thin. It holds no query logic: the recipient
// resolution lives in `public.enqueue_story_expiry_notifications()` so it sits
// with the rest of the SQL, is covered by the repo's migration review, and can
// be exercised directly from psql. All this does is authenticate the cron
// caller and call that function.
//
// Writing rows (rather than sending pushes directly) is what keeps the
// reminder consistent with every other notification: it lands in the inbox,
// honours each user's push preferences, and is de-duplicated by the same
// partial unique index — none of which a direct-push implementation would get
// for free.
//
// Deployment: `supabase functions deploy story-expiry-notifications --no-verify-jwt`
// (verify_jwt is disabled in supabase/config.toml).
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  // -------------------------------------------------------------------------
  // Auth: the caller is pg_cron, not a signed-in user.
  // -------------------------------------------------------------------------
  const expectedToken = Deno.env.get("PUSH_FUNCTION_TOKEN");
  if (!expectedToken) {
    console.error("PUSH_FUNCTION_TOKEN is not set on this project");
    return json({ error: "server misconfigured" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const presented = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (presented !== expectedToken) {
    return json({ error: "unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "server misconfigured" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("enqueue_story_expiry_notifications");

  if (error) {
    console.error("enqueue_story_expiry_notifications failed", error);
    return json({ error: "enqueue failed" }, 500);
  }

  // `data` is the count of notification rows inserted. 0 is the normal case:
  // the job runs every 30 minutes and most windows contain no expiring story.
  console.log(`story expiry: enqueued ${data} notification(s)`);

  return json({ enqueued: data }, 200);
});
