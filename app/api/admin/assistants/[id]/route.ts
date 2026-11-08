import { requireAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedIds = new Set(["general", "technology", "business", "research", "education", "security"]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireAdmin(request);
    if ("response" in access) return access.response;

    const { id } = await context.params;
    if (!allowedIds.has(id)) return Response.json({ error: "Unknown assistant." }, { status: 404 });

    const body = await request.json() as { enabled?: unknown };
    if (typeof body.enabled !== "boolean") {
      return Response.json({ error: "The enabled field must be true or false." }, { status: 400 });
    }

    const db = getDb();
    const result = await db.query(
      "UPDATE assistant_catalog SET enabled = $2 WHERE id = $1 RETURNING id, name, enabled",
      [id, body.enabled],
    );
    if (!result.rowCount) return Response.json({ error: "Assistant not found." }, { status: 404 });

    await db.query(
      `INSERT INTO audit_logs (actor_user_id, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, 'assistant', $3, $4::jsonb)`,
      [access.session.user.id, body.enabled ? "assistant.enabled" : "assistant.disabled", id, JSON.stringify({ enabled: body.enabled })],
    );

    return Response.json({ assistant: result.rows[0] });
  } catch (error) {
    console.error("Admin assistant update failed:", error);
    return Response.json({ error: "Unable to update assistant settings." }, { status: 500 });
  }
}
