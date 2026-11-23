"use client";

import { useState } from "react";

type TestResult = {
  name: string;
  status: number | string;
  response: string;
};

export default function SecurityCheckPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  async function runChecks() {
    setRunning(true);
    setResults([]);
    const tests = [
      {
        name: "Role-management PATCH",
        url: "/api/admin/users/wgv6BnQhenxtRHvez5tydWe9mkmlngru/role",
      },
      {
        name: "Specialist-management PATCH",
        url: "/api/admin/assistants/general",
      },
    ];

    const completed: TestResult[] = [];
    for (const test of tests) {
      try {
        const response = await fetch(test.url, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          cache: "no-store",
        });
        const responseText = await response.text();
        completed.push({
          name: test.name,
          status: response.status,
          response: responseText,
        });
      } catch (error) {
        completed.push({
          name: test.name,
          status: "Network error",
          response: error instanceof Error ? error.message : "Request failed",
        });
      }
      setResults([...completed]);
    }
    setRunning(false);
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 24, fontFamily: "Arial, sans-serif", color: "inherit" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700 }}>Nexora AI — Security Permission Check</h1>
      <p style={{ lineHeight: 1.6 }}>
        This temporary QA screen sends two same-origin PATCH requests using empty JSON objects.
        The requests are designed to test server-side permission checks without changing account
        roles or specialist settings.
      </p>
      <p style={{ lineHeight: 1.6, fontWeight: 600 }}>
        Run this only while signed in as the Support or Analyst test account, never as Super Admin.
      </p>
      <button
        type="button"
        onClick={runChecks}
        disabled={running}
        style={{ padding: "12px 18px", borderRadius: 8, border: 0, background: "#2457d6", color: "white", fontWeight: 700, opacity: running ? 0.6 : 1 }}
      >
        {running ? "Running checks…" : "Run both PATCH checks"}
      </button>
      <section aria-live="polite" style={{ marginTop: 24 }}>
        {results.map((result) => (
          <article key={result.name} style={{ border: "1px solid #8886", borderRadius: 10, padding: 16, marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{result.name}</h2>
            <p><strong>HTTP status:</strong> {result.status}</p>
            <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 13 }}>{result.response}</pre>
            <p style={{ fontWeight: 700 }}>
              {result.status === 403 ? "PASS — permission denied" : result.status === 401 ? "UNAUTHENTICATED — sign-in/session issue" : "REVIEW — expected HTTP 403"}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
