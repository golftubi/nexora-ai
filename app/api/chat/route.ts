import { streamText } from "ai";
import { getAuth } from "@/lib/auth";

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
type ChatBody = { messages?: unknown; assistant?: string };

export async function POST(req: Request) {
  try {
    const session = await getAuth().api.getSession({ headers: req.headers });
    if (!session?.user) return Response.json({ error: "Sign in to use Nexora AI." }, { status: 401 });

    const body = (await req.json()) as ChatBody;
    const assistant = body.assistant || "general";
    if (!Object.hasOwn(modules, assistant)) return Response.json({ error: "Unknown assistant." }, { status: 400 });

    if (assistant === "security") {
      const allowedEmails = (process.env.NEXORA_SECURITY_ADMIN_EMAILS || "")
        .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
      if (!allowedEmails.includes(session.user.email.toLowerCase())) {
        return Response.json({ error: "Security & Intelligence access is restricted. Contact the Nexora administrator." }, { status: 403 });
      }
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

    const model = process.env.AI_GATEWAY_MODEL;
    if (!model) return Response.json({ error: "AI model is not configured. Set AI_GATEWAY_MODEL in Vercel." }, { status: 503 });

    const result = streamText({
      model,
      system: modules[assistant],
      messages,
      maxOutputTokens: 8192,
      onFinish: ({ finishReason, totalUsage }) => {
        console.log("Nexora stream finished:", JSON.stringify({
          assistant,
          finishReason,
          totalUsage,
        }));
      },
      onError: ({ error }) => {
        console.error("Nexora stream error:", error);
      },
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
