import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { mockMessages } from "@/lib/mockData";
import { Send, Bot, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function Chat() {
  const [messages, setMessages] = useState(mockMessages.filter(m => m.role !== "system"));
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    
    const newMsg = { role: "user", content: input };
    setMessages([...messages, newMsg]);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I'm a demo AI, but in the real app I would answer based on your medical records!" 
      }]);
    }, 1000);
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
        <header className="mb-4 flex-shrink-0">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bot className="text-primary w-8 h-8" />
            Health Assistant
          </h1>
          <p className="text-muted-foreground text-sm">Ask about your medications, appointments, or doctor's instructions.</p>
        </header>

        <div className="flex-1 overflow-y-auto bg-card/50 border border-border/50 rounded-2xl p-4 space-y-4 mb-4">
          {messages.map((msg, i) => (
            <div key={i} className={cn(
              "flex gap-3 max-w-[85%]",
              msg.role === "user" ? "ml-auto flex-row-reverse" : ""
            )}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                msg.role === "user" ? "bg-secondary text-foreground" : "bg-primary text-foreground"
              )}>
                {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={cn(
                "p-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                msg.role === "user" 
                  ? "bg-primary text-foreground rounded-tr-none" 
                  : "bg-white border border-border/50 text-foreground rounded-tl-none"
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
            placeholder="Type your question..." 
            className="flex-1 h-12 bg-card border-border/50 rounded-xl"
          />
          <button 
            onClick={handleSend}
            className="bg-primary text-foreground w-12 h-12 rounded-xl flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </Layout>
  );
}
