import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, Sparkles, BookOpen } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && user) nav({ to: "/dashboard" });
  }, [user, loading, nav]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">Edgebook</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" asChild><Link to="/login">Sign in</Link></Button>
            <Button asChild><Link to="/login" search={{ mode: "signup" }}>Get started</Link></Button>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> AI-powered trade coaching
        </div>
        <h1 className="mt-6 text-5xl md:text-6xl font-semibold tracking-tight leading-tight">
          The trading journal that <span className="text-primary">finds your edge</span>.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Track every trade. Analyze patterns across symbols, setups, time of day, and emotion.
          Talk to an AI coach that knows your data.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Button size="lg" asChild>
            <Link to="/login" search={{ mode: "signup" }}>Start journaling free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-4">
        {[
          { icon: BookOpen, title: "Detailed journal", desc: "Log lot size, setup, mistake, emotion. Auto P&L." },
          { icon: BarChart3, title: "Pro analytics", desc: "Equity curve, drawdown, win rate by setup, time, asset." },
          { icon: Sparkles, title: "AI coach", desc: "Gemini-powered analysis of your real trade history." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-lg border border-border bg-card p-5">
            <Icon className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
