import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Send, Bot, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";
import { useAppointments } from "@/context/AppointmentsContext";
import { useMedications } from "@/context/MedicationsContext";
import { useTranscripts } from "@/context/TranscriptsContext";
import { useCalendar } from "@/context/CalendarContext";

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! Ask me about your appointments, medications, or transcripts and I'll help summarize.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { appointments } = useAppointments();
  const { medications } = useMedications();
  const { transcripts } = useTranscripts();
  const { todayTasks } = useCalendar();

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    setError(null);

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");

    void sendToApi(nextMessages);
  };

  const sendToApi = async (history: ChatMessage[]) => {
    try {
      setIsSending(true);
      const context = {
        appointments,
        medications,
        tasks: todayTasks,
        transcripts,
      };
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          context,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed: ${res.status}`);
      }
      const data = await res.json();
      const replyText = data?.reply || "I couldn't generate a response.";
      const botMessage: ChatMessage = { id: `assistant-${Date.now()}`, role: "assistant", content: replyText };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Something went wrong.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
        <header className="mb-4 flex-shrink-0">
          <h1 className="text-2xl font-bold text-foreground">Ask Anything</h1>
          <p className="text-sm text-muted-foreground mt-1">About your health, medications, and appointments</p>
        </header>

        <div className="flex-1 overflow-y-auto bg-white border rounded-lg p-4 space-y-4 mb-4">
          {messages.map((msg, i) => (
            <div key={i} className={cn(
              "flex gap-3",
              msg.role === "user" ? "ml-auto flex-row-reverse max-w-xs" : "max-w-xs"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm",
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              )}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={cn(
                "p-3 rounded-lg text-sm",
                msg.role === "user" 
                  ? "bg-secondary text-white rounded-tr-none" 
                  : "bg-muted text-primary rounded-tl-none"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a question..." 
            className="flex-1 h-10"
            disabled={isSending}
          />
          <button 
            onClick={handleSend}
            className="bg-primary text-primary-foreground w-10 h-10 rounded-lg flex items-center justify-center hover:bg-primary/90 disabled:opacity-50"
            disabled={isSending}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-500 mt-2">{error}</p>
        )}

        {isSending && (
          <p className="text-xs text-muted-foreground mt-1">Thinking...</p>
        )}
      </div>
    </Layout>
  );
}
