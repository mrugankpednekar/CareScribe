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
  tasks: {
    title: string;
    due: string | null; // ISO date string
    type?: string;
  }[];
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

Conversation (may contain multiple segments):
"${transcript}"

INSTRUCTIONS:
1. Combine information from all segments into a single cohesive record.
2. **Medications**: Extract ANY prescribed drugs, supplements, or over-the-counter medicines. Include dosage and frequency if mentioned.
   - Example: "Take Ibuprofen 200mg twice a day" -> {"name": "Ibuprofen", "dosage": "200mg", "frequency": "twice daily", "reason": "pain"}
3. **Tasks**: Extract actionable items for the patient. **YOU MUST CLASSIFY THE TYPE**:
   - "activity": Physical activities like walking, exercises, yoga.
   - "lab": Blood tests, X-rays, scans.
   - "appointment": Doctor visits, follow-ups.
   - "other": Anything else.
   - Example: "Walk for 10 mins daily" -> {"title": "Daily 10 min walk", "due": "2025-12-05", "type": "activity"}
   - Example: "Get blood work done" -> {"title": "Blood work", "due": "2025-12-06", "type": "lab"}
4. **Duplicates**: If a task or medication is mentioned multiple times, merge them into one entry. Use the most specific description.
5. Return ONLY valid JSON.

Return this exact JSON structure (replace values as needed):
{
  "diagnosis": "string or null",
  "notes": "brief summary or null",
  "instructions": "patient instructions or null",
  "medications": [{"name": "string", "dosage": "string", "frequency": "string", "reason": "string"}],
  "tasks": [{"title": "string", "due": "YYYY-MM-DD or null", "type": "activity | lab | appointment | other"}],
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
