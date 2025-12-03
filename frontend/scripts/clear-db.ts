import "dotenv/config";
import { db } from "../server/db";
import { appointments, medications, tasks, messages, transcriptions } from "../shared/schema";
import { sql } from "drizzle-orm";

async function clearDb() {
    console.log("Clearing database...");
    if (!db) {
        console.error("Database not initialized. Check DATABASE_URL.");
        process.exit(1);
    }
    try {
        await db.delete(tasks);
        await db.delete(medications);
        await db.delete(transcriptions);
        await db.delete(messages);
        await db.delete(appointments);

        console.log("Database cleared successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error clearing database:", error);
        process.exit(1);
    }
}

clearDb();
