import { requireAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await requireAdmin(request);
    if ("response" in access) return access.response;

    const db = getDb();
    const [users, conversations, messages, usage, assistants, recentUsers, recentAudit] = await Promise.all([
      db.query(`SELECT count(*)::int AS total,
        count(*) FILTER (WHERE "createdAt" >= now() - interval '30 days')::int AS "newThisMonth"
        FROM "user"`),
      db.query(`SELECT count(*)::int AS total,
        count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS "last30Days"
        FROM conversations`),
      db.query("SELECT count(*)::int AS total FROM messages"),
      db.query(`SELECT coalesce(sum(input_tokens),0)::bigint AS "inputTokens",
        coalesce(sum(output_tokens),0)::bigint AS "outputTokens",
        coalesce(sum(estimated_cost_usd),0)::numeric(14,6)::text AS "estimatedCost",
        count(*)::int AS requests
        FROM usage_records WHERE created_at >= now() - interval '30 days'`),
      db.query(`SELECT id, name, description, enabled, access_level AS "accessLevel"
        FROM assistant_catalog ORDER BY CASE id
        WHEN 'general' THEN 1 WHEN 'technology' THEN 2 WHEN 'business' THEN 3
        WHEN 'research' THEN 4 WHEN 'education' THEN 5 ELSE 6 END`),
      db.query(`SELECT id, name, email, "createdAt" AS "createdAt"
        FROM "user" ORDER BY "createdAt" DESC LIMIT 8`),
      db.query(`SELECT id, action, resource_type AS "resourceType", created_at AS "createdAt"
        FROM audit_logs ORDER BY created_at DESC LIMIT 8`),
    ]);

    return Response.json({
      administrator: { email: access.session.user.email, role: access.role },
      metrics: {
        users: users.rows[0],
        conversations: conversations.rows[0],
        messages: messages.rows[0],
        usage: usage.rows[0],
      },
      assistants: assistants.rows,
      recentUsers: recentUsers.rows,
      recentAudit: recentAudit.rows,
    });
  } catch (error) {
    console.error("Admin overview failed:", error);
    return Response.json({ error: "Unable to load the administration overview." }, { status: 500 });
  }
}
