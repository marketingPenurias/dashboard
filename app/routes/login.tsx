import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase.client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setError(null);
    setLoading(true);

    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError("Cliente de Supabase no disponible");
      setLoading(false);
      return;
    }

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
    // Sin error: el navegador ya está siendo redirigido a Google, no hay
    // nada más que hacer aquí — `/auth/callback` recoge el resultado.
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">NightGraph</p>
          <CardTitle className="text-lg mt-1">Acceso staff</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-xs text-destructive text-center">{error}</p>}
          <Button
            type="button"
            className="w-full"
            disabled={loading}
            onClick={handleGoogleLogin}
          >
            {loading ? "Conectando…" : "Entrar con Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
