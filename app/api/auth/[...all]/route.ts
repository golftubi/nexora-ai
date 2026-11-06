import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    return await toNextJsHandler(getAuth()).GET(request);
  } catch (error) {
    console.error("Better Auth GET handler unavailable:", error);
    return Response.json({ error: "Authentication service is not configured." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    return await toNextJsHandler(getAuth()).POST(request);
  } catch (error) {
    console.error("Better Auth POST handler unavailable:", error);
    return Response.json({ error: "Authentication service is not configured." }, { status: 503 });
  }
}
