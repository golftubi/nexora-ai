import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ensureFreeSubscription, FREE_LIMITS } from "@/lib/free-plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user) return Response.json({ error: "Sign in to view your plan." }, { status: 401 });
    const subscription = await ensureFreeSubscription(session.user.id);
    const db = getDb();
    const [usage, projects] = await Promise.all([
      db.query("SELECT messages_used AS \"messagesUsed\" FROM user_daily_usage WHERE user_id=$1 AND usage_date=(now() AT TIME ZONE 'UTC')::date", [session.user.id]),
      db.query("SELECT count(*)::int AS total FROM projects WHERE user_id=$1", [session.user.id]),
    ]);
    return Response.json({
      plan: { id: subscription.planId, name: subscription.planName, status: subscription.status },
      usage: {
        messages: { used: Number(usage.rows[0]?.messagesUsed ?? 0), limit: Number(subscription.limits.messages_per_day ?? FREE_LIMITS.messagesPerDay) },
        projects: { used: Number(projects.rows[0].total), limit: Number(subscription.limits.projects ?? FREE_LIMITS.projects) },
      },
    });
  } catch (error) {
    console.error("Entitlement lookup failed:", error);
    return Response.json({ error: "Unable to load your Nexora plan." }, { status: 500 });
  }
}
