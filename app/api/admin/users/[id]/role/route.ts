import { requireAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const assignableRoles = new Set(["admin", "support", "analyst", "user"]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin(request, "roles:manage");
  if ("response" in access) return access.response;

  const { id: targetUserId } = await context.params;
  if (!targetUserId || targetUserId === access.session.user.id) {
    return Response.json({ error: "You cannot change your own administrator role." }, { status: 400 });
  }

  try {
    const body = await request.json() as { role?: unknown };
    if (typeof body.role !== "string" || !assignableRoles.has(body.role)) {
      return Response.json({ error: "Choose user, admin, support or analyst." }, { status: 400 });
    }

    const db = getDb();
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const target = await client.query(
        'SELECT id FROM "user" WHERE id = $1 FOR UPDATE',
        [targetUserId],
      );
      if (!target.rowCount) {
        await client.query("ROLLBACK");
        return Response.json({ error: "User account not found." }, { status: 404 });
      }

      const current = await client.query(
        "SELECT role FROM admin_users WHERE user_id = $1 FOR UPDATE",
        [targetUserId],
      );
      if (current.rows[0]?.role === "super_admin") {
        await client.query("ROLLBACK");
        return Response.json({ error: "The Super Admin account is protected and cannot be changed here." }, { status: 409 });
      }

      if (body.role === "user") {
        await client.query("DELETE FROM admin_users WHERE user_id = $1", [targetUserId]);
      } else {
        await client.query(
          `INSERT INTO admin_users (user_id, role, is_active)
           VALUES ($1, $2, true)
           ON CONFLICT (user_id) DO UPDATE
           SET role = EXCLUDED.role, is_active = true, updated_at = now()`,
          [targetUserId, body.role],
        );
      }

      await client.query(
        `INSERT INTO audit_logs (actor_user_id, action, resource_type, resource_id, metadata)
         VALUES ($1, 'admin.role_changed', 'user', $2, $3::jsonb)`,
        [access.session.user.id, targetUserId, JSON.stringify({
          previousRole: current.rows[0]?.role || "user",
          newRole: body.role,
        })],
      );
      await client.query("COMMIT");
      return Response.json({ success: true, userId: targetUserId, role: body.role });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Administrator role update failed:", error);
    return Response.json({ error: "Unable to update administrator role." }, { status: 500 });
  }
}
