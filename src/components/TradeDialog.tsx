import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { calcPnl, ASSET_TYPES, MISTAKES, EMOTIONS, fmtMoney, fmtPct, pnlClass } from "@/lib/trade-utils";
import { toast } from "sonner";

export interface TradeRow {
  id?: string;
  symbol: string;
  asset_type: string;
  trade_type: "Long" | "Short";
  lot_size: number;
  entry_price: number;
  exit_price: number;
  entry_time: string;
  exit_time: string;
  setup?: string | null;
  mistake?: string | null;
  emotional_state?: string | null;
  notes?: string | null;
}

const empty: TradeRow = {
  symbol: "", asset_type: "Forex", trade_type: "Long",
  lot_size: 0, entry_price: 0, exit_price: 0,
  entry_time: new Date().toISOString().slice(0, 16),
  exit_time: new Date().toISOString().slice(0, 16),
  setup: "", mistake: "", emotional_state: "", notes: "",
};

export function TradeDialog({
  open, onOpenChange, trade, onSaved,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  trade?: TradeRow | null;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState<TradeRow>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (trade) {
      setForm({
        ...trade,
        entry_time: trade.entry_time?.slice(0, 16),
        exit_time: trade.exit_time?.slice(0, 16),
      });
    } else setForm(empty);
  }, [trade, open]);

  const preview = calcPnl({
    trade_type: form.trade_type,
    lot_size: Number(form.lot_size),
    entry_price: Number(form.entry_price),
    exit_price: Number(form.exit_price),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      symbol: form.symbol.toUpperCase(),
      asset_type: form.asset_type,
      trade_type: form.trade_type,
      lot_size: Number(form.lot_size),
      entry_price: Number(form.entry_price),
      exit_price: Number(form.exit_price),
      entry_time: new Date(form.entry_time).toISOString(),
      exit_time: new Date(form.exit_time).toISOString(),
      setup: form.setup || null,
      mistake: form.mistake || null,
      emotional_state: form.emotional_state || null,
      notes: form.notes || null,
      pnl: preview.pnl,
      pnl_percent: preview.pnl_percent,
      status: preview.status,
    };
    const res = trade?.id
      ? await supabase.from("trades").update(payload).eq("id", trade.id)
      : await supabase.from("trades").insert(payload);
    setSaving(false);
    if (res.error) toast.error(res.error.message);
    else { toast.success(trade?.id ? "Trade updated" : "Trade added"); onOpenChange(false); onSaved(); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{trade?.id ? "Edit trade" : "Add trade"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Symbol</Label><Input required value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="EURUSD" /></div>
            <div>
              <Label>Asset Type</Label>
              <Select value={form.asset_type} onValueChange={(v) => setForm({ ...form, asset_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ASSET_TYPES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trade Type</Label>
              <Select value={form.trade_type} onValueChange={(v: "Long" | "Short") => setForm({ ...form, trade_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Long">Long</SelectItem>
                  <SelectItem value="Short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Lot Size</Label><Input required type="number" step="0.01" value={form.lot_size} onChange={(e) => setForm({ ...form, lot_size: Number(e.target.value) })} /></div>
            <div><Label>Entry Price</Label><Input required type="number" step="any" value={form.entry_price} onChange={(e) => setForm({ ...form, entry_price: Number(e.target.value) })} /></div>
            <div><Label>Exit Price</Label><Input required type="number" step="any" value={form.exit_price} onChange={(e) => setForm({ ...form, exit_price: Number(e.target.value) })} /></div>
            <div><Label>Entry Date & Time</Label><Input required type="datetime-local" value={form.entry_time} onChange={(e) => setForm({ ...form, entry_time: e.target.value })} /></div>
            <div><Label>Exit Date & Time</Label><Input required type="datetime-local" value={form.exit_time} onChange={(e) => setForm({ ...form, exit_time: e.target.value })} /></div>
            <div><Label>Setup</Label><Input value={form.setup || ""} onChange={(e) => setForm({ ...form, setup: e.target.value })} placeholder="Breakout, Pullback…" /></div>
            <div>
              <Label>Mistake</Label>
              <Select value={form.mistake || "none"} onValueChange={(v) => setForm({ ...form, mistake: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {MISTAKES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Emotional State</Label>
              <Select value={form.emotional_state || "none"} onValueChange={(v) => setForm({ ...form, emotional_state: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {EMOTIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Auto P&L</span>
            <span className={`font-mono-tabular font-semibold ${pnlClass(preview.pnl)}`}>
              {fmtMoney(preview.pnl)} ({fmtPct(preview.pnl_percent)})
            </span>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save trade"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
