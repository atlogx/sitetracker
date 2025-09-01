'use client';

import React, { useState, useEffect } from 'react';
import type { Organization, UpsertOrganizationInput } from '@/types/models';
import { administratorsService } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Trash2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';

export interface SettingsPanelProps {
  organization: Organization | null;
  onUpdateOrganization?: (patch: Partial<UpsertOrganizationInput>) => Promise<void> | void;
  onRefresh?: () => void;
  loading?: boolean;
}



const SettingsPanel: React.FC<SettingsPanelProps> = ({
  organization,
  onUpdateOrganization,
  onRefresh,
  loading = false
}) => {
  // États pour le formulaire organisation
  const [orgForm, setOrgForm] = useState<{ address: string }>({
    address: ''
  });

  // État pour les administrateurs (gestion directe comme dans les projets)
  const [editingOrgWithAdmins, setEditingOrgWithAdmins] = useState<typeof organization>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<{index: number, admin: any} | null>(null);

  // Initialiser les formulaires quand l'organisation change
  useEffect(() => {
    if (organization) {
      setOrgForm({
        address: organization.address || ''
      });
      
      // Utiliser les administrateurs existants ou un tableau vide si aucun
      const admins = organization.administrators || [];
      
      setEditingOrgWithAdmins({
        ...organization,
        administrators: admins
      });
    }
  }, [organization]);

  const handleDeleteAdmin = async () => {
    if (!adminToDelete || !editingOrgWithAdmins) return;
    
    const { index, admin } = adminToDelete;
    
    // Si l'admin a un ID, le supprimer immédiatement de la BDD
    if (admin.id) {
      try {
        await administratorsService.delete(admin.id);
        toast.success('Administrateur supprimé avec succès');
        
        // Rafraîchir les données pour refléter la suppression
        if (onRefresh) {
          onRefresh();
        }
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        toast.error('Erreur lors de la suppression de l\'administrateur');
        return;
      }
    } else {
      // Si pas d'ID, juste retirer de l'interface
      setEditingOrgWithAdmins(prev => prev ? {
        ...prev,
        administrators: prev.administrators.filter((_, i) => i !== index)
      } : prev);
      toast.success('Administrateur retiré');
    }
    
    // Fermer la dialog
    setDeleteDialogOpen(false);
    setAdminToDelete(null);
  };

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
      
      // Les suppressions sont maintenant gérées immédiatement, plus besoin de cette logique

      // Sauvegarder les administrateurs valides
      for (const admin of validAdmins) {
        try {
          if (admin.id) {
            // Mettre à jour l'administrateur existant
            await administratorsService.update(admin.id, {
              name: admin.name,
              email: admin.email,
              phone: admin.phone || '',
              position: admin.position || '',
              role: admin.role
            });
          } else {
            // Créer un nouvel administrateur
            if (organization) {
              await administratorsService.create({
                name: admin.name,
                email: admin.email,
                phone: admin.phone || '',
                position: admin.position || '',
                role: admin.role,
                organization_id: organization.id
              });
            }
          }
        } catch (error) {
          console.error('Erreur lors de la sauvegarde de l\'administrateur:', admin.name, error);
          throw error; // Re-throw pour arrêter le processus
        }
      }
      
      // Plus besoin de gérer les suppressions différées
      
      console.log(`${validAdmins.length} administrateur(s) sauvegardé(s) avec succès`);
      toast.success('Modifications enregistrées avec succès');
      
      // Rafraîchir les données pour récupérer les IDs des nouveaux administrateurs
      if (onRefresh) {
        onRefresh();
      }
      
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
                  placeholder="Ex: Quartier Almamya, Commune de Kaloum, Conakry, Guinée"
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
          {editingOrgWithAdmins.administrators.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Aucun administrateur configuré</p>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingOrgWithAdmins(prev => prev ? {
                    ...prev,
                    administrators: [{ 
                      id: '', name: '', email: '', phone: '', position: '', 
                      role: 'org-level' as const, organizationId: organization.id, 
                      createdAt: '', updatedAt: '' 
                    }]
                  } : prev);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter le premier administrateur
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {editingOrgWithAdmins.administrators.map((admin, index) => (
              <div key={admin.id || index} className="p-3 border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Administrateur {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAdminToDelete({
                        index,
                        admin: editingOrgWithAdmins.administrators[index]
                      });
                      setDeleteDialogOpen(true);
                    }}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
                      placeholder="Ex: Directeur général"
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
                      placeholder="nom@example.com"
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
                      placeholder="+224 622 123 456"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bouton de sauvegarde global */}
      <div className="flex justify-end">
        <Button onClick={handleSaveOrganization} disabled={loading || saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Enregistrement...' : 'Enregistrer toutes les modifications'}
        </Button>
      </div>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Supprimer l'administrateur</DialogTitle>
            <DialogDescription>
              Cette action supprimera l'administrateur suivant de l'organisation. Veuillez confirmer votre choix.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Nom :</span>
                  <span className="text-sm">{adminToDelete?.admin.name || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Poste :</span>
                  <span className="text-sm">{adminToDelete?.admin.position || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Email :</span>
                  <span className="text-sm">{adminToDelete?.admin.email || 'Non renseigné'}</span>
                </div>
              </div>
            </div>
            
            {adminToDelete?.admin.id && (
              <div className="mt-4">
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-destructive">
                        Action irréversible
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Cette action supprimera définitivement l'administrateur de la base de données et ne peut pas être annulée.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setAdminToDelete(null);
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAdmin}
              disabled={saving}
            >
              {saving ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPanel;