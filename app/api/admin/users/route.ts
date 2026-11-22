import { requireAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await requireAdmin(request);
    if ("response" in access) return access.response;

    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 100), 1), 200);
    const result = await getDb().query(
      `SELECT
        u.id,
        u.name,
        u.email,
        u."createdAt" AS "createdAt",
        COALESCE(au.role, 'user') AS role,
        COALESCE(au.is_active, true) AS "adminActive",
        COALESCE(s.status, 'none') AS "subscriptionStatus",
        COALESCE(p.name, 'No paid plan') AS "planName",
        (SELECT count(*)::int FROM conversations c WHERE c.user_id = u.id) AS "conversationCount"
      FROM "user" u
      LEFT JOIN admin_users au ON au.user_id = u.id
      LEFT JOIN user_subscriptions s ON s.user_id = u.id
      LEFT JOIN subscription_plans p ON p.id = s.plan_id
      ORDER BY u."createdAt" DESC
      LIMIT $1`,
      [limit],
    );

    return Response.json({ users: result.rows, limit });
  } catch (error) {
    console.error("Admin user directory failed:", error);
    return Response.json({ error: "Unable to load the user directory." }, { status: 500 });
  }
}
