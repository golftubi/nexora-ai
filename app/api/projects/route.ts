import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ensureFreeSubscription, FREE_LIMITS } from "@/lib/free-plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user) return Response.json({ error: "Sign in to view Projects." }, { status: 401 });
    const subscription = await ensureFreeSubscription(session.user.id);
    const result = await getDb().query(
      "SELECT p.id, p.name, p.description, p.instructions, p.created_at AS \"createdAt\", p.updated_at AS \"updatedAt\", (SELECT count(*)::int FROM conversations c WHERE c.project_id = p.id) AS \"conversationCount\" FROM projects p WHERE p.user_id = $1 ORDER BY p.updated_at DESC",
      [session.user.id],
    );
    return Response.json({ projects: result.rows, plan: { id: subscription.planId, name: subscription.planName, projectLimit: FREE_LIMITS.projects } });
  } catch (error) {
    console.error("Project list failed:", error);
    return Response.json({ error: "Unable to load Projects." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user) return Response.json({ error: "Sign in to create a Project." }, { status: 401 });
    await ensureFreeSubscription(session.user.id);
    const body = await request.json() as { name?: unknown; description?: unknown; instructions?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 500) : "";
    const instructions = typeof body.instructions === "string" ? body.instructions.trim().slice(0, 3000) : "";
    if (!name || name.length > 80) return Response.json({ error: "Project name must be between 1 and 80 characters." }, { status: 400 });

    const db = getDb();
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [session.user.id]);
      const count = await client.query("SELECT count(*)::int AS total FROM projects WHERE user_id = $1", [session.user.id]);
      if (Number(count.rows[0].total) >= FREE_LIMITS.projects) {
        await client.query("ROLLBACK");
        return Response.json({ error: "Nexora Free includes up to 3 active Projects.", limit: FREE_LIMITS.projects }, { status: 403 });
      }
      const created = await client.query(
        "INSERT INTO projects (user_id, name, description, instructions) VALUES ($1, $2, $3, $4) RETURNING id, name, description, instructions, created_at AS \"createdAt\", updated_at AS \"updatedAt\"",
        [session.user.id, name, description, instructions],
      );
      await client.query("COMMIT");
      return Response.json({ project: created.rows[0] }, { status: 201 });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Project creation failed:", error);
    return Response.json({ error: "Unable to create Project." }, { status: 500 });
  }
}
