import { GoogleGenerativeAI } from "@google/generative-ai";

// Lazy initialization
let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (genAI) return genAI;

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

export interface ProcessedTranscript {
  diagnosis: string | null;
  notes: string | null;
  instructions: string | null;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    reason: string;
  }>;
  tasks: Array<{
    title: string;
    due: string; // ISO date string
  }>;
  followUp: {
    date: string | null; // ISO date string
    reason: string | null;
  } | null;
}

export async function processTranscript(transcript: string): Promise<ProcessedTranscript> {
  try {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Extract medical information from this doctor-patient conversation and return ONLY valid JSON.

Conversation:
"${transcript}"

Return this exact JSON structure (replace values as needed):
{
  "diagnosis": "string or null",
  "notes": "brief summary or null",
  "instructions": "patient instructions or null",
  "medications": [{"name": "string", "dosage": "string", "frequency": "string", "reason": "string"}],
  "tasks": [{"title": "string", "due": "YYYY-MM-DD or null"}],
  "followUp": {"date": "YYYY-MM-DD or null", "reason": "string or null"}
}

Today's date: ${new Date().toISOString().split('T')[0]}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean up the response
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    // If empty or invalid, return empty structure
    if (!text || text.length < 10) {
      console.log("Empty or invalid response from Gemini");
      return {
        diagnosis: null,
        notes: null,
        instructions: null,
        medications: [],
        tasks: [],
        followUp: null
      };
    }

    const parsed = JSON.parse(text) as ProcessedTranscript;
    return parsed;
  } catch (error) {
    console.error("Gemini Processing Error:", error);
    // Return empty structure on error to prevent crash
    return {
      diagnosis: null,
      notes: null,
      instructions: null,
      medications: [],
      tasks: [],
      followUp: null
    };
  }
}
