import { ElevenLabsClient } from "elevenlabs";
import fs from "fs";

// Lazy initialization to prevent server crash on startup if key is missing
let client: ElevenLabsClient | null = null;

function getClient() {
    if (client) return client;

    if (!process.env.ELEVENLABS_API_KEY) {
        throw new Error("ELEVENLABS_API_KEY environment variable is not set");
    }

    client = new ElevenLabsClient({
        apiKey: process.env.ELEVENLABS_API_KEY,
    });

    return client;
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
        const elevenLabs = getClient();

        // ElevenLabs expects a file object or stream.
        // We can create a Blob-like object or write to a temp file.
        // Writing to a temp file is safer for node environments.
        const tempFilePath = `/tmp/upload-${Date.now()}.mp3`;
        fs.writeFileSync(tempFilePath, audioBuffer);

        const fileStream = fs.createReadStream(tempFilePath);

        const response = await elevenLabs.speechToText.convert({
            file: fileStream,
            model_id: "scribe_v1", // Using the Scribe model
        });

        // Clean up temp file
        fs.unlinkSync(tempFilePath);

        return response.text;
    } catch (error) {
        console.error("ElevenLabs Transcription Error:", error);
        throw error; // Re-throw to handle in route
    }
}
