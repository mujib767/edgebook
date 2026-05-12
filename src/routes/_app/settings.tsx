import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { CURRENCIES, ASSET_TYPES } from "@/lib/trade-utils";
import { toast } from "sonner";
import { Download, Trash2, Moon, Sun } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({ component: Settings });

function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const nav = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const updateProfile = async (patch: any) => {
    if (!user) return;
    const updated = { ...profile, ...patch };
    setProfile(updated);
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await updateProfile({ avatar_url: `${data.publicUrl}?t=${Date.now()}` });
  };

  const changePassword = async () => {
    if (newPassword.length < 6) return toast.error("Password too short");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setNewPassword(""); }
  };

  const exportCsv = async () => {
    if (!user) return;
    const { data } = await supabase.from("trades").select("*").eq("user_id", user.id).order("entry_time");
    if (!data?.length) return toast.error("No trades to export");
    const headers = Object.keys(data[0]);
    const csv = [headers.join(","), ...data.map((r) => headers.map((h) => JSON.stringify((r as any)[h] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `trades-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const deleteAllTrades = async () => {
    if (!user) return;
    const { error } = await supabase.from("trades").delete().eq("user_id", user.id);
    if (error) toast.error(error.message);
    else toast.success("All trades deleted");
  };

  const deleteAccount = async () => {
    if (!user) return;
    // Delete data; auth user deletion requires admin — sign out and notify
    await supabase.from("trades").delete().eq("user_id", user.id);
    await supabase.from("ai_chat_messages").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);
    await supabase.auth.signOut();
    toast.success("Account data deleted. Contact support to fully remove your auth record.");
    nav({ to: "/login" });
  };

  if (!profile) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and preferences</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback>{(profile.display_name || user?.email || "?")[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} className="max-w-xs" />
          </div>
          <div><Label>Display Name</Label><Input value={profile.display_name || ""} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} onBlur={() => updateProfile({ display_name: profile.display_name })} /></div>
          <div><Label>Email</Label><Input value={user?.email || ""} disabled /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Default Currency</Label>
              <Select value={profile.currency} onValueChange={(v) => updateProfile({ currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Asset Type</Label>
              <Select value={profile.default_asset_type} onValueChange={(v) => updateProfile({ default_asset_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ASSET_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Timezone</Label>
              <Input value={profile.timezone || ""} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} onBlur={() => updateProfile({ timezone: profile.timezone })} placeholder="UTC" />
            </div>
            <div className="flex items-end justify-between gap-2 pb-2">
              <div>
                <Label className="block">Theme</Label>
                <p className="text-xs text-muted-foreground">{theme === "dark" ? "Dark" : "Light"} mode</p>
              </div>
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-muted-foreground" />
                <Switch checked={theme === "dark"} onCheckedChange={(c) => setTheme(c ? "dark" : "light")} />
                <Moon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Security</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <Button onClick={changePassword}>Update</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Data</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline"><Trash2 className="h-4 w-4 mr-2" /> Delete all trades</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all trades?</AlertDialogTitle>
                <AlertDialogDescription>This permanently removes all your trade records. Cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAllTrades}>Delete all</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>All your trades, chat history, and profile data will be removed. You'll be signed out.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAccount}>Delete account</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
