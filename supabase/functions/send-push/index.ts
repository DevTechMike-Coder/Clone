// ============================================================
// send-push — Supabase Edge Function
// ============================================================
// Triggered by a Database Webhook on `public.notifications` INSERT.
// Looks up the recipient's Expo push tokens in `public.push_tokens`
// and fans the notification out to Expo's push API, which delivers
// to Apple (APNs) / Google (FCM) on our behalf.
//
// Payload shape (Database Webhook INSERT):
//   { type: "INSERT", table: "notifications", schema: "public",
//     record: { id, user_id, from_user_id, type, post_id, ... },
//     old_record: null }
//
// Required secrets (see PUSH_NOTIFICATIONS_SETUP.md):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-provided by Supabase)
//
// Deploy:
//   supabase functions deploy send-push --no-verify-jwt
// (no JWT verify: database webhooks are not Supabase-auth users; guard
//  with the shared secret header check below instead.)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
// Optional shared secret: set PUSH_WEBHOOK_SECRET on the function and send
// it from the webhook's `x-push-webhook-secret` header to reject any
// request that did not come from the configured database webhook.
const WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";

type NotificationType = "like" | "comment" | "follow" | "repost" | "message";

type NotificationRecord = {
  id: string;
  user_id: string; // recipient
  from_user_id: string; // actor
  type: NotificationType;
  post_id: string | null;
};

function bodyFor(
  type: NotificationType,
  actorName: string
): string {
  switch (type) {
    case "like":
      return `${actorName} liked your post`;
    case "comment":
      return `${actorName} commented on your post`;
    case "follow":
      return `${actorName} started following you`;
    case "repost":
      return `${actorName} reposted your post`;
    case "message":
      return `${actorName} sent you a message`;
    default:
      return `${actorName} interacted with you`;
  }
}

const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (WEBHOOK_SECRET) {
    const sent = req.headers.get("x-push-webhook-secret") ?? "";
    if (sent !== WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  let record: NotificationRecord;
  try {
    const payload = await req.json();
    if (payload?.type !== "INSERT" || payload?.table !== "notifications") {
      return new Response("Ignored", { status: 200 });
    }
    record = payload.record as NotificationRecord;
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Look up recipient devices and the actor's display name in parallel.
  const [{ data: tokenRows }, { data: actor }] = await Promise.all([
    supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", record.user_id),
    supabase
      .from("profiles")
      .select("username, full_name")
      .eq("id", record.from_user_id)
      .maybeSingle(),
  ]);

  const tokens = (tokenRows ?? []).map((r: { token: string }) => r.token);
  if (tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const actorName = actor?.username || actor?.full_name || "Someone";

  const messages = tokens.map((token: string) => ({
    to: token,
    sound: "default",
    title: "Clone",
    body: bodyFor(record.type, actorName),
    data: {
      type: record.type,
      postId: record.post_id ?? undefined,
      fromUserId: record.from_user_id ?? undefined,
    },
    channelId: "default",
  }));

  // Expo's API accepts up to 100 messages per request.
  const results = await Promise.all(
    chunk(messages, 100).map((batch) =>
      fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(batch),
      }).then((r) => r.json())
    )
  );

  return new Response(
    JSON.stringify({ sent: tokens.length, results }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
