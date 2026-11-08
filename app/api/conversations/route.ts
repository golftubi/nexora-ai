import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ensureFreeSubscription } from "@/lib/free-plan";

export const runtime = "nodejs";

const allowedAssistants = new Set(["general", "technology", "business", "research", "education", "security"]);

export async function GET(request: Request) {
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user) return Response.json({ error: "Sign in to view conversation history." }, { status: 401 });
    await ensureFreeSubscription(session.user.id);
    const result = await getDb().query(
      `SELECT c.id, c.assistant_id AS "assistantId", c.title, c.created_at AS "createdAt",
              c.updated_at AS "updatedAt", c.project_id AS "projectId",
              (SELECT count(*)::int FROM messages m WHERE m.conversation_id = c.id) AS "messageCount"
       FROM conversations c WHERE c.user_id = $1
       ORDER BY c.updated_at DESC LIMIT 100`,
      [session.user.id],
    );
    return Response.json({ conversations: result.rows });
  } catch (error) {
    console.error("Conversation history lookup failed:", error);
    return Response.json({ error: "Unable to load conversation history." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user) return Response.json({ error: "Sign in to create a conversation." }, { status: 401 });
    await ensureFreeSubscription(session.user.id);
    const body = await request.json() as { assistantId?: unknown; title?: unknown; projectId?: unknown };
    const assistantId = typeof body.assistantId === "string" ? body.assistantId : "general";
    if (!allowedAssistants.has(assistantId)) return Response.json({ error: "Unknown assistant." }, { status: 400 });
    const assistantStatus = await getDb().query("SELECT enabled FROM assistant_catalog WHERE id = $1", [assistantId]);
    if (!assistantStatus.rows[0]?.enabled) return Response.json({ error: "This assistant is currently unavailable." }, { status: 403 });
    if (assistantId === "security") {
      const allowlist = (process.env.NEXORA_SECURITY_ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
      if (!allowlist.includes(session.user.email.toLowerCase())) return Response.json({ error: "Security & Intelligence access is restricted." }, { status: 403 });
    }
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
    const projectId = typeof body.projectId === "string" ? body.projectId : null;
    if (projectId) {
      const project = await getDb().query("SELECT id FROM projects WHERE id = $1 AND user_id = $2", [projectId, session.user.id]);
      if (!project.rowCount) return Response.json({ error: "Project not found." }, { status: 404 });
    }
    const result = await getDb().query(
      `INSERT INTO conversations (user_id, assistant_id, title, project_id)
       VALUES ($1, $2, $3, $4) RETURNING id, assistant_id AS "assistantId", title, project_id AS "projectId",
       created_at AS "createdAt", updated_at AS "updatedAt"`,
      [session.user.id, assistantId, title || "New conversation", projectId],
    );
    return Response.json({ conversation: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Conversation creation failed:", error);
    return Response.json({ error: "Unable to create conversation." }, { status: 500 });
  }
}
