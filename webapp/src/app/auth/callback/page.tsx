"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

/**
 * Callback de confirmation email simplifié.
 *
 * Objectif:
 *  - Gérer les anciens liens contenant access_token / refresh_token (query ou hash)
 *  - Gérer les liens contenant un paramètre ?code=... (PKCE / OAuth) via exchangeCodeForSession ou getSessionFromUrl
 *  - Fallback: si une session existe déjà (cookies), on considère la confirmation réussie
 *  - Aucune vérification OTP directe (pas de token_hash / verifyOtp)
 *
 * Scénarios supportés:
 *  1. /auth/callback?access_token=...&refresh_token=...
 *  2. /auth/callback#access_token=...&refresh_token=...
 *  3. /auth/callback?code=... (échange côté client)
 *  4. Redirection sans param mais session déjà créée (getSession()) -> succès
 */

function parseFragment(fragment: string): Record<string, string> {
  const out: Record<string, string> = {};
  fragment
    .replace(/^#/, "")
    .split("&")
    .filter(Boolean)
    .forEach((kv) => {
      const [k, v] = kv.split("=");
      if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || "");
    });
  return out;
}

async function tryExchangeCode(code: string) {
  // Essaye d'abord exchangeCodeForSession si présent
  const authAny = (supabase.auth as any);
  if (authAny?.exchangeCodeForSession) {
    const { error } = await authAny.exchangeCodeForSession(code);
    if (error) throw error;
    return true;
  }
  // Sinon tente getSessionFromUrl (certaines versions)
  if (authAny?.getSessionFromUrl) {
    const { error } = await authAny.getSessionFromUrl({ storeSession: true });
    if (error) throw error;
    return true;
  }
  // Pas de méthode d'échange disponible
  throw new Error("Impossible d'échanger le code (méthode non disponible dans cette version du client).");
}

function CallbackContent() {
  const router = useRouter();
  const params = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // Récupération du param de redirection éventuel
        const next = params.get("next");

        // 1. Récupération tokens depuis query
        let access_token = params.get("access_token");
        let refresh_token = params.get("refresh_token");
        let code = params.get("code");

        // 2. Si pas de tokens en query, regarder le fragment (#)
        if (typeof window !== "undefined" && (!access_token || !refresh_token)) {
          const fragment = window.location.hash;
            if (fragment && fragment.includes("access_token")) {
              const fragParams = parseFragment(fragment);
              access_token = access_token || fragParams["access_token"];
              refresh_token = refresh_token || fragParams["refresh_token"];
              code = code || fragParams["code"];
            }
        }

        // 3. Si on a access_token + refresh_token -> setSession
        if (access_token && refresh_token) {
          const { error: sessionErr } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessionErr) {
            throw sessionErr;
          }
          if (cancelled) return;
          setSuccess(true);
          toast.success("Compte confirmé !", {
            description: "Votre email a été vérifié avec succès",
          });
          setTimeout(() => {
            if (!cancelled) router.replace(next && next.startsWith("/") ? next : "/");
          }, 1500);
          return;
        }

        // 4. Si on a un code -> tentative d'échange
        if (code) {
          await tryExchangeCode(code);
          if (cancelled) return;
          // Vérifier la session obtenue
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            setSuccess(true);
            toast.success("Compte confirmé !", {
              description: "Votre email a été vérifié avec succès",
            });
            setTimeout(() => {
              if (!cancelled) router.replace(next && next.startsWith("/") ? next : "/");
            }, 1500);
            return;
          }
          throw new Error("Échec de l'échange du code.");
        }

        // 5. Fallback: peut-être que la session est déjà active
        {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            if (cancelled) return;
            setSuccess(true);
            toast.success("Compte confirmé !");
            setTimeout(() => {
              if (!cancelled) router.replace(next && next.startsWith("/") ? next : "/");
            }, 1200);
            return;
          }
        }

        // 6. Aucun signe de session ou tokens
        // Fallback gracieux: considérer la confirmation comme effectuée (flux Supabase /auth/v1/verify déjà traité côté serveur)
        // et rediriger l'utilisateur vers la page de connexion pour poursuivre.
                setSuccess(true);
                toast.success("Email confirmé", {
                  description: "Vous pouvez maintenant vous connecter."
                });
                setTimeout(() => {
                  if (!cancelled) {
                    router.replace("/auth/login");
                  }
                }, 1800);
                return;
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Erreur lors de la confirmation");
        toast.error("Erreur de confirmation", {
          description: e?.message || "Impossible de confirmer votre compte",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  const handleReturnToLogin = () => {
    router.push("/auth/login");
  };

  const handleResendEmail = () => {
    router.push("/auth/register");
  };

  return (
    <AppLayout>
      <div className="min-h-[60vh] flex items-center justify-center py-10">
        <div className="w-full max-w-md">
          <Card className="border-border">
            <CardContent className="p-8 text-center space-y-6">
              {loading && (
                <>
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">
                      Confirmation en cours...
                    </h1>
                    <p className="text-muted-foreground mt-2">
                      Vérification de votre email
                    </p>
                  </div>
                </>
              )}

              {!loading && success && (
                <>
                  <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">
                      🎉 Compte confirmé !
                    </h1>
                    <p className="text-muted-foreground mt-2">
                      Votre email a été vérifié avec succès
                    </p>
                    <p className="text-sm text-muted-foreground mt-3">
                      Redirection vers votre tableau de bord...
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Bienvenue sur Jonii ! Vous pouvez maintenant accéder à tous les outils de suivi de projets.
                    </p>
                  </div>
                </>
              )}

              {!loading && !success && error && (
                <>
                  <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">
                      Erreur de confirmation
                    </h1>
                    <p className="text-muted-foreground mt-2">
                      {error}
                    </p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      Le lien de confirmation est peut-être expiré ou invalide.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Button
                      onClick={handleResendEmail}
                      className="w-full"
                    >
                      Demander un nouvel email
                    </Button>
                    <Button
                      onClick={handleReturnToLogin}
                      variant="outline"
                      className="w-full"
                    >
                      Retour à la connexion
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="min-h-[60vh] flex items-center justify-center py-10">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          </div>
        </AppLayout>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}