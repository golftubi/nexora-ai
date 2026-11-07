import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function requireAdmin(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) {
    return { response: Response.json({ error: "Sign in to access the admin dashboard." }, { status: 401 }) } as const;
  }

  const configuredEmails = (process.env.NEXORA_ADMIN_EMAILS || "")
    .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  const email = session.user.email.toLowerCase();

  if (!configuredEmails.includes(email)) {
    return { response: Response.json({ error: "Administrator access is restricted." }, { status: 403 }) } as const;
  }

  const result = await getDb().query(
    `INSERT INTO admin_users (user_id, role, is_active)
     VALUES ($1, 'super_admin', true)
     ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
     RETURNING role, is_active AS "isActive"`,
    [session.user.id],
  );

  if (!result.rows[0]?.isActive) {
    return { response: Response.json({ error: "This administrator account is disabled." }, { status: 403 }) } as const;
  }

  return { session, role: result.rows[0].role } as const;
}
