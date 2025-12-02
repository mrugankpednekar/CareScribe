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
    
    setMessages([...messages, { role: "user", content: input }]);
    setInput("");

    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I'm a demo. In the real app, I'd answer based on your medical records." 
      }]);
    }, 1000);
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
        <header className="mb-4 flex-shrink-0">
          <h1 className="text-2xl font-bold text-foreground">Ask Anything</h1>
          <p className="text-sm text-muted-foreground mt-1">About your health, medications, and appointments</p>
        </header>

        <div className="flex-1 overflow-y-auto bg-secondary border rounded-lg p-4 space-y-4 mb-4">
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
                  ? "bg-primary text-primary-foreground rounded-tr-none" 
                  : "bg-card border border-border rounded-tl-none"
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
          />
          <button 
            onClick={handleSend}
            className="bg-primary text-primary-foreground w-10 h-10 rounded-lg flex items-center justify-center hover:bg-primary/90"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Layout>
  );
}
