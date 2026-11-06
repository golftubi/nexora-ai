"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

const assistants = [
  { id: "general", name: "General Intelligence", desc: "Everyday reasoning, planning and problem-solving", icon: "✦" },
  { id: "technology", name: "Technology & Developer", desc: "Software engineering, code and technical systems", icon: "⌘" },
  { id: "business", name: "Business & Entrepreneurship", desc: "Strategy, operations and commercial decisions", icon: "◈" },
  { id: "research", name: "Research & Documents", desc: "Research, analysis and structured documents", icon: "⌕" },
  { id: "education", name: "Education & Learning", desc: "Explanations, tutoring and skill development", icon: "⌂" },
  { id: "security", name: "Security & Intelligence", desc: "Restricted operational analysis workspace", icon: "⬡" },
];

export default function Home() {
  const [assistant, setAssistant] = useState("general");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  async function send() {
    if (!input.trim() || busy) return;
    if (!session?.user) {
      window.location.assign("/sign-in");
      return;
    }
    const text = input;
    setInput("");
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistant, messages: next }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Request failed");
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      setMessages([...next, { role: "assistant", content: "" }]);
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          answer += decoder.decode(value, { stream: true });
          setMessages([...next, { role: "assistant", content: answer }]);
        }
      }
    } catch (error) {
      setMessages([...next, { role: "assistant", content: error instanceof Error ? error.message : "Unable to reach Nexora AI." }]);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await authClient.signOut();
    setMessages([]);
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brandmark">N</span><div><b>NEXORA</b><small>ARTIFICIAL INTELLIGENCE</small></div></div>
        <button className="new" onClick={() => setMessages([])}>＋ New conversation</button>
        <p className="eyebrow">YOUR WORKSPACE</p>
        <p className="navactive">◉　AI Workspace</p>
        <p className="eyebrow">SPECIALIST ASSISTANTS</p>
        {assistants.map((item) => <button key={item.id} className={assistant === item.id ? "assistant selected" : "assistant"} onClick={() => setAssistant(item.id)}><span>{item.icon}</span><span>{item.name}</span></button>)}
        <div className="sidebarfoot">One Platform.<br />Multiple Intelligences.</div>
      </aside>
      <section className="main">
        <header>
          <div><span className="eyebrow">NEXORA AI WORKSPACE</span><h1>{assistants.find((item) => item.id === assistant)?.name}</h1></div>
          <div className="account-actions">
            {isPending ? <span className="status">CHECKING SESSION</span> : session?.user ? <><span className="account-email">{session.user.email}</span><button className="account-button" onClick={signOut}>Sign out</button></> : <><Link className="account-button" href="/sign-in">Sign in</Link><Link className="account-button primary" href="/sign-up">Create account</Link></>}
          </div>
        </header>
        <div className="chat">
          {messages.length === 0 ? <div className="welcome">
            <div className="orb">✦</div><span className="eyebrow">INTELLIGENCE, CONNECTED</span>
            <h2>What would you like<br />to work on today?</h2>
            <p>Choose a specialist assistant and start a conversation.</p>
            {!session?.user && !isPending && <p className="signin-note">Create a free account or sign in to start chatting.</p>}
            <div className="suggestions">{["Help me plan a project", "Explain a complex topic", "Review a business idea"].map((item) => <button key={item} onClick={() => setInput(item)}>{item}　↗</button>)}</div>
          </div> : <div className="messages">{messages.map((message, index) => <article className={message.role === "user" ? "message user" : "message"} key={index}><b>{message.role === "user" ? "YOU" : "NEXORA"}</b><p>{message.content}</p></article>)}</div>}
        </div>
        <div className="composer">
          <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder={session?.user ? "Message Nexora AI..." : "Sign in to start a conversation..."} rows={2} />
          <button onClick={() => void send()} disabled={busy || !input.trim()}>{busy ? "…" : "↑"}</button>
          <small>AI can make mistakes. Verify important information.</small>
        </div>
      </section>
    </main>
  );
}
