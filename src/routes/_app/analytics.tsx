import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtMoney } from "@/lib/trade-utils";

export const Route = createFileRoute("/_app/analytics")({ component: Analytics });

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Analytics() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("trades").select("*").eq("user_id", user.id).order("entry_time")
      .then(({ data }) => setTrades(data || []));
  }, [user]);

  const data = useMemo(() => {
    const groupSum = (key: (t: any) => string) => {
      const m: Record<string, number> = {};
      trades.forEach((t) => { const k = key(t); if (!k) return; m[k] = (m[k] || 0) + Number(t.pnl); });
      return Object.entries(m).map(([name, pnl]) => ({ name, pnl }));
    };
    const groupWR = (key: (t: any) => string) => {
      const m: Record<string, { w: number; n: number }> = {};
      trades.forEach((t) => {
        const k = key(t); if (!k) return;
        m[k] = m[k] || { w: 0, n: 0 };
        m[k].n++; if (Number(t.pnl) > 0) m[k].w++;
      });
      return Object.entries(m).map(([name, v]) => ({ name, wr: (v.w / v.n) * 100, n: v.n }));
    };

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return {
      byMonth: groupSum((t) => t.entry_time?.slice(0, 7)),
      byDow: groupSum((t) => days[new Date(t.entry_time).getDay()]),
      byHour: groupSum((t) => `${new Date(t.entry_time).getHours()}:00`),
      bySymbol: groupSum((t) => t.symbol),
      symbolDist: (() => {
        const m: Record<string, number> = {};
        trades.forEach((t) => { m[t.symbol] = (m[t.symbol] || 0) + 1; });
        return Object.entries(m).map(([name, value]) => ({ name, value }));
      })(),
      wrByAsset: groupWR((t) => t.asset_type),
      wrBySetup: groupWR((t) => t.setup),
      mistakes: (() => {
        const m: Record<string, number> = {};
        trades.forEach((t) => { if (t.mistake) m[t.mistake] = (m[t.mistake] || 0) + 1; });
        return Object.entries(m).map(([name, count]) => ({ name, count }));
      })(),
      emotion: groupSum((t) => t.emotional_state),
      longShort: (() => {
        const longs = trades.filter((t) => t.trade_type === "Long");
        const shorts = trades.filter((t) => t.trade_type === "Short");
        return [
          { name: "Long", pnl: longs.reduce((s, t) => s + Number(t.pnl), 0), n: longs.length },
          { name: "Short", pnl: shorts.reduce((s, t) => s + Number(t.pnl), 0), n: shorts.length },
        ];
      })(),
    };
  }, [trades]);

  const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 };

  if (trades.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground mt-2">Log some trades to see analytics.</p>
      </div>
    );
  }

  const Bars = ({ d, k }: { d: any[]; k: string }) => (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={d}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey={k} radius={[4, 4, 0, 0]}>
          {d.map((row, i) => (
            <Cell key={i} fill={Number(row[k]) >= 0 ? "var(--profit)" : "var(--loss)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Pattern analysis across {trades.length} trades</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-base">P&L by Month</CardTitle></CardHeader><CardContent><Bars d={data.byMonth} k="pnl" /></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">P&L by Day of Week</CardTitle></CardHeader><CardContent><Bars d={data.byDow} k="pnl" /></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">P&L by Hour</CardTitle></CardHeader><CardContent><Bars d={data.byHour} k="pnl" /></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">P&L by Symbol</CardTitle></CardHeader><CardContent><Bars d={data.bySymbol} k="pnl" /></CardContent></Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Trade Distribution by Symbol</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.symbolDist} dataKey="value" nameKey="name" outerRadius={80} label>
                  {data.symbolDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Win Rate by Asset Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.wrByAsset}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Bar dataKey="wr" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Win Rate by Setup</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.wrBySetup}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Bar dataKey="wr" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Most Common Mistakes</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.mistakes}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--loss)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Emotion vs P&L</CardTitle></CardHeader>
          <CardContent><Bars d={data.emotion} k="pnl" /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Long vs Short P&L</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {data.longShort.map((d) => (
                <div key={d.name} className="rounded-md border border-border p-4">
                  <div className="text-xs text-muted-foreground uppercase">{d.name}</div>
                  <div className={`text-2xl font-mono-tabular font-semibold ${d.pnl >= 0 ? "text-profit" : "text-loss"}`}>{fmtMoney(d.pnl)}</div>
                  <div className="text-xs text-muted-foreground">{d.n} trades</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
