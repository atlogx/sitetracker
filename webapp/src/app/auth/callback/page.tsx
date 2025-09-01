"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

function CallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Vérifier les paramètres depuis l'URL et le fragment
        let token_hash = params.get("token_hash");
        let type = params.get("type");
        let access_token = params.get("access_token");
        let refresh_token = params.get("refresh_token");

        // Si pas de paramètres dans l'URL, vérifier le fragment (hash)
        if (!token_hash && !access_token && typeof window !== 'undefined') {
          const hash = window.location.hash.substring(1);
          const hashParams = new URLSearchParams(hash);
          
          token_hash = hashParams.get("token_hash");
          type = hashParams.get("type");
          access_token = hashParams.get("access_token");
          refresh_token = hashParams.get("refresh_token");
        }

        console.log("Callback params:", { token_hash, type, access_token, refresh_token });

        // Si on a access_token et refresh_token (ancien format)
        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) throw error;
          
          setSuccess(true);
          toast.success("Compte confirmé !", {
            description: "Votre email a été vérifié avec succès"
          });
          
          setTimeout(() => {
            router.push("/");
          }, 2000);
          return;
        }

        // Si on a token_hash et type (nouveau format)
        if (token_hash && type) {
          const { error: authError } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any
          });
          
          if (authError) throw authError;
          
          setSuccess(true);
          toast.success("Compte confirmé !", {
            description: "Votre email a été vérifié avec succès"
          });
          
          setTimeout(() => {
            router.push("/");
          }, 2000);
          return;
        }

        // Si aucun paramètre valide
        throw new Error("Paramètres de confirmation manquants ou invalides");
        
      } catch (err: any) {
        console.error("Callback error:", err);
        setError(err.message || "Erreur lors de la confirmation");
        toast.error("Erreur de confirmation", {
          description: err.message || "Impossible de confirmer votre compte"
        });
      } finally {
        setLoading(false);
      }
    };

    handleEmailConfirmation();
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
    <Suspense fallback={
      <AppLayout>
        <div className="min-h-[60vh] flex items-center justify-center py-10">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </AppLayout>
    }>
      <CallbackContent />
    </Suspense>
  );
}