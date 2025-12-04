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

    const prompt = `Extract medical information from this doctor-patient conversation and return ONLY valid JSON.

Conversation (may contain multiple segments):
"${transcript}"

INSTRUCTIONS:
1. Combine information from all segments into a single cohesive record.
2. **Medications**: Extract ANY prescribed drugs, supplements, or over-the-counter medicines.
   - **Dosage**: Optional. If not mentioned, omit it.
   - **Frequency**: Describe how often (e.g., "twice daily").
   - **Frequency Type**: Classify as "daily", "weekly", or "once".
   - **Reason**: Extract the reason for the medication from the context (e.g., "for pain", "for blood pressure").
   - Example: "Take Ibuprofen 200mg twice a day for pain" -> {"name": "Ibuprofen", "dosage": "200mg", "frequency": "twice daily", "frequencyType": "daily", "reason": "pain"}
3. **Appointments**: Extract future doctor visits.
   - Example: "See Dr. Smith next Tuesday" -> {"doctor": "Dr. Smith", "specialty": "General", "date": "2025-12-10", "reason": "Follow-up"}
4. **Labs**: Extract lab tests or imaging.
   - Example: "Get blood work done" -> {"labType": "Blood Work", "date": "2025-12-06", "reason": "Routine check"}
5. **Activities**: Extract physical activities or other tasks.
   - Example: "Walk for 10 mins daily" -> {"title": "Daily 10 min walk", "due": "2025-12-05", "type": "activity"}
6. **Duplicates**: If a task or medication is mentioned multiple times, merge them into one entry. Use the most specific description.
7. Return ONLY valid JSON.

Return this exact JSON structure (replace values as needed):
{
  "diagnosis": "string or null",
  "notes": "brief summary or null",
  "instructions": "patient instructions or null",
  "medications": [{"name": "string", "dosage": "string (optional)", "frequency": "string", "frequencyType": "daily|weekly|once", "reason": "string"}],
  "appointments": [{"doctor": "string", "specialty": "string", "date": "YYYY-MM-DD", "reason": "string"}],
  "labs": [{"labType": "string", "date": "YYYY-MM-DD", "reason": "string"}],
  "activities": [{"title": "string", "due": "YYYY-MM-DD or null", "type": "activity"}],
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
