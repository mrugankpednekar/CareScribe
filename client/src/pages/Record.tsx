import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { VoiceVisualizer } from "@/components/record/VoiceVisualizer";
import { Mic, Square, Loader2, CheckCircle2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export default function Record() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "recording" | "processing" | "done">("idle");

  // Simulation of live transcription
  useEffect(() => {
    if (!isRecording) return;

    const lines = [
      "Doctor: So, how have you been feeling since the last visit?",
      "Patient: The back pain is a bit better, but still hurts in the morning.",
      "Doctor: I see. Are you taking the ibuprofen?",
      "Patient: Yes, twice a day usually.",
      "Doctor: Okay, let's try adding some stretches. I'll show you a few.",
      "Doctor: Also, I want you to apply heat for 20 minutes before bed.",
      "Doctor: Let's schedule a follow-up in 4 weeks to see if the stretches help."
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < lines.length) {
        setTranscript(prev => [...prev, lines[currentIndex]]);
        currentIndex++;
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isRecording]);

  const handleToggleRecord = () => {
    if (status === "idle") {
      setStatus("recording");
      setIsRecording(true);
      setTranscript([]);
    } else if (status === "recording") {
      setIsRecording(false);
      setStatus("processing");
      // Simulate processing delay
      setTimeout(() => {
        setStatus("done");
      }, 3000);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[80vh] max-w-2xl mx-auto">
        
        {status === "idle" && (
          <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="bg-primary/20 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mic className="w-16 h-16 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Ready to Record?</h1>
              <p className="text-muted-foreground text-lg">
                Tap the button below when your appointment starts.<br/>
                We'll listen and organize everything for you.
              </p>
            </div>
            <button 
              onClick={handleToggleRecord}
              className="bg-primary hover:bg-primary/90 text-foreground text-lg font-bold py-4 px-12 rounded-full shadow-xl shadow-primary/30 transition-all hover:scale-105 active:scale-95"
            >
              Start Recording
            </button>
          </div>
        )}

        {status === "recording" && (
          <div className="w-full space-y-8 animate-in fade-in">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-red-100 text-red-600 text-sm font-medium mb-8">
                <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                Recording Live
              </div>
              <VoiceVisualizer isRecording={true} />
            </div>

            <div className="bg-card border rounded-2xl p-6 h-64 overflow-y-auto shadow-inner space-y-3">
              {transcript.length === 0 && (
                <p className="text-muted-foreground text-center italic mt-20">Listening...</p>
              )}
              {transcript.map((line, i) => (
                <p key={i} className="text-lg text-foreground animate-in slide-in-from-bottom-2">
                  <span className={cn("font-bold mr-2", line.startsWith("Doctor") ? "text-primary" : "text-muted-foreground")}>
                    {line.split(":")[0]}:
                  </span>
                  {line.split(":")[1]}
                </p>
              ))}
            </div>

            <div className="flex justify-center">
              <button 
                onClick={handleToggleRecord}
                className="bg-red-600 hover:bg-red-700 text-white rounded-full p-6 shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                <Square className="w-8 h-8 fill-current" />
              </button>
            </div>
          </div>
        )}

        {status === "processing" && (
          <div className="text-center space-y-6 animate-in fade-in">
             <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
             <h2 className="text-2xl font-bold">Processing Appointment...</h2>
             <p className="text-muted-foreground">
               Extracting diagnoses, medications, and instructions.
             </p>
          </div>
        )}

        {status === "done" && (
          <div className="text-center space-y-8 animate-in fade-in zoom-in">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">All Done!</h2>
              <p className="text-muted-foreground">
                We've organized your visit details.
              </p>
            </div>
            
            <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
              <Link href="/history">
                <button className="w-full bg-primary text-foreground py-3 rounded-xl font-bold shadow-lg hover:bg-primary/90 transition-colors">
                  View Summary
                </button>
              </Link>
              <button 
                onClick={() => { setStatus("idle"); setTranscript([]); setIsRecording(false); }}
                className="w-full bg-secondary text-foreground py-3 rounded-xl font-medium hover:bg-secondary/80 transition-colors"
              >
                Record Another
              </button>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
