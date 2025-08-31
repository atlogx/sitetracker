"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { requestPasswordReset, assertEmail } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Mail, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [email]);

  function validate(): boolean {
    if (!email.trim()) {
      setError("Veuillez saisir votre adresse email.");
      return false;
    }
    if (!assertEmail(email.trim())) {
      setError("Adresse email invalide.");
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
    const { error: resetError } = await requestPasswordReset(email.trim());
    setSubmitting(false);
    if (resetError) {
      setError("Échec de la demande. Vérifiez l'adresse fournie.");
      toast.error("Réinitialisation impossible");
      return;
    }
    toast.success("Email de réinitialisation envoyé");
    setSuccessInfo("Si un compte existe avec cette adresse, un email de réinitialisation a été envoyé. Consultez votre boîte de réception (et spam).");
  }

  return (
    <AppLayout>
      <div className="min-h-[60vh] flex items-center justify-center py-10">
        <div className="w-full max-w-md">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Réinitialisation du mot de passe
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
                    placeholder="email@exemple.com"
                    value={email}
                    disabled={submitting || !!successInfo}
                    onChange={(e) => setEmail(e.target.value)}
                  />
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
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Envoyer le lien
                  </Button>
                )}
              </form>
              <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Vous souvenez-vous du mot de passe ?</span>
                  <Link
                    href={`/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
                    className="text-primary hover:underline font-medium"
                  >
                    Se connecter
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pas encore de compte ?</span>
                  <Link
                    href={`/auth/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}
                    className="text-primary hover:underline font-medium"
                  >
                    S&apos;inscrire
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  Retour
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

export default function ResetPasswordRequestPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}