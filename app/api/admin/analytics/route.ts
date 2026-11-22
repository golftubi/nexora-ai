import { requireAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await requireAdmin(request, "analytics:read");
    if ("response" in access) return access.response;

    const db = getDb();
    const [users, conversations, messages, usage, assistants] = await Promise.all([
      db.query(`SELECT count(*)::int AS total,
        count(*) FILTER (WHERE "createdAt" >= now() - interval '30 days')::int AS "newThisMonth"
        FROM "user"`),
      db.query(`SELECT count(*)::int AS total,
        count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS "last30Days"
        FROM conversations`),
      db.query("SELECT count(*)::int AS total FROM messages"),
      db.query(`SELECT coalesce(sum(input_tokens),0)::bigint AS "inputTokens",
        coalesce(sum(output_tokens),0)::bigint AS "outputTokens",
        sum(estimated_cost_usd)::numeric(14,6)::text AS "estimatedCost",
        count(*)::int AS requests
        FROM usage_records WHERE created_at >= now() - interval '30 days'`),
      db.query("SELECT id, name, enabled FROM assistant_catalog ORDER BY name"),
    ]);

    return Response.json({
      administrator: { email: access.session.user.email, role: access.role },
      period: "last_30_days",
      metrics: {
        users: users.rows[0],
        conversations: conversations.rows[0],
        messages: messages.rows[0],
        usage: usage.rows[0],
      },
      assistants: assistants.rows,
    });
  } catch (error) {
    console.error("Admin analytics failed:", error);
    return Response.json({ error: "Unable to load platform analytics." }, { status: 500 });
  }
}
