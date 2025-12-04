import { GoogleGenerativeAI } from "@google/generative-ai";

// Lazy initialization
let genAI: GoogleGenerativeAI | null = null;

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

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
    dosage?: string;
    frequency: string;
    frequencyType?: "daily" | "weekly" | "once";
    reason: string;
    times?: string[];
    startDate?: string;
    endDate?: string;
    prescribedBy?: string;
    prescribedDate?: string;
    appointmentId?: string;
  }>;
  appointments: {
    doctor: string;
    specialty: string;
    date: string; // ISO date string
    reason: string;
  }[];
  labs: {
    labType: string;
    date: string; // ISO date string
    reason: string;
  }[];
  activities: {
    title: string;
    due: string | null; // ISO date string
    type: "activity";
  }[];
  followUp: {
    date: string | null; // ISO date string
    reason: string | null;
  } | null;
}

export async function processTranscript(
  transcript: string,
  appointmentDetails?: {
    doctor?: string;
    date?: string;
    appointmentId?: string;
  }
): Promise<ProcessedTranscript> {
  try {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

    const contextBlock = appointmentDetails
      ? `Context (current visit): doctor="${appointmentDetails.doctor ?? "Unknown"}", date="${appointmentDetails.date ?? "Unknown"}", appointmentId="${appointmentDetails.appointmentId ?? "Unknown"}". Use this to tie medications/follow-ups to this visit when appropriate.`
      : "Context: no specific appointment details provided.";

    const prompt = `Extract medical information from this doctor-patient conversation and return ONLY valid JSON.

${contextBlock}

Conversation (may contain multiple segments):
"${transcript}"

INSTRUCTIONS:
1. Combine all conversation segments into one cohesive record.
2. Return ONLY these item categories and only the fields listed. If a field is not explicitly given, set it to null or an empty array (do NOT invent values).

   **Medications**
   - name (required)
   - dosage (optional)
   - frequency (string, human text)
   - frequencyType: "daily" | "weekly" | "once"
   - times: array of "HH:MM" in 24h, ONLY if stated; otherwise []
   - startDate: "YYYY-MM-DD" or null
   - endDate: "YYYY-MM-DD" or null (compute if duration like "for 2 weeks" is given; otherwise null)
   - selectedDays: array of numbers 0-6 (Sun-Sat) ONLY if days are explicitly listed; otherwise []
   - reason (optional string)

   **Appointments**
   - doctor (required)
   - specialty (optional)
   - date: "YYYY-MM-DD"
   - reason (string)

   **Labs**
   - labType (required)
   - date: "YYYY-MM-DD"
   - reason (string)

   **Activities**
   - title (required)
   - due: "YYYY-MM-DD" or null (start date if provided)
   - type: always "activity"
   - frequencyType: "daily" | "weekly" | "once"
   - selectedDays: array of numbers 0-6 for weekly schedules ONLY if days are explicitly listed; otherwise []
   - startDate: "YYYY-MM-DD" or null
   - endDate: "YYYY-MM-DD" or null (compute if duration given; else null)

3. Appointments: include follow-ups explicitly mentioned (e.g., "come back in 2 weeks") using computed dates when no absolute date is given.
4. Labs: same structure as above; leave optional fields null/empty if absent.
5. Activities: honor frequency/duration if stated; otherwise leave fields empty/null.
6. Duplicates: merge repeated mentions into a single entry using the most specific details.
7. Output ONLY valid JSON that matches the schema below. Do not include any extra text.

Return this exact JSON structure (replace values as needed):
{
  "diagnosis": "string or null",
  "notes": "brief summary or null",
  "instructions": "patient instructions or null",
  "medications": [{
    "name": "string",
    "dosage": "string (optional)",
    "frequency": "string",
    "frequencyType": "daily|weekly|once",
    "times": ["HH:MM", ...],            // empty array if no explicit times
    "startDate": "YYYY-MM-DD or null",  // use today's date if duration given without start
    "endDate": "YYYY-MM-DD or null",    // compute if duration given; otherwise null
    "selectedDays": [0-6],              // only when explicitly weekly days provided; else empty array
    "reason": "string"
  }],
  "appointments": [{"doctor": "string", "specialty": "string", "date": "YYYY-MM-DD", "reason": "string"}],
  "labs": [{"labType": "string", "date": "YYYY-MM-DD", "reason": "string"}],
  "activities": [{
    "title": "string",
    "due": "YYYY-MM-DD or null",
    "type": "activity",
    "frequencyType": "daily|weekly|once",
    "selectedDays": [0-6],
    "startDate": "YYYY-MM-DD or null",
    "endDate": "YYYY-MM-DD or null"
  }],
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
        appointments: [],
        labs: [],
        activities: [],
        followUp: null
      };
    }

    const parsed = JSON.parse(text) as ProcessedTranscript;

    // Post-process to inject appointment details if available
    if (appointmentDetails) {
      parsed.medications = parsed.medications.map(med => ({
        ...med,
        prescribedBy: appointmentDetails.doctor,
        prescribedDate: appointmentDetails.date,
        appointmentId: appointmentDetails.appointmentId
      }));
    }

    return parsed;
  } catch (error) {
    console.error("Gemini Processing Error:", error);
    // Return empty structure on error to prevent crash
    return {
      diagnosis: null,
      notes: null,
      instructions: null,
      medications: [],
      appointments: [],
      labs: [],
      activities: [],
      followUp: null
    };
  }
}

/**
 * Generate a chat response using the user's medical context and prior messages.
 * If the model lacks enough detail, it should say so instead of inventing facts.
 */
export async function generateChatReply(
  messages: ChatMessage[],
  context: Record<string, unknown>,
): Promise<string> {
  try {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `You are CareScribe, a concise medical scribe/assistant for the patient.
You have structured context about the user's data (appointments, medications, tasks, transcripts, activities).
Use ONLY what is in the provided JSON context or chat history. If unsure or data is missing, say so and suggest what you need.
Be brief (<=150 words), avoid PHI leakage beyond what's already provided, and never fabricate dates, times, or medications.`;

    const history = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const prompt = `${systemPrompt}

CONTEXT (JSON):
${JSON.stringify(context, null, 2)}

CHAT HISTORY:
${history}

Answer the user's latest question based only on the context/history. If you cannot answer from the context, state that you don't have enough information.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
}
