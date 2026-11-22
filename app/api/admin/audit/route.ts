import { requireAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await requireAdmin(request, "audit:read");
    if ("response" in access) return access.response;

    const result = await getDb().query(
      `SELECT a.id, a.action, a.resource_type AS "resourceType",
        a.resource_id AS "resourceId", a.metadata,
        a.created_at AS "createdAt", u.email AS "actorEmail"
       FROM audit_logs a
       LEFT JOIN "user" u ON u.id = a.actor_user_id
       ORDER BY a.created_at DESC
       LIMIT 100`,
    );

    return Response.json({
      administrator: { email: access.session.user.email, role: access.role },
      events: result.rows,
      limit: 100,
    });
  } catch (error) {
    console.error("Admin audit log lookup failed:", error);
    return Response.json({ error: "Unable to load audit activity." }, { status: 500 });
  }
}
