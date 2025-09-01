"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { Mail, RefreshCw, ArrowLeft, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";

function ConfirmEmailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email");
  
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Rediriger si pas d'email
  useEffect(() => {
    if (!email) {
      router.push("/auth/login");
    }
  }, [email, router]);

  // Timer pour empêcher le spam de renvoi
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleResendEmail = async () => {
    if (resendTimer > 0 || !email || isResending) return;
    
    try {
      setIsResending(true);
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      });
      
      if (error) throw error;
      
      // Démarrer le timer de 60 secondes
      setResendTimer(60);
      
      toast.success("Email renvoyé", {
        description: "Un nouvel email de confirmation a été envoyé"
      });
      
    } catch (error: any) {
      toast.error("Erreur", {
        description: error.message || "Impossible de renvoyer l'email"
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToLogin = () => {
    router.push("/auth/login");
  };

  if (!email) {
    return null; // La redirection se fera via useEffect
  }

  return (
    <AppLayout>
      <div className="min-h-[60vh] flex items-center justify-center py-10">
        <div className="w-full max-w-md">
          <Card className="border-border">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl font-semibold">
                Vérifiez votre email
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                Un email de confirmation a été envoyé à
              </p>
              <p className="font-medium text-foreground break-words">
                {email}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Instructions */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-muted-foreground">
                    Cliquez sur le lien dans l'email pour activer votre compte
                  </p>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-muted-foreground">
                    Pensez à vérifier votre dossier spam/courrier indésirable
                  </p>
                </div>
              </div>

              {/* Message d'aide */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 Une fois votre compte confirmé, vous pourrez vous connecter et accéder à tous les outils de suivi de projets de construction.
                </p>
              </div>
              
              {/* Actions */}
              <div className="space-y-3">
                <Button 
                  onClick={handleResendEmail} 
                  variant="outline" 
                  disabled={isResending || resendTimer > 0}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {isResending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  {resendTimer > 0 
                    ? `Renvoyer dans ${resendTimer}s` 
                    : "Renvoyer l'email de confirmation"
                  }
                </Button>
                
                <Button 
                  onClick={handleGoToLogin} 
                  variant="ghost" 
                  className="w-full flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour à la connexion
                </Button>
              </div>

              {/* Note légale */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Vous n'arrivez toujours pas à recevoir l'email ?{" "}
                  <Link 
                    href="/auth/register" 
                    className="text-primary hover:underline font-medium"
                  >
                    Réessayer l'inscription
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

export default function ConfirmEmailPage() {
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
      <ConfirmEmailContent />
    </Suspense>
  );
}