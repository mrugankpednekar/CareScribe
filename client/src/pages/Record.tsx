import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { VoiceVisualizer } from "@/components/record/VoiceVisualizer";
import { Mic, Square, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export default function Record() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "recording" | "processing" | "done">("idle");

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
      setTimeout(() => {
        setStatus("done");
      }, 3000);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        
        {status === "idle" && (
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <Mic className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">Ready to Record?</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Start recording when your appointment begins. We'll take care of the rest.
            </p>
            <button 
              onClick={handleToggleRecord}
              className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-bold shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95"
            >
              Start Recording
            </button>
          </div>
        )}

        {status === "recording" && (
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
              <div className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-6">
                ● Recording
              </div>
              <VoiceVisualizer isRecording={true} />
            </div>

            <div className="bg-card border rounded-lg p-6 h-64 overflow-y-auto space-y-3 mb-8">
              {transcript.length === 0 && (
                <p className="text-muted-foreground text-center text-sm mt-20">Listening...</p>
              )}
              {transcript.map((line, i) => (
                <p key={i} className="text-sm text-foreground">
                  <span className={cn("font-bold", line.startsWith("Doctor") ? "text-primary" : "text-muted-foreground")}>
                    {line.split(":")[0]}:
                  </span>
                  {line.split(":")[1]}
                </p>
              ))}
            </div>

            <div className="flex justify-center">
              <button 
                onClick={handleToggleRecord}
                className="bg-foreground text-background rounded-full p-4 shadow-sm hover:shadow-md transition-all"
              >
                <Square className="w-6 h-6 fill-current" />
              </button>
            </div>
          </div>
        )}

        {status === "processing" && (
          <div className="text-center">
             <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
             <h2 className="text-2xl font-bold text-foreground">Processing...</h2>
             <p className="text-muted-foreground mt-2">Organizing your appointment</p>
          </div>
        )}

        {status === "done" && (
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Done!</h2>
            <p className="text-muted-foreground mb-8">Your appointment is saved and organized.</p>
            
            <div className="flex flex-col gap-3">
              <Link href="/history">
                <button className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-bold shadow-sm hover:shadow-md">
                  View Summary
                </button>
              </Link>
              <button 
                onClick={() => { setStatus("idle"); setTranscript([]); }}
                className="w-full bg-secondary text-foreground py-2 rounded-lg font-medium hover:bg-secondary/80"
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
