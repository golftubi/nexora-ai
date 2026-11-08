import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user) return Response.json({ error: "Sign in to view this conversation." }, { status: 401 });
    const { id } = await context.params;
    const conversation = await getDb().query(
      `SELECT id, assistant_id AS "assistantId", title, created_at AS "createdAt", updated_at AS "updatedAt", project_id AS "projectId"
       FROM conversations WHERE id = $1 AND user_id = $2`,
      [id, session.user.id],
    );
    if (!conversation.rowCount) return Response.json({ error: "Conversation not found." }, { status: 404 });
    if (conversation.rows[0].assistantId === "security") {
      const allowlist = (process.env.NEXORA_SECURITY_ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
      if (!allowlist.includes(session.user.email.toLowerCase())) return Response.json({ error: "Security & Intelligence access is restricted." }, { status: 403 });
    }
    const messages = await getDb().query(
      `SELECT id, role, content, created_at AS "createdAt"
       FROM messages WHERE conversation_id = $1 AND user_id = $2 AND role IN ('user','assistant')
       ORDER BY created_at ASC, id ASC`,
      [id, session.user.id],
    );
    return Response.json({ conversation: conversation.rows[0], messages: messages.rows });
  } catch (error) {
    console.error("Conversation retrieval failed:", error);
    return Response.json({ error: "Unable to load this conversation." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user) return Response.json({ error: "Sign in to delete this conversation." }, { status: 401 });
    const { id } = await context.params;
    const result = await getDb().query(
      "DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, session.user.id],
    );
    if (!result.rowCount) return Response.json({ error: "Conversation not found." }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Conversation deletion failed:", error);
    return Response.json({ error: "Unable to delete this conversation." }, { status: 500 });
  }
}
