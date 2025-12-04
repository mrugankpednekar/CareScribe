import "dotenv/config";
import { db } from "../server/db";
import { appointments, medications, tasks, messages, transcriptions } from "../shared/schema";

async function clearDb() {
    if (!db) {
        console.error("Database connection not available");
        process.exit(1);
    }

    console.log("Clearing database...");

    try {
        // Delete in order to respect potential foreign key constraints (though schema doesn't strictly enforce them in Drizzle definition, DB might)
        // Transcriptions might link to appointments, but usually it's loose.
        // Appointments link to users.
        // Medications link to appointments.

        console.log("Deleting transcriptions...");
        await db.delete(transcriptions);

        console.log("Deleting messages...");
        await db.delete(messages);

        console.log("Deleting tasks...");
        await db.delete(tasks);

        console.log("Deleting medications...");
        await db.delete(medications);

        console.log("Deleting appointments...");
        await db.delete(appointments);

        console.log("Database cleared successfully.");
    } catch (error) {
        console.error("Error clearing database:", error);
    } finally {
        process.exit(0);
    }
}

clearDb();
