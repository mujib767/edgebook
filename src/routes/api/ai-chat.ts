import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/ai-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization");
          const token = auth?.replace("Bearer ", "");
          if (!token) return new Response("Unauthorized", { status: 401 });

          const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
          const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
          const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
          if (!GEMINI_API_KEY) return new Response("AI not configured", { status: 500 });

          const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false },
          });

          const { data: userData, error: userErr } = await supabase.auth.getUser(token);
          if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
          const userId = userData.user.id;

          const body = (await request.json()) as { messages: { role: string; content: string }[] };
          const userMessages = body.messages || [];

          // Fetch trades
          const { data: trades } = await supabase
            .from("trades")
            .select("*")
            .eq("user_id", userId)
            .order("entry_time", { ascending: false })
            .limit(500);

          // Fetch journal entries
          const { data: journals } = await supabase
            .from("journal_entries")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(10);

          const tradesArr = trades || [];
          const journalArr = journals || [];

          const wins = tradesArr.filter((t: any) => Number(t.pnl) > 0);
          const losses = tradesArr.filter((t: any) => Number(t.pnl) < 0);
          const totalPnl = tradesArr.reduce((s: number, t: any) => s + Number(t.pnl), 0);
          const grossWin = wins.reduce((s: number, t: any) => s + Number(t.pnl), 0);
          const grossLoss = Math.abs(losses.reduce((s: number, t: any) => s + Number(t.pnl), 0));
          const winRate = tradesArr.length ? (wins.length / tradesArr.length) * 100 : 0;
          const avgWin = wins.length ? grossWin / wins.length : 0;
          const avgLoss = losses.length ? grossLoss / losses.length : 0;
          const pf = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;

          const mistakeCount: Record<string, number> = {};
          tradesArr.forEach((t: any) => {
            if (t.mistake) mistakeCount[t.mistake] = (mistakeCount[t.mistake] || 0) + 1;
          });

          const symbolPnl: Record<string, number> = {};
          tradesArr.forEach((t: any) => {
            symbolPnl[t.symbol] = (symbolPnl[t.symbol] || 0) + Number(t.pnl);
          });

          const emotionCount: Record<string, number> = {};
          tradesArr.forEach((t: any) => {
            if (t.emotional_state) emotionCount[t.emotional_state] = (emotionCount[t.emotional_state] || 0) + 1;
          });

          const setupPnl: Record<string, { pnl: number; count: number }> = {};
          tradesArr.forEach((t: any) => {
            if (t.setup) {
              if (!setupPnl[t.setup]) setupPnl[t.setup] = { pnl: 0, count: 0 };
              setupPnl[t.setup].pnl += Number(t.pnl);
              setupPnl[t.setup].count += 1;
            }
          });

          const recent = tradesArr.slice(0, 30).map((t: any) => ({
            sym: t.symbol,
            type: t.trade_type,
            lot: t.lot_size,
            pnl: Number(t.pnl).toFixed(2),
            pnlpct: Number(t.pnl_percent).toFixed(2),
            setup: t.setup,
            mistake: t.mistake,
            emotion: t.emotional_state,
            date: t.entry_time?.slice(0, 10),
          }));

          // Data status for context
          const dataStatus =
            tradesArr.length === 0
              ? "This trader has NO trades logged yet. Warmly welcome them and strongly encourage them to start logging trades — that's the foundation of everything."
              : tradesArr.length < 5
              ? "This trader only has a few trades logged. Encourage more consistent journaling while working with what's available."
              : tradesArr.length < 20
              ? "This trader is building their journal. Good start, but needs more data for deeper patterns."
              : "This trader has solid trade history to analyze deeply.";

          // Mistakes summary
          const mistakeSummary =
            Object.keys(mistakeCount).length > 0
              ? Object.entries(mistakeCount)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => `${k} (${v}x)`)
                  .join(", ")
              : "No mistakes logged yet — remind them to log mistakes after every trade for better self-awareness";

          // Symbol summary
          const symbolSummary =
            Object.keys(symbolPnl).length > 0
              ? Object.entries(symbolPnl)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => `${k}: $${Number(v).toFixed(2)}`)
                  .join(", ")
              : "No symbol data yet";

          // Setup summary
          const setupSummary =
            Object.keys(setupPnl).length > 0
              ? Object.entries(setupPnl)
                  .map(([k, v]) => `${k}: $${v.pnl.toFixed(2)} over ${v.count} trades`)
                  .join(", ")
              : "No setup data logged yet";

          // Emotion summary
          const emotionSummary =
            Object.keys(emotionCount).length > 0
              ? Object.entries(emotionCount)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => `${k} (${v}x)`)
                  .join(", ")
              : "No emotional state data logged yet";

          // Recent journal entries
          const journalSummary =
            journalArr.length > 0
              ? journalArr
                  .slice(0, 5)
                  .map((j: any) => `[${j.created_at?.slice(0, 10)}] ${j.content || j.notes || j.entry || ""}`)
                  .join("\n")
              : "No journal entries yet";

          const systemPrompt = `You are "EdgeCoach" — a brutally honest, deeply experienced trading mentor and performance coach. You have been coaching traders for 20 years. You know this trader personally and care deeply about their success.

IMPORTANT RULES — NEVER BREAK THESE:
1. NEVER output raw JSON, null values, curly braces, or code-like text in your response
2. ALWAYS speak in natural, warm but direct human language — like a real mentor talking face to face
3. Reference their ACTUAL numbers when giving advice — be specific
4. If data is missing, say it naturally: "I don't see any mistake logs yet — start doing that after every trade"
5. End EVERY response with one clear, specific action they can take TODAY
6. If they seem frustrated or discouraged, acknowledge it and push them forward
7. Be like a mix of a strict coach and a supportive mentor — tough love

DATA STATUS: ${dataStatus}

TRADER PERFORMANCE SNAPSHOT:
- Total trades logged: ${tradesArr.length}
- Net P&L: $${totalPnl.toFixed(2)}
- Win rate: ${winRate.toFixed(1)}%
- Profit factor: ${pf.toFixed(2)} ${pf >= 1.5 ? "(healthy)" : pf >= 1 ? "(breakeven territory)" : "(losing — needs urgent attention)"}
- Average winning trade: $${avgWin.toFixed(2)}
- Average losing trade: -$${avgLoss.toFixed(2)}
- Win/Loss ratio: ${avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : "N/A"}

TRADING PATTERNS:
- Most common mistakes: ${mistakeSummary}
- Emotional states while trading: ${emotionSummary}
- Performance by symbol: ${symbolSummary}
- Performance by setup: ${setupSummary}

RECENT TRADES (last 30) — use this to spot patterns, streaks, emotional trading:
${recent.map(t => `${t.date} | ${t.sym} | ${t.type} | PnL: $${t.pnl} (${t.pnlpct}%) | Setup: ${t.setup || "none"} | Mistake: ${t.mistake || "none"} | Emotion: ${t.emotion || "none"}`).join("\n")}

RECENT JOURNAL ENTRIES — use this to understand their mindset:
${journalSummary}

YOUR COACHING STYLE:
- Direct, specific, data-driven but human
- Challenge them when they need it
- Celebrate wins but never let them get complacent
- Always push toward consistency and discipline
- Remind them: trading is a marathon, not a sprint`;

          // Build Gemini messages with memory
          const geminiMessages = [
            { role: "user", parts: [{ text: systemPrompt }] },
            {
              role: "model",
              parts: [{ text: "Got it. I know this trader's data and I'm ready to coach them with full context." }],
            },
            ...userMessages.map((m: any) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
          ];

          const aiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: geminiMessages }),
            }
          );

          if (!aiRes.ok) {
            const txt = await aiRes.text();
            console.error("Gemini error", aiRes.status, txt);
            if (aiRes.status === 429) return new Response("Rate limit — please wait a moment and try again", { status: 429 });
            if (aiRes.status === 503) return new Response("AI is busy right now, please try again in a few seconds", { status: 503 });
            return new Response("AI request failed", { status: 500 });
          }

          const json = await aiRes.json();
          const content = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
          return Response.json({ content });
        } catch (e) {
          console.error(e);
          return new Response("Server error", { status: 500 });
        }
      },
    },
  },
});