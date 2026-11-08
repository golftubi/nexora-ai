import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user) return Response.json({ error: "Sign in to update this Project." }, { status: 401 });
    const { id } = await context.params;
    const body = await request.json() as { name?: unknown; description?: unknown; instructions?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 500) : "";
    const instructions = typeof body.instructions === "string" ? body.instructions.trim().slice(0, 3000) : "";
    if (!name || name.length > 80) return Response.json({ error: "Project name must be between 1 and 80 characters." }, { status: 400 });
    const result = await getDb().query(
      "UPDATE projects SET name=$3, description=$4, instructions=$5, updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING id, name, description, instructions, updated_at AS \"updatedAt\"",
      [id, session.user.id, name, description, instructions],
    );
    if (!result.rowCount) return Response.json({ error: "Project not found." }, { status: 404 });
    return Response.json({ project: result.rows[0] });
  } catch (error) {
    console.error("Project update failed:", error);
    return Response.json({ error: "Unable to update Project." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user) return Response.json({ error: "Sign in to delete this Project." }, { status: 401 });
    const { id } = await context.params;
    const result = await getDb().query("DELETE FROM projects WHERE id=$1 AND user_id=$2 RETURNING id", [id, session.user.id]);
    if (!result.rowCount) return Response.json({ error: "Project not found." }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Project deletion failed:", error);
    return Response.json({ error: "Unable to delete Project." }, { status: 500 });
  }
}
