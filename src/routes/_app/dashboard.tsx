import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { fmtMoney, fmtPct, pnlClass } from "@/lib/trade-utils";
import { TrendingUp, TrendingDown, Activity, Target, Trophy, AlertTriangle, Flame } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

interface Trade {
  id: string; pnl: number; pnl_percent: number; status: string;
  trade_type: string; entry_time: string; symbol: string; lot_size: number;
}

function Dashboard() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("trades").select("*").eq("user_id", user.id).order("entry_time", { ascending: true })
      .then(({ data }) => { setTrades((data as Trade[]) || []); setLoading(false); });
  }, [user]);

  const stats = useMemo(() => {
    const wins = trades.filter((t) => Number(t.pnl) > 0);
    const losses = trades.filter((t) => Number(t.pnl) < 0);
    const totalPnl = trades.reduce((s, t) => s + Number(t.pnl), 0);
    const grossWin = wins.reduce((s, t) => s + Number(t.pnl), 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + Number(t.pnl), 0));
    const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
    const avgWin = wins.length ? grossWin / wins.length : 0;
    const avgLoss = losses.length ? grossLoss / losses.length : 0;
    const pf = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
    const best = trades.reduce((m, t) => (Number(t.pnl) > Number(m?.pnl ?? -Infinity) ? t : m), null as Trade | null);
    const worst = trades.reduce((m, t) => (Number(t.pnl) < Number(m?.pnl ?? Infinity) ? t : m), null as Trade | null);

    // streaks (chronological)
    let curWin = 0, curLoss = 0, maxWin = 0, maxLoss = 0;
    trades.forEach((t) => {
      const pnl = Number(t.pnl);
      if (pnl > 0) { curWin++; curLoss = 0; if (curWin > maxWin) maxWin = curWin; }
      else if (pnl < 0) { curLoss++; curWin = 0; if (curLoss > maxLoss) maxLoss = curLoss; }
      else { curWin = 0; curLoss = 0; }
    });

    // equity curve + drawdown
    let equity = 0, peak = 0, maxDD = 0;
    const curve = trades.map((t) => {
      equity += Number(t.pnl);
      if (equity > peak) peak = equity;
      const dd = peak - equity;
      if (dd > maxDD) maxDD = dd;
      return { date: t.entry_time?.slice(0, 10), equity };
    });

    // long vs short win rate
    const longs = trades.filter((t) => t.trade_type === "Long");
    const shorts = trades.filter((t) => t.trade_type === "Short");
    const longWR = longs.length ? (longs.filter((t) => Number(t.pnl) > 0).length / longs.length) * 100 : 0;
    const shortWR = shorts.length ? (shorts.filter((t) => Number(t.pnl) > 0).length / shorts.length) * 100 : 0;

    // periods
    const now = new Date();
    const isToday = (d: string) => new Date(d).toDateString() === now.toDateString();
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayPnl = trades.filter((t) => isToday(t.entry_time)).reduce((s, t) => s + Number(t.pnl), 0);
    const weekPnl = trades.filter((t) => new Date(t.entry_time) >= weekAgo).reduce((s, t) => s + Number(t.pnl), 0);
    const monthPnl = trades.filter((t) => new Date(t.entry_time) >= monthStart).reduce((s, t) => s + Number(t.pnl), 0);

    // weekly bars
    const weekly: Record<string, number> = {};
    trades.forEach((t) => {
      const d = new Date(t.entry_time);
      const onejan = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
      const key = `${d.getFullYear()}-W${week}`;
      weekly[key] = (weekly[key] || 0) + Number(t.pnl);
    });
    const weeklyArr = Object.entries(weekly).slice(-12).map(([k, v]) => ({ week: k, pnl: v }));

    // monthly heatmap
    const monthly: Record<string, number> = {};
    trades.forEach((t) => {
      const k = t.entry_time?.slice(0, 7);
      monthly[k] = (monthly[k] || 0) + Number(t.pnl);
    });

    return { totalPnl, winRate, avgWin, avgLoss, pf, best, worst, maxWin, maxLoss, maxDD, curve, longWR, shortWR, todayPnl, weekPnl, monthPnl, weeklyArr, monthly };
  }, [trades]);

  if (loading) {
    return <div className="text-muted-foreground">Loading dashboard…</div>;
  }

  if (trades.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">No trades yet. Add your first trade in the Journal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overall performance across {trades.length} trades</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Net P&L" value={fmtMoney(stats.totalPnl)} tone={stats.totalPnl >= 0 ? "profit" : "loss"} icon={<Activity className="h-4 w-4" />} />
        <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} icon={<Target className="h-4 w-4" />} />
        <StatCard label="Profit Factor" value={isFinite(stats.pf) ? stats.pf.toFixed(2) : "∞"} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Total Trades" value={trades.length} icon={<Activity className="h-4 w-4" />} />
        <StatCard label="Avg Win" value={fmtMoney(stats.avgWin)} tone="profit" />
        <StatCard label="Avg Loss" value={fmtMoney(-stats.avgLoss)} tone="loss" />
        <StatCard label="Max Drawdown" value={fmtMoney(-stats.maxDD)} tone="loss" icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label="Best Trade" value={fmtMoney(Number(stats.best?.pnl || 0))} sub={stats.best?.symbol} tone="profit" icon={<Trophy className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Worst Trade" value={fmtMoney(Number(stats.worst?.pnl || 0))} sub={stats.worst?.symbol} tone="loss" icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Win Streak" value={stats.maxWin} icon={<Flame className="h-4 w-4" />} />
        <StatCard label="Loss Streak" value={stats.maxLoss} icon={<Flame className="h-4 w-4" />} />
        <StatCard label="Long / Short WR" value={`${stats.longWR.toFixed(0)}% / ${stats.shortWR.toFixed(0)}%`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Today P&L" value={fmtMoney(stats.todayPnl)} tone={stats.todayPnl >= 0 ? "profit" : "loss"} />
        <StatCard label="This Week P&L" value={fmtMoney(stats.weekPnl)} tone={stats.weekPnl >= 0 ? "profit" : "loss"} />
        <StatCard label="This Month P&L" value={fmtMoney(stats.monthPnl)} tone={stats.monthPnl >= 0 ? "profit" : "loss"} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Equity Curve</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.curve}>
              <defs>
                <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--profit)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--profit)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6 }} />
              <Area type="monotone" dataKey="equity" stroke="var(--profit)" fill="url(#eq)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Weekly P&L</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.weeklyArr}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6 }} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {stats.weeklyArr.map((d, i) => (
                    <Bar key={i} dataKey="pnl" fill={d.pnl >= 0 ? "var(--profit)" : "var(--loss)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Monthly Heatmap</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-1.5">
              {Object.entries(stats.monthly).slice(-24).map(([m, v]) => {
                const intensity = Math.min(1, Math.abs(v) / 1000);
                const bg = v >= 0
                  ? `oklch(0.78 ${0.16 * intensity} 155 / ${0.3 + intensity * 0.7})`
                  : `oklch(0.65 ${0.22 * intensity} 25 / ${0.3 + intensity * 0.7})`;
                return (
                  <div key={m} className="rounded-md p-2 text-center" style={{ background: bg }}>
                    <div className="text-[10px] opacity-80">{m.slice(2)}</div>
                    <div className="text-xs font-mono-tabular font-semibold">{fmtMoney(v)}</div>
                  </div>
                );
              })}
            </div>
            {Object.keys(stats.monthly).length === 0 && (
              <p className="text-xs text-muted-foreground">No data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
