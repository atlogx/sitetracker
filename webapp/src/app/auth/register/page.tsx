"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUp, assertEmail } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";

function RegisterContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [email, password, confirm]);

  function validate(): boolean {
    if (!email.trim() || !password.trim() || !confirm.trim()) {
      setError("Veuillez remplir tous les champs.");
      return false;
    }
    if (!assertEmail(email.trim())) {
      setError("Adresse email invalide.");
      return false;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return false;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError(null);
    setSuccessInfo(null);
    const { user, error: signupError } = await signUp(email.trim(), password);
    setSubmitting(false);
    if (signupError) {
      setError(signupError);
      toast.error("Échec de l'inscription");
      return;
    }
    toast.success("Compte créé");
    // Rediriger vers la page de confirmation avec l'email
    router.push(`/auth/confirm-email?email=${encodeURIComponent(email.trim())}`);
  }

  return (
    <AppLayout>
      <div className="min-h-[60vh] flex items-center justify-center py-10">
        <div className="w-full max-w-md">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Créer un compte
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
                    disabled={submitting || !!successInfo}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPwd ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Au moins 8 caractères"
                      value={password}
                      disabled={submitting || !!successInfo}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      className="absolute inset-y-0 right-0 px-2 flex items-center text-muted-foreground hover:text-foreground"
                      disabled={submitting || !!successInfo}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="confirm"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Répétez le mot de passe"
                      value={confirm}
                      disabled={submitting || !!successInfo}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? "Masquer la confirmation" : "Afficher la confirmation"}
                      className="absolute inset-y-0 right-0 px-2 flex items-center text-muted-foreground hover:text-foreground"
                      disabled={submitting || !!successInfo}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                {successInfo && (
                  <div className="rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                    {successInfo}
                  </div>
                )}
                {!successInfo && (
                  <Button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2"
                    disabled={submitting}
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    S&apos;inscrire
                  </Button>
                )}
              </form>
              <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Déjà un compte ?</span>
                  <Link
                    href={`/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
                    className="text-primary hover:underline font-medium"
                  >
                    Se connecter
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
                    Après validation vous serez redirigé vers: <span className="font-medium">{next}</span>
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

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}