import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TradeDialog, type TradeRow } from "@/components/TradeDialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { fmtMoney, fmtPct, pnlClass } from "@/lib/trade-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/journal")({ component: Journal });

interface Trade extends TradeRow { id: string; pnl: number; pnl_percent: number; status: string; }

function Journal() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [editing, setEditing] = useState<Trade | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("trades").select("*").eq("user_id", user.id).order("entry_time", { ascending: false });
    setTrades((data as Trade[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const filtered = useMemo(() => {
    let res = trades;
    if (search) res = res.filter((t) => t.symbol.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== "all") res = res.filter((t) => t.status === statusFilter);
    if (typeFilter !== "all") res = res.filter((t) => t.trade_type === typeFilter);
    if (dateFilter !== "all") {
      const now = new Date();
      const cutoff = new Date(now);
      if (dateFilter === "today") cutoff.setHours(0, 0, 0, 0);
      else if (dateFilter === "week") cutoff.setDate(now.getDate() - 7);
      else if (dateFilter === "month") cutoff.setMonth(now.getMonth() - 1);
      res = res.filter((t) => new Date(t.entry_time) >= cutoff);
    }
    return res;
  }, [trades, search, statusFilter, typeFilter, dateFilter]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("trades").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else { toast.success("Trade deleted"); load(); }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Journal</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {trades.length} trades</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Add Trade</Button>
      </div>

      <Card>
        <CardContent className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input placeholder="Search symbol…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All trades</SelectItem>
              <SelectItem value="Win">Winners</SelectItem>
              <SelectItem value="Loss">Losers</SelectItem>
              <SelectItem value="Breakeven">Breakeven</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="Long">Long</SelectItem>
              <SelectItem value="Short">Short</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Lot</TableHead>
                <TableHead className="text-right">Entry</TableHead>
                <TableHead className="text-right">Exit</TableHead>
                <TableHead>Entry Date</TableHead>
                <TableHead className="text-right">P&L</TableHead>
                <TableHead className="text-right">P&L %</TableHead>
                <TableHead>Setup</TableHead>
                <TableHead>Mistake</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">No trades found</TableCell></TableRow>
              ) : filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.symbol}</TableCell>
                  <TableCell><Badge variant={t.trade_type === "Long" ? "default" : "secondary"}>{t.trade_type}</Badge></TableCell>
                  <TableCell className="text-right font-mono-tabular">{t.lot_size}</TableCell>
                  <TableCell className="text-right font-mono-tabular">{Number(t.entry_price)}</TableCell>
                  <TableCell className="text-right font-mono-tabular">{Number(t.exit_price)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(t.entry_time).toLocaleString()}</TableCell>
                  <TableCell className={`text-right font-mono-tabular font-semibold ${pnlClass(Number(t.pnl))}`}>{fmtMoney(Number(t.pnl))}</TableCell>
                  <TableCell className={`text-right font-mono-tabular ${pnlClass(Number(t.pnl_percent))}`}>{fmtPct(Number(t.pnl_percent))}</TableCell>
                  <TableCell className="text-xs">{t.setup || "—"}</TableCell>
                  <TableCell className="text-xs">{t.mistake || "—"}</TableCell>
                  <TableCell><Badge variant={t.status === "Win" ? "default" : t.status === "Loss" ? "destructive" : "outline"}>{t.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setDialogOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TradeDialog open={dialogOpen} onOpenChange={setDialogOpen} trade={editing} onSaved={load} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this trade?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
