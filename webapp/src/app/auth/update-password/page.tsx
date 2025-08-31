"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Eye, EyeOff, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getCurrentUser, updatePassword } from "@/lib/auth";

function UpdatePasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [loadingUser, setLoadingUser] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getCurrentUser().then(({ user }) => {
      if (mounted) {
        setHasSession(!!user);
        setLoadingUser(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setError(null);
  }, [password, confirm]);

  function validate(): boolean {
    if (!password.trim() || !confirm.trim()) {
      setError("Veuillez remplir les deux champs.");
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
    const { user, error: updateErr } = await updatePassword(password);
    setSubmitting(false);
    if (updateErr || !user) {
      setError(updateErr || "Échec de la mise à jour.");
      toast.error("Échec de la mise à jour");
      return;
    }
    toast.success("Mot de passe mis à jour");
    setSuccessInfo("Votre mot de passe a été mis à jour avec succès.");
    setTimeout(() => {
      router.replace(next && next.startsWith("/") ? next : "/");
    }, 1200);
  }

  return (
    <AppLayout>
      <div className="min-h-[60vh] flex items-center justify-center py-10">
        <div className="w-full max-w-md">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Nouveau mot de passe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingUser ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Vérification de la session...</p>
                </div>
              ) : !hasSession ? (
                <div className="space-y-6">
                  <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Lien expiré ou session invalide. Recommencez la procédure de réinitialisation.</span>
                  </div>
                  <Button
                    onClick={() => router.replace("/auth/reset-password")}
                    variant="outline"
                    className="w-full"
                  >
                    Revenir à la réinitialisation
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="password">Nouveau mot de passe</Label>
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
                        aria-label={showPwd ? "Masquer" : "Afficher"}
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
                        aria-label={showConfirm ? "Masquer" : "Afficher"}
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
                    <div className="flex items-start gap-2 rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{successInfo}</span>
                    </div>
                  )}
                  {!successInfo && (
                    <Button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2"
                      disabled={submitting}
                    >
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Mettre à jour
                    </Button>
                  )}
                  {next && (
                    <p className="text-xs text-muted-foreground/70">
                      Redirection prévue vers: <span className="font-medium">{next}</span>
                    </p>
                  )}
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UpdatePasswordContent />
    </Suspense>
  );
}