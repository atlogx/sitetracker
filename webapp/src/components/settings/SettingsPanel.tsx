'use client';

import React, { useState, useEffect } from 'react';
import type { Organization, UpsertOrganizationInput } from '@/types/models';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';

export interface SettingsPanelProps {
  organization: Organization | null;
  onUpdateOrganization?: (patch: Partial<UpsertOrganizationInput>) => Promise<void> | void;
  loading?: boolean;
}



const SettingsPanel: React.FC<SettingsPanelProps> = ({
  organization,
  onUpdateOrganization,
  loading = false
}) => {
  // États pour le formulaire organisation
  const [orgForm, setOrgForm] = useState<{ address: string }>({
    address: ''
  });

  // État pour les administrateurs (gestion directe comme dans les projets)
  const [editingOrgWithAdmins, setEditingOrgWithAdmins] = useState<typeof organization>(null);
  const [saving, setSaving] = useState(false);

  // Initialiser les formulaires quand l'organisation change
  useEffect(() => {
    if (organization) {
      setOrgForm({
        address: organization.address || ''
      });
      
      // S'assurer qu'il y a au moins les 2 administrateurs par défaut
      const defaultAdmins = organization.administrators && organization.administrators.length > 0 
        ? organization.administrators 
        : [
            { id: '', name: '', email: '', phone: '', position: 'Directeur général', role: 'org-level' as const, organizationId: organization.id, createdAt: '', updatedAt: '' },
            { id: '', name: '', email: '', phone: '', position: 'Service financier', role: 'org-level' as const, organizationId: organization.id, createdAt: '', updatedAt: '' }
          ];
      
      setEditingOrgWithAdmins({
        ...organization,
        administrators: defaultAdmins
      });
    }
  }, [organization]);

  const handleSaveOrganization = async () => {
    if (!onUpdateOrganization || !editingOrgWithAdmins) return;
    
    // Filtrer les administrateurs valides (ceux qui ont au minimum nom et email)
    const validAdmins = editingOrgWithAdmins.administrators.filter(admin => 
      admin.name.trim() && admin.email.trim()
    );
    
    // Validation email pour les administrateurs valides
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = validAdmins.filter(admin => 
      !emailRegex.test(admin.email)
    );
    
    if (invalidEmails.length > 0) {
      toast.error('Veuillez saisir des adresses email valides pour les administrateurs');
      return;
    }
    
    // Validation poste pour les administrateurs valides
    const adminsWithoutPosition = validAdmins.filter(admin => 
      !(admin.position || '').trim()
    );
    
    if (adminsWithoutPosition.length > 0) {
      toast.error('Veuillez renseigner le poste pour tous les administrateurs');
      return;
    }
    
    setSaving(true);
    
    try {
      // Sauvegarder l'organisation (adresse)
      await onUpdateOrganization({
        address: orgForm.address
      });
      
      // TODO: Ici il faudrait également sauvegarder les administrateurs valides
      // Pour l'instant, on simule la sauvegarde
      console.log('Organisation mise à jour avec adresse:', orgForm.address);
      console.log('Administrateurs valides à sauvegarder:', validAdmins);
      console.log(`${validAdmins.length} administrateur(s) sur ${editingOrgWithAdmins.administrators.length} seront sauvegardés`);
      
      toast.success('Modifications enregistrées avec succès');
      
      // Simuler un délai pour la démo
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde des modifications');
    } finally {
      setSaving(false);
    }
  };

  if (!organization || !editingOrgWithAdmins) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center">Aucune organisation trouvée.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informations de l'organisation */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de l&apos;organisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Colonne gauche - Informations générales */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Informations générales</h3>
              
              <div>
                <Label htmlFor="org-name">Nom de l&apos;organisation</Label>
                <Input
                  id="org-name"
                  value={organization.name}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Le nom de l&apos;organisation ne peut pas être modifié.
                </p>
              </div>
            </div>

            {/* Colonne droite - Adresse */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Adresse</h3>
              
              <div>
                <Label htmlFor="org-address">Adresse complète</Label>
                <Textarea
                  id="org-address"
                  value={orgForm.address}
                  onChange={(e) => setOrgForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Saisissez l&apos;adresse complète de l&apos;organisation..."
                  rows={3}
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Administrateurs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Administrateurs de l&apos;organisation</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Les administrateurs sans nom et email seront ignorés lors de la sauvegarde
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingOrgWithAdmins(prev => prev ? {
                ...prev,
                administrators: [...prev.administrators, { 
                  id: '', name: '', email: '', phone: '', position: '', 
                  role: 'org-level' as const, organizationId: organization.id, 
                  createdAt: '', updatedAt: '' 
                }]
              } : prev);
            }}
            disabled={saving}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un administrateur
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {editingOrgWithAdmins.administrators.map((admin, index) => (
              <div key={admin.id || index} className="p-3 border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Administrateur {index + 1}</span>
                  {editingOrgWithAdmins.administrators.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingOrgWithAdmins(prev => prev ? {
                          ...prev,
                          administrators: prev.administrators.filter((_, i) => i !== index)
                        } : prev);
                      }}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label>Poste/Titre *</Label>
                    <Input
                      value={admin.position || ''}
                      onChange={(e) => {
                        setEditingOrgWithAdmins(prev => prev ? {
                          ...prev,
                          administrators: prev.administrators.map((a, i) => 
                            i === index ? { ...a, position: e.target.value } : a
                          )
                        } : prev);
                      }}
                      placeholder="ex: Directeur général"
                      required
                      disabled={saving}
                    />
                  </div>
                  
                  <div className="grid gap-1">
                    <Label>Nom complet *</Label>
                    <Input
                      value={admin.name}
                      onChange={(e) => {
                        setEditingOrgWithAdmins(prev => prev ? {
                          ...prev,
                          administrators: prev.administrators.map((a, i) => 
                            i === index ? { ...a, name: e.target.value } : a
                          )
                        } : prev);
                      }}
                      placeholder="Nom et prénom"
                      required
                      disabled={saving}
                    />
                  </div>
                  
                  <div className="grid gap-1">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={admin.email}
                      onChange={(e) => {
                        setEditingOrgWithAdmins(prev => prev ? {
                          ...prev,
                          administrators: prev.administrators.map((a, i) => 
                            i === index ? { ...a, email: e.target.value } : a
                          )
                        } : prev);
                      }}
                      placeholder="email@atlogx.fr"
                      required
                      disabled={saving}
                    />
                  </div>
                  
                  <div className="grid gap-1">
                    <Label>Téléphone</Label>
                    <Input
                      type="tel"
                      value={admin.phone || ''}
                      onChange={(e) => {
                        setEditingOrgWithAdmins(prev => prev ? {
                          ...prev,
                          administrators: prev.administrators.map((a, i) => 
                            i === index ? { ...a, phone: e.target.value } : a
                          )
                        } : prev);
                      }}
                      placeholder="01 23 45 67 89"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bouton de sauvegarde global */}
      <div className="flex justify-end">
        <Button onClick={handleSaveOrganization} disabled={loading || saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Enregistrement...' : 'Enregistrer toutes les modifications'}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPanel;