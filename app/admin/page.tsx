"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

type DashboardData = {
  administrator: { email: string; role: string };
  metrics: {
    users: { total: number; newThisMonth: number };
    conversations: { total: number; last30Days: number };
    messages: { total: number };
    usage: { inputTokens: number; outputTokens: number; estimatedCost: string; requests: number };
  };
  assistants: { id: string; name: string; description: string; enabled: boolean; accessLevel: string }[];
  recentUsers: { id: string; name: string | null; email: string; createdAt: string }[];
  recentAudit: { id: string; action: string; resourceType: string | null; createdAt: string }[];
};

const number = (value: string | number | undefined) => Number(value || 0).toLocaleString();

export default function AdminDashboard() {
  const { data: session, isPending } = authClient.useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      setError("Sign in with an authorized administrator account to continue.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch("/api/admin/overview", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to verify administrator access.");
        return payload as DashboardData;
      })
      .then((payload) => { if (!cancelled) setData(payload); })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Dashboard request failed."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isPending, session?.user?.id]);

  if (loading) return <main className="admin-shell"><div className="admin-loading">Loading Nexora administration…</div></main>;

  if (error || !data) return (
    <main className="admin-shell">
      <section className="admin-denied">
        <div className="admin-mark">N</div>
        <span className="admin-kicker">NEXORA AI · ADMINISTRATION</span>
        <h1>Administrator access required</h1>
        <p>{error || "The dashboard could not be loaded."}</p>
        <Link href="/" className="admin-link">Return to Nexora workspace</Link>
      </section>
    </main>
  );

  const cards = [
    { label: "Registered users", value: number(data.metrics.users.total), note: `+${number(data.metrics.users.newThisMonth)} in the last 30 days` },
    { label: "Conversations", value: number(data.metrics.conversations.total), note: `${number(data.metrics.conversations.last30Days)} in the last 30 days` },
    { label: "Messages", value: number(data.metrics.messages.total), note: "Persisted chat messages" },
    { label: "AI requests · 30 days", value: number(data.metrics.usage.requests), note: `${number(data.metrics.usage.inputTokens)} input / ${number(data.metrics.usage.outputTokens)} output tokens` },
  ];

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-brand"><span className="admin-mark">N</span><span><b>NEXORA</b><small>ADMIN CONSOLE</small></span></Link>
        <div className="admin-nav-label">MANAGEMENT</div>
        <a className="admin-nav active" href="#overview">▦　Overview</a>
        <a className="admin-nav" href="#assistants">✦　Assistants</a>
        <a className="admin-nav" href="#users">♙　Users</a>
        <a className="admin-nav" href="#usage">◷　Usage & costs</a>
        <a className="admin-nav" href="#activity">≡　Audit activity</a>
        <div className="admin-sidebar-bottom"><span>Signed in as</span><b>{data.administrator.email}</b><small>{data.administrator.role.replace("_", " ").toUpperCase()}</small></div>
      </aside>

      <section className="admin-content" id="overview">
        <header className="admin-header">
          <div><span className="admin-kicker">CONTROL CENTER</span><h1>Administration overview</h1><p>Monitor Nexora AI accounts, assistants and platform activity.</p></div>
          <div className="admin-header-actions"><span className="admin-live"><i /> ADMIN SESSION VERIFIED</span><Link href="/" className="admin-workspace-link">Open workspace ↗</Link></div>
        </header>

        <section className="admin-metrics">
          {cards.map((card) => <article className="admin-metric" key={card.label}><span>{card.label}</span><strong>{card.value}</strong><small>{card.note}</small></article>)}
        </section>

        <section className="admin-grid">
          <article className="admin-panel" id="assistants">
            <div className="admin-panel-heading"><div><span className="admin-kicker">AI WORKSPACE</span><h2>Assistant directory</h2></div><span className="admin-count">{data.assistants.length} assistants</span></div>
            <div className="admin-table-wrap"><table><thead><tr><th>Assistant</th><th>Access</th><th>Status</th></tr></thead><tbody>
              {data.assistants.map((assistant) => <tr key={assistant.id}><td><b>{assistant.name}</b><small>{assistant.description}</small></td><td><span className={assistant.accessLevel === "restricted" ? "admin-tag restricted" : "admin-tag"}>{assistant.accessLevel}</span></td><td><span className={assistant.enabled ? "admin-status enabled" : "admin-status disabled"}>{assistant.enabled ? "Enabled" : "Disabled"}</span></td></tr>)}
            </tbody></table></div>
            <p className="admin-footnote">Assistant configuration is currently read-only in this first dashboard release.</p>
          </article>

          <article className="admin-panel" id="users">
            <div className="admin-panel-heading"><div><span className="admin-kicker">ACCOUNTS</span><h2>Recently registered users</h2></div></div>
            <div className="admin-table-wrap"><table><thead><tr><th>User</th><th>Joined</th></tr></thead><tbody>
              {data.recentUsers.map((user) => <tr key={user.id}><td><b>{user.name || "Nexora user"}</b><small>{user.email}</small></td><td>{new Date(user.createdAt).toLocaleDateString()}</td></tr>)}
              {!data.recentUsers.length && <tr><td colSpan={2}>No registered users found.</td></tr>}
            </tbody></table></div>
            <p className="admin-footnote">User records are read-only. Account suspension and role editing are not enabled yet.</p>
          </article>
        </section>

        <section className="admin-grid" id="usage">
          <article className="admin-panel">
            <div className="admin-panel-heading"><div><span className="admin-kicker">MODEL METERING</span><h2>Usage & estimated cost</h2></div><span className="admin-count">Last 30 days</span></div>
            <div className="admin-usage">
              <div><span>Input tokens</span><b>{number(data.metrics.usage.inputTokens)}</b></div>
              <div><span>Output tokens</span><b>{number(data.metrics.usage.outputTokens)}</b></div>
              <div><span>Estimated cost (USD)</span><b>${number(data.metrics.usage.estimatedCost)}</b></div>
            </div>
            <p className="admin-footnote">Usage values will populate after token metering is connected to completed AI responses. Estimated cost is not an invoice.</p>
          </article>
          <article className="admin-panel" id="activity">
            <div className="admin-panel-heading"><div><span className="admin-kicker">SECURITY & GOVERNANCE</span><h2>Recent audit activity</h2></div></div>
            {data.recentAudit.length ? <div className="admin-audit-list">{data.recentAudit.map((item) => <div key={item.id}><b>{item.action}</b><span>{item.resourceType || "Platform"} · {new Date(item.createdAt).toLocaleString()}</span></div>)}</div> : <p className="admin-empty">No audit events recorded yet. Administrative actions will appear here as audit logging is enabled.</p>}
          </article>
        </section>
        <footer className="admin-footer">NEXORA AI · ONE PLATFORM. MULTIPLE INTELLIGENCES. <span>Administrative access is monitored.</span></footer>
      </section>
    </main>
  );
}
