export const runtime = "nodejs";

type GeminiMessage = {
  role: "user" | "model";
  parts: Array<{ text: string }>;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "No messages provided." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "AI Chat is unavailable. Gemini API key is missing in server environment." },
        { status: 503 },
      );
    }

    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

    // Map input messages to Gemini structure
    const contents: GeminiMessage[] = messages
      .filter((m: any) => m && typeof m === "object" && (m.role === "user" || m.role === "assistant"))
      .map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content || "" }],
      }));

    const systemInstruction = `You are the "ClearPath Guide", a friendly, empathetic, and knowledgeable AI assistant built into ClearPath (a medical report simplifier). 
Your goal is to help users understand how ClearPath works, answer questions about how to use the app, and provide general, clear explanations of common medical terminology (like WBC, hemoglobin, reference ranges, lipids, glucose, etc.) in a simple, supportive way at a 6th-grade reading level.

CRITICAL RULES:
1. You are NOT a doctor or clinician.
2. DO NOT diagnose any condition or recommend any treatment.
3. If the user asks for personal medical advice or a diagnosis based on specific numbers, politely explain what the terms mean generally, decline to diagnose, and remind them that they should consult their doctor/healthcare provider.
4. Keep your answers concise, reassuring, and structured with clean formatting (bullet points, bold text).
5. Always advise the user to discuss their actual report findings with their physician.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API Chat Error:", errorText);
        return Response.json(
          { error: "The AI agent is resting. Please try again in a moment." },
          { status: 500 },
        );
      }

      const payload = (await response.json()) as GeminiResponse;
      const responseText = payload.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) {
        return Response.json(
          { error: "Could not generate response." },
          { status: 500 },
        );
      }

      return Response.json({ role: "assistant", content: responseText.trim() });
    } catch (fetchError) {
      console.error("Fetch error during chat", fetchError);
      return Response.json(
        { error: "Connecting to AI server timed out. Please try again." },
        { status: 500 },
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("API Chat route error", error);
    return Response.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
