import { getDb } from "@/lib/db";

export const FREE_LIMITS = { messagesPerDay: 20, projects: 3 } as const;

export async function ensureFreeSubscription(userId: string) {
  const db = getDb();
  await db.query("INSERT INTO user_subscriptions (user_id, plan_id, status, billing_cycle) VALUES ($1, 'free', 'active', 'free') ON CONFLICT (user_id) DO NOTHING", [userId]);
  const result = await db.query("SELECT s.plan_id AS \"planId\", s.status, s.billing_cycle AS \"billingCycle\", p.name AS \"planName\", p.limits FROM user_subscriptions s JOIN subscription_plans p ON p.id = s.plan_id WHERE s.user_id = $1", [userId]);
  if (!result.rowCount || result.rows[0].status !== "active") throw new Error("Your Nexora subscription is not active. Please contact support.");
  return result.rows[0] as { planId: string; status: string; billingCycle: string; planName: string; limits: Record<string, number> };
}

export async function reserveFreeMessage(userId: string) {
  const subscription = await ensureFreeSubscription(userId);
  const messageLimit = Number(subscription.limits.messages_per_day ?? FREE_LIMITS.messagesPerDay);
  const db = getDb();
  const result = await db.query("INSERT INTO user_daily_usage (user_id, usage_date, messages_used) VALUES ($1, (now() AT TIME ZONE 'UTC')::date, 1) ON CONFLICT (user_id, usage_date) DO UPDATE SET messages_used = user_daily_usage.messages_used + 1, updated_at = now() WHERE user_daily_usage.messages_used < $2 RETURNING messages_used AS \"messagesUsed\"", [userId, messageLimit]);
  if (!result.rowCount) {
    const current = await db.query("SELECT messages_used AS \"messagesUsed\" FROM user_daily_usage WHERE user_id = $1 AND usage_date = (now() AT TIME ZONE 'UTC')::date", [userId]);
    return { allowed: false, used: Number(current.rows[0]?.messagesUsed ?? messageLimit), limit: messageLimit };
  }
  return { allowed: true, used: Number(result.rows[0].messagesUsed), limit: messageLimit };
}
