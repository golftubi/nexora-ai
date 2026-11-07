"use client";

import { useState, type ReactNode } from "react";
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

function renderInline(source: string): ReactNode[] {
  const tokenPattern = /(`[^`]+\`|\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
  const parts = source.split(tokenPattern).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) return <em key={index}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
    return part;
  });
}

function renderMarkdown(markdown: string): ReactNode[] {
  const normalized = markdown
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<\/?p>/gi, "");
  const lines = normalized.replace(/\r\n?/g, "\n").split("\n");
  const output: ReactNode[] = [];
  let paragraph: string[] = [];
  let code: string[] = [];
  let inCode = false;
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      output.push(<p key={`p-${output.length}`}>{paragraph.map((line, i) => <span key={i}>{i > 0 && <br />}{renderInline(line)}</span>)}</p>);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map((item, i) => <li key={i}>{renderInline(item)}</li>);
    output.push(list.ordered ? <ol key={`ol-${output.length}`}>{items}</ol> : <ul key={`ul-${output.length}`}>{items}</ul>);
    list = null;
  };

  lines.forEach((line) => {
    if (line.trim().startsWith("```")) {
      flushParagraph();
      flushList();
      if (inCode) {
        output.push(<pre key={`code-${output.length}`}><code>{code.join("\n")}</code></pre>);
        code = [];
        inCode = false;
      } else {
        inCode = true;
      }
      return;
    }
    if (inCode) {
      code.push(line);
      return;
    }
    const heading = line.match(/^\s{0,3}(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList();
      const content = renderInline(heading[2]);
      const key = `h-${output.length}`;
      if (heading[1].length === 1) output.push(<h2 key={key}>{content}</h2>);
      else if (heading[1].length === 2) output.push(<h3 key={key}>{content}</h3>);
      else output.push(<h4 key={key}>{content}</h4>);
    } else if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet || numbered)![1]);
    } else if (/^\s*>\s?/.test(line)) {
      flushParagraph(); flushList();
      output.push(<blockquote key={`q-${output.length}`}>{renderInline(line.replace(/^\s*>\s?/, ""))}</blockquote>);
    } else if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      flushParagraph(); flushList();
      output.push(<hr key={`hr-${output.length}`} />);
    } else if (!line.trim()) {
      flushParagraph(); flushList();
    } else {
      flushList();
      paragraph.push(line);
    }
  });
  if (inCode) output.push(<pre key={`code-${output.length}`}><code>{code.join("\n")}</code></pre>);
  flushParagraph();
  flushList();
  return output;
}

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
        const raw = await response.text();
        let detail = raw;
        try {
          const payload = JSON.parse(raw) as { error?: string };
          detail = payload.error || raw;
        } catch {
          // Keep the raw response when the server did not return JSON.
        }
        throw new Error(detail || `Nexora request failed (HTTP ${response.status}).`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Nexora returned an empty response stream. Please try again.");
      const decoder = new TextDecoder();
      let answer = "";
      setMessages([...next, { role: "assistant", content: "Nexora is thinking…" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: answer || "Nexora is thinking…" }]);
      }
      answer += decoder.decode();
      if (!answer.trim()) throw new Error("Nexora received no answer from the AI service. Please try again in a moment.");
      setMessages([...next, { role: "assistant", content: answer }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reach Nexora AI.";
      setMessages([...next, { role: "assistant", content: `Unable to complete this response: ${message}` }]);
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
          </div> : <div className="messages">{messages.map((message, index) => <article className={message.role === "user" ? "message user" : "message"} key={index}><b>{message.role === "user" ? "YOU" : "NEXORA"}</b><div className="markdown-body">{message.role === "user" ? <p>{message.content}</p> : renderMarkdown(message.content)}</div></article>)}</div>}
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
