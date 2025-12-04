import { ElevenLabsClient } from "elevenlabs";
import fs from "fs";
import os from "os";
import path from "path";

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
    const tempFilePath = path.join(os.tmpdir(), `upload-${Date.now()}.mp3`);

    try {
        const elevenLabs = getClient();
        fs.writeFileSync(tempFilePath, audioBuffer);

        const fileStream = fs.createReadStream(tempFilePath);

        const response = await elevenLabs.speechToText.convert({
            file: fileStream,
            model_id: "scribe_v1", // Using the Scribe model
        });

        return response.text;
    } catch (error) {
        console.error("ElevenLabs Transcription Error:", error);
        throw error; // Re-throw to handle in route
    } finally {
        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
}
