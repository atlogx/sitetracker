'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor, Settings, RotateCcw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const ThemeSettings: React.FC = () => {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [reduceAnimations, setReduceAnimations] = React.useState(false);
  const [compactMode, setCompactMode] = React.useState(false);

  // Éviter les problèmes d'hydratation
  React.useEffect(() => {
    setMounted(true);
    // Charger les préférences sauvegardées
    const savedAnimations = localStorage.getItem('reduce-animations');
    const savedCompact = localStorage.getItem('compact-mode');
    if (savedAnimations !== null) setReduceAnimations(savedAnimations === 'true');
    if (savedCompact !== null) setCompactMode(savedCompact === 'true');
  }, []);

  // Sauvegarder les préférences
  React.useEffect(() => {
    if (mounted) {
      localStorage.setItem('reduce-animations', reduceAnimations.toString());
      document.documentElement.classList.toggle('reduce-animations', reduceAnimations);
    }
  }, [reduceAnimations, mounted]);

  React.useEffect(() => {
    if (mounted) {
      localStorage.setItem('compact-mode', compactMode.toString());
      document.documentElement.classList.toggle('compact-mode', compactMode);
    }
  }, [compactMode, mounted]);

  const resetToDefaults = () => {
    setTheme('system');
    setReduceAnimations(false);
    setCompactMode(false);
    toast.success('Paramètres réinitialisés aux valeurs par défaut');
  };

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Apparence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded w-20 animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentTheme = theme === 'system' ? systemTheme : theme;

  const themeOptions = [
    {
      value: 'light',
      label: 'Clair',
      icon: Sun,
      description: 'Thème clair pour un affichage lumineux'
    },
    {
      value: 'dark',
      label: 'Sombre',
      icon: Moon,
      description: 'Thème sombre pour réduire la fatigue oculaire'
    },
    {
      value: 'system',
      label: 'Système',
      icon: Monitor,
      description: 'Utilise les préférences de votre système'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Configuration du thème</h3>
          <p className="text-sm text-muted-foreground">
            Choisissez le thème qui vous convient le mieux.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetToDefaults}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Réinitialiser
        </Button>
      </div>
      
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-4">
            <Label className="text-base font-medium">Thème de l'interface</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.value;
                
                return (
                  <Button
                    key={option.value}
                    variant={isSelected ? "default" : "outline"}
                    className={`h-auto p-4 flex flex-col items-center space-y-2 ${
                      isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                    }`}
                    onClick={() => setTheme(option.value)}
                  >
                    <Icon className="h-5 w-5" />
                    <div className="text-center">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {option.description}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                {currentTheme === 'dark' ? (
                  <Moon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Sun className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    Thème actuel : {currentTheme === 'dark' ? 'Sombre' : 'Clair'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {theme === 'system' ? 'Défini par le système' : 'Défini manuellement'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Préférences d'affichage
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Options avancées pour personnaliser votre expérience.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Réduire les animations</Label>
                <p className="text-xs text-muted-foreground">
                  Diminue les animations pour améliorer les performances et réduire les distractions
                </p>
              </div>
              <Switch
                checked={reduceAnimations}
                onCheckedChange={setReduceAnimations}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Mode compact</Label>
                <p className="text-xs text-muted-foreground">
                  Réduit l'espacement pour afficher plus d'informations sur un écran
                </p>
              </div>
              <Switch
                checked={compactMode}
                onCheckedChange={setCompactMode}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aperçu</CardTitle>
          <p className="text-sm text-muted-foreground">
            Prévisualisation de vos paramètres d'affichage.
          </p>
        </CardHeader>
        <CardContent>
          <div className={`border rounded-lg p-4 space-y-3 transition-all duration-200 ${
            compactMode ? 'p-2 space-y-1' : ''
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`font-medium ${compactMode ? 'text-sm' : ''}`}>
                  Titre d'exemple
                </h4>
                <p className={`text-muted-foreground ${
                  compactMode ? 'text-xs' : 'text-sm'
                }`}>
                  Aperçu en temps réel de vos paramètres d'affichage actuels.
                </p>
              </div>
              <Button size={compactMode ? "sm" : "default"}>Action</Button>
            </div>
            <div className="h-px bg-border" />
            <div className="flex space-x-2">
              <div className={`bg-primary rounded ${
                compactMode ? 'h-2 w-12' : 'h-3 w-16'
              } ${reduceAnimations ? '' : 'animate-pulse'}`} />
              <div className={`bg-muted rounded ${
                compactMode ? 'h-2 w-8' : 'h-3 w-12'
              }`} />
              <div className={`bg-accent rounded ${
                compactMode ? 'h-2 w-14' : 'h-3 w-20'
              }`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThemeSettings;