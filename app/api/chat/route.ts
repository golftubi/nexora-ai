import { streamText } from "ai";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

const modules: Record<string, string> = {
  general: "You are Nexora General Intelligence. Be accurate, clear and useful.",
  technology: "You are Nexora Technology & Developer, an expert software engineering assistant. Explain tradeoffs and provide secure code.",
  business: "You are Nexora Business & Entrepreneurship. Focus on practical strategy, operations, finance fundamentals and execution.",
  research: "You are Nexora Research & Documents. Distinguish verified facts from assumptions and structure outputs clearly.",
  education: "You are Nexora Education & Learning. Teach progressively, check understanding and adapt explanations. For broad learning plans, prioritize concise, complete sections and avoid unnecessary elaboration.",
  security: "You are Nexora Security & Intelligence. Provide lawful, defensive, safety-oriented analysis. Do not facilitate wrongdoing.",
};

type ChatMessage = { role: "user" | "assistant"; content: string };
type ChatBody = { messages?: unknown; assistant?: string; conversationId?: string };

export async function POST(req: Request) {
  try {
    const session = await getAuth().api.getSession({ headers: req.headers });
    if (!session?.user) return Response.json({ error: "Sign in to use Nexora AI." }, { status: 401 });

    const body = (await req.json()) as ChatBody;
    const assistant = body.assistant || "general";
    if (!Object.hasOwn(modules, assistant)) return Response.json({ error: "Unknown assistant." }, { status: 400 });
    const assistantStatus = await getDb().query("SELECT enabled FROM assistant_catalog WHERE id = $1", [assistant]);
    if (!assistantStatus.rows[0]?.enabled) return Response.json({ error: "This assistant is currently unavailable." }, { status: 403 });

    if (assistant === "security") {
      const allowedEmails = (process.env.NEXORA_SECURITY_ADMIN_EMAILS || "")
        .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
      if (!allowedEmails.includes(session.user.email.toLowerCase())) {
        return Response.json({ error: "Security & Intelligence access is restricted. Contact the Nexora administrator." }, { status: 403 });
      }
    }

    if (typeof body.conversationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.conversationId)) {
      return Response.json({ error: "A valid conversation ID is required. Start a new conversation and try again." }, { status: 400 });
    }
    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 30) {
      return Response.json({ error: "A conversation must contain between 1 and 30 messages." }, { status: 400 });
    }

    const messages: ChatMessage[] = [];
    for (const item of body.messages) {
      if (!item || typeof item !== "object" || !("role" in item) || !("content" in item)) {
        return Response.json({ error: "Each message must include a role and text content." }, { status: 400 });
      }
      const message = item as { role: unknown; content: unknown };
      if ((message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string" || !message.content.trim() || message.content.length > 20000) {
        return Response.json({ error: "Messages must contain valid user or assistant text of at most 20,000 characters." }, { status: 400 });
      }
      messages.push({ role: message.role, content: message.content });
    }
    if (messages[messages.length - 1].role !== "user") {
      return Response.json({ error: "The latest message must be from the user." }, { status: 400 });
    }

    const db = getDb();
    const owned = await db.query(
      "SELECT id, assistant_id FROM conversations WHERE id = $1 AND user_id = $2",
      [body.conversationId, session.user.id],
    );
    if (!owned.rowCount) return Response.json({ error: "Conversation not found." }, { status: 404 });
    if (owned.rows[0].assistant_id !== assistant) return Response.json({ error: "This conversation belongs to a different assistant." }, { status: 409 });

    const latestUserMessage = messages[messages.length - 1].content;
    await db.query(
      "INSERT INTO messages (conversation_id, user_id, role, content) VALUES ($1, $2, 'user', $3)",
      [body.conversationId, session.user.id, latestUserMessage],
    );
    const title = latestUserMessage.replace(/\s+/g, " ").trim().slice(0, 80);
    await db.query(
      `UPDATE conversations SET updated_at = now(),
       title = CASE WHEN title = 'New conversation' THEN $2 ELSE title END
       WHERE id = $1 AND user_id = $3`,
      [body.conversationId, title || "New conversation", session.user.id],
    );

    const model = process.env.AI_GATEWAY_MODEL;
    if (!model) return Response.json({ error: "AI model is not configured. Set AI_GATEWAY_MODEL in Vercel." }, { status: 503 });

    const result = streamText({
      model,
      system: modules[assistant],
      messages,
      maxOutputTokens: 8192,
      onFinish: async ({ text, finishReason, totalUsage }) => {
        try {
          if (text.trim()) {
            await db.query(
              "INSERT INTO messages (conversation_id, user_id, role, content) VALUES ($1, $2, 'assistant', $3)",
              [body.conversationId, session.user.id, text],
            );
          }
          try {
            await db.query(
              `INSERT INTO usage_records
                (user_id, conversation_id, assistant_id, provider, model, input_tokens, output_tokens)
               VALUES ($1, $2, $3, 'vercel-ai-gateway', $4, $5, $6)`,
              [
                session.user.id,
                body.conversationId,
                assistant,
                model,
                totalUsage.inputTokens ?? 0,
                totalUsage.outputTokens ?? 0,
              ],
            );
          } catch (usageError) {
            console.error("Nexora usage metering failed:", usageError);
          }
          console.log("Nexora stream finished:", JSON.stringify({ assistant, conversationId: body.conversationId, finishReason, totalUsage }));
        } catch (error) {
          console.error("Nexora assistant message persistence failed:", error);
        }
      },
      onError: ({ error }) => console.error("Nexora stream error:", error),
    });
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Nexora chat request failed:", error);
    return Response.json(
      { error: error instanceof Error && error.message.includes("DATABASE_URL")
          ? "Nexora authentication database is not configured yet."
          : "Chat request failed. Please try again." },
      { status: 500 },
    );
  }
}
