import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Trash2, TrendingUp, Brain, BarChart2, Target } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/ai-coach")({ component: AICoach });

interface Msg {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  { icon: "📊", text: "Analyze my recent trades" },
  { icon: "❌", text: "What are my most common mistakes?" },
  { icon: "🧠", text: "How is my trading psychology?" },
  { icon: "📈", text: "Which setup performs best for me?" },
  { icon: "🎯", text: "Give me a weekly performance review" },
  { icon: "💡", text: "What should I focus on improving?" },
];

function AICoach() {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("ai_chat_messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at")
      .then(({ data }) => setMessages((data as Msg[]) || []));
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending || !user || !session) return;
    setInput("");
    setSending(true);

    const userMsg: Msg = { role: "user", content };
    const optimistic = [...messages, userMsg];
    setMessages(optimistic);
    await supabase.from("ai_chat_messages").insert({ user_id: user.id, role: "user", content });

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: optimistic.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "AI failed");
      }

      const json = await res.json();
      const assistantMsg: Msg = { role: "assistant", content: json.content };
      setMessages([...optimistic, assistantMsg]);
      await supabase
        .from("ai_chat_messages")
        .insert({ user_id: user.id, role: "assistant", content: json.content });
    } catch (e: any) {
      toast.error(e.message || "AI request failed. Please try again.");
      setMessages(optimistic);
    } finally {
      setSending(false);
    }
  };

  const clearChat = async () => {
    if (!user) return;
    if (!confirm("Clear the entire conversation? This cannot be undone.")) return;
    await supabase.from("ai_chat_messages").delete().eq("user_id", user.id);
    setMessages([]);
    toast.success("Conversation cleared");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-none">EdgeCoach</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Your personal AI trading mentor</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Chat area */}
      <Card className="flex-1 overflow-hidden border-border/50">
        <CardContent className="p-0 h-full flex flex-col">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Hey, I'm EdgeCoach</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  I have full access to your trading data, journal entries, and performance analytics. Ask me anything.
                </p>

                {/* Stats pills */}
                <div className="flex gap-2 mt-4 flex-wrap justify-center">
                  <span className="flex items-center gap-1 text-xs bg-muted px-3 py-1.5 rounded-full">
                    <TrendingUp className="h-3 w-3 text-primary" /> Trades analyzed
                  </span>
                  <span className="flex items-center gap-1 text-xs bg-muted px-3 py-1.5 rounded-full">
                    <BarChart2 className="h-3 w-3 text-primary" /> Analytics access
                  </span>
                  <span className="flex items-center gap-1 text-xs bg-muted px-3 py-1.5 rounded-full">
                    <Target className="h-3 w-3 text-primary" /> Journal insights
                  </span>
                </div>

                {/* Suggestion buttons */}
                <div className="grid grid-cols-2 gap-2 mt-6 w-full max-w-md">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.text}
                      onClick={() => send(s.text)}
                      className="text-xs px-3 py-2.5 rounded-lg border border-border hover:bg-accent hover:border-primary/30 transition-all text-left flex items-center gap-2"
                    >
                      <span>{s.icon}</span>
                      <span>{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  )}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1.5 [&>ul]:my-1.5 [&>ol]:my-1.5 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {sending && (
              <div className="flex gap-2 justify-start">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                  <span className="inline-flex gap-1 items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-border/50 p-3 flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask EdgeCoach anything about your trading…"
              rows={1}
              className="resize-none min-h-[40px] max-h-32 text-sm"
            />
            <Button
              onClick={() => send()}
              disabled={sending || !input.trim()}
              size="icon"
              className="h-10 w-10 flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}