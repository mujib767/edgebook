import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrendingUp } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/login")({
  validateSearch: (s) => searchSchema.parse(s),
  component: LoginPage,
});

function LoginPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const nav = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(search.mode || "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) nav({ to: "/dashboard" });
  }, [user, nav]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Signed in"); nav({ to: "/dashboard" }); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: name },
      },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email to confirm your account");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <TrendingUp className="h-5 w-5" />
          </div>
          <CardTitle className="mt-2">Welcome to Edgebook</CardTitle>
          <p className="text-sm text-muted-foreground">Your AI-powered trading journal</p>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-3 pt-3">
                <div><Label htmlFor="e">Email</Label><Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div><Label htmlFor="p">Password</Label><Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3 pt-3">
                <div><Label htmlFor="n">Display name</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} required /></div>
                <div><Label htmlFor="e2">Email</Label><Input id="e2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div><Label htmlFor="p2">Password</Label><Input id="p2" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating..." : "Create account"}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
