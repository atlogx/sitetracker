"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, assertEmail } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogIn, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = params.get("next");

  useEffect(() => {
    setError(null);
  }, [email, password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    if (!assertEmail(email.trim())) {
      setError("Email invalide.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { user, error: authError } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (authError) {
      // Vérifier si c'est un problème de confirmation d'email
      if (authError === 'EMAIL_NOT_CONFIRMED') {
        toast.error("Email non confirmé", {
          description: "Veuillez confirmer votre email avant de vous connecter"
        });
        // Rediriger vers la page de confirmation
        router.push(`/auth/confirm-email?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      setError("Identifiants invalides ou échec de connexion.");
      toast.error("Connexion refusée", {
        description: "Vérifiez votre email et mot de passe ou utilisez la réinitialisation."
      });
      return;
    }
    if (!user) {
      setError("Identifiants invalides ou échec de connexion.");
      toast.error("Connexion refusée", {
        description: "Vérifiez votre email et mot de passe ou utilisez la réinitialisation."
      });
      return;
    }
    // Forcer la synchronisation des cookies pour le middleware
    try {
      await supabase.auth.getSession();
    } catch {}
    router.replace(next && next.startsWith("/") ? next : "/");
  }

  return (
    <AppLayout>
      <div className="min-h-[60vh] flex items-center justify-center py-10">
        <div className="w-full max-w-md">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Connexion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nom@example.com"
                    value={email}
                    disabled={submitting}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPwd ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Votre mot de passe"
                      value={password}
                      disabled={submitting}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute inset-y-0 right-0 px-2 flex items-center text-muted-foreground hover:text-foreground"
                      disabled={submitting}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2"
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Se connecter
                </Button>
              </form>
              <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Nouveau sur la plateforme ?</span>
                  <Link
                    href="/auth/register"
                    className="text-primary hover:underline font-medium"
                  >
                    Créer un compte
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span>Mot de passe oublié ?</span>
                  <Link
                    href="/auth/reset-password"
                    className="text-primary hover:underline font-medium"
                  >
                    Réinitialiser
                  </Link>
                </div>
                {next && (
                  <p className="text-xs text-muted-foreground/70">
                    Après connexion vous serez redirigé vers: <span className="font-medium">{next}</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}