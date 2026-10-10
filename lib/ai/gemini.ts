import { GoogleGenAI } from "@google/genai";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function generateCallSummary(transcript: string, callerName: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) return "";

  const prompt = `You are an AI assistant for Aangan Studio, an interior design firm in Pune, India.

Analyze this call transcript between an AI receptionist and a potential client, then write a concise 2-3 sentence summary for the designer who will handle the follow-up.

Focus on: project type, location, scope, timeline, and any special notes.
Do NOT mention pricing (it is never discussed).

Caller name: ${callerName || "Unknown"}

Transcript:
${transcript}

Write the summary in plain text, professional tone, 2-3 sentences max.`;

  try {
    const response = await genai.models.generateContent({
      model: "gemini-3.6",
      contents: prompt,
    });
    return response.text ?? "";
  } catch {
    return "";
  }
}

export async function generateHandoffNoteAI(params: {
  callerName: string;
  projectLocation: string;
  projectType: string;
  propertyType: string;
  squareFeet: number | null;
  timeline: string;
  projectScope: string;
  qualificationNotes: string;
  transcript: string;
}): Promise<string> {
  if (!process.env.GEMINI_API_KEY) return "";

  const prompt = `You are writing a designer briefing note for Aangan Studio, Pune interior design firm.

Write a concise handoff note for the designer based on the following call details:
- Caller: ${params.callerName}
- Location: ${params.projectLocation}
- Project: ${params.propertyType} ${params.projectType}
- Size: ${params.squareFeet ? `${params.squareFeet} sq ft` : "not mentioned"}
- Timeline: ${params.timeline}
- Scope: ${params.projectScope}
- Notes: ${params.qualificationNotes}

Transcript excerpt:
${params.transcript.slice(0, 1500)}

Write a 3-4 sentence designer briefing note. Be specific and actionable. Never mention prices.`;

  try {
    const response = await genai.models.generateContent({
      model: "gemini-3.6",
      contents: prompt,
    });
    return response.text ?? "";
  } catch {
    return "";
  }
}
