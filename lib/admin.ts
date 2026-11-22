import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export type AdminPermission =
  | "admin:read"
  | "users:read"
  | "roles:manage"
  | "assistants:manage"
  | "analytics:read"
  | "audit:read";

const rolePermissions: Record<string, AdminPermission[]> = {
  super_admin: ["admin:read", "users:read", "roles:manage", "assistants:manage", "analytics:read", "audit:read"],
  admin: ["admin:read", "users:read", "assistants:manage", "analytics:read", "audit:read"],
  support: ["users:read"],
  analyst: ["analytics:read", "audit:read"],
};

export async function requireAdmin(request: Request, permission: AdminPermission = "admin:read") {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) {
    return { response: Response.json({ error: "Sign in to access the admin dashboard." }, { status: 401 }) } as const;
  }

  const configuredEmails = (process.env.NEXORA_ADMIN_EMAILS || "")
    .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  const email = session.user.email.toLowerCase();

  // Configured bootstrap administrators receive the initial super-admin record.
  // ON CONFLICT deliberately does not reactivate a disabled administrator.
  if (configuredEmails.includes(email)) {
    await getDb().query(
      `INSERT INTO admin_users (user_id, role, is_active)
       VALUES ($1, 'super_admin', true)
       ON CONFLICT (user_id) DO NOTHING`,
      [session.user.id],
    );
  }

  const result = await getDb().query(
    "SELECT role, is_active AS \"isActive\" FROM admin_users WHERE user_id = $1",
    [session.user.id],
  );
  const administrator = result.rows[0];
  if (!administrator || !administrator.isActive) {
    return { response: Response.json({ error: "Administrator access is restricted or disabled." }, { status: 403 }) } as const;
  }

  const permissions = rolePermissions[administrator.role] || [];
  if (!permissions.includes(permission)) {
    return { response: Response.json({ error: "Your administrator role does not permit this action." }, { status: 403 }) } as const;
  }

  return { session, role: administrator.role } as const;
}
