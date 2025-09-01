'use client';

import React, { useState, useEffect } from 'react';
import type { Administrator, UpsertAdministratorInput } from '@/types/models';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Save, Users, Mail, Phone, Edit2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProjectAdministratorsManagerProps {
  projectId: string;
  projectName: string;
  administrators: Administrator[];
  onAddAdministrator?: (admin: UpsertAdministratorInput) => Promise<void> | void;
  onUpdateAdministrator?: (id: string, patch: Partial<UpsertAdministratorInput>) => Promise<void> | void;
  onRemoveAdministrator?: (id: string) => Promise<void> | void;
  loading?: boolean;
  hideTitle?: boolean;
  hideEmptyState?: boolean;

}

interface AdministratorFormData {
  name: string;
  email: string;
  phone: string;
  position: string;
}

const ProjectAdministratorsManager: React.FC<ProjectAdministratorsManagerProps> = ({
  projectName,
  administrators,
  onAddAdministrator,
  onUpdateAdministrator,
  onRemoveAdministrator,
  loading = false,
  hideTitle = false,
  hideEmptyState = false
}) => {
  // États pour les administrateurs
  const [editingAdmin, setEditingAdmin] = useState<string | null>(null);
  const [adminForms, setAdminForms] = useState<Record<string, AdministratorFormData>>({});
  const [newAdminForm, setNewAdminForm] = useState<AdministratorFormData>({
    name: '',
    email: '',
    phone: '',
    position: ''
  });
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

  // Initialiser les formulaires d'édition des administrateurs
  useEffect(() => {
    const forms: Record<string, AdministratorFormData> = {};
    administrators.forEach(admin => {
      forms[admin.id] = {
        name: admin.name,
        email: admin.email,
        phone: admin.phone || '',
        position: admin.position || ''
      };
    });
    setAdminForms(forms);
  }, [administrators]);

  const handleAddAdministrator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddAdministrator) {
      await onAddAdministrator({
        ...newAdminForm,
        role: 'project-level'
      });
      setNewAdminForm({ name: '', email: '', phone: '', position: '' });
      setIsAddingAdmin(false);
    }
  };

  const handleUpdateAdministrator = async (adminId: string) => {
    if (onUpdateAdministrator && adminForms[adminId]) {
      await onUpdateAdministrator(adminId, adminForms[adminId]);
      setEditingAdmin(null);
    }
  };

  const handleRemoveAdministrator = async (adminId: string) => {
    if (onRemoveAdministrator) {
      await onRemoveAdministrator(adminId);
    }
  };

  const updateAdminForm = (adminId: string, field: keyof AdministratorFormData, value: string) => {
    setAdminForms(prev => ({
      ...prev,
      [adminId]: {
        ...prev[adminId],
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* En-tête conditionnel */}
      {!hideTitle && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Administrateurs du projet</h2>
            <p className="text-muted-foreground">
              Gérez les administrateurs responsables du projet &quot;{projectName}&quot;
            </p>
          </div>
        </div>
      )}
      
      {/* Bouton d'ajout - seulement si pas de render custom */}
      {!hideTitle && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingAdmin(true)}
            disabled={isAddingAdmin || loading}
            className="bg-primary/5 hover:bg-primary/10 border-primary/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un administrateur
          </Button>
        </div>
      )}

      {/* Formulaire d'ajout */}
      {isAddingAdmin && (
        <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Nouvel administrateur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAdministrator} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-admin-position">Titre/Poste *</Label>
                  <Input
                    id="new-admin-position"
                    value={newAdminForm.position}
                    onChange={(e) => setNewAdminForm(prev => ({ ...prev, position: e.target.value }))}
                    placeholder="ex: Directeur de projet, Chef de mission..."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new-admin-name">Nom complet *</Label>
                  <Input
                    id="new-admin-name"
                    value={newAdminForm.name}
                    onChange={(e) => setNewAdminForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nom et prénom"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new-admin-email">Email *</Label>
                  <Input
                    id="new-admin-email"
                    type="email"
                    value={newAdminForm.email}
                    onChange={(e) => setNewAdminForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="nom@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new-admin-phone">Téléphone</Label>
                  <Input
                    id="new-admin-phone"
                    type="tel"
                    value={newAdminForm.phone}
                    onChange={(e) => setNewAdminForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+224 622 123 456"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingAdmin(false);
                    setNewAdminForm({ name: '', email: '', phone: '', position: '' });
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Liste des administrateurs existants */}
      {administrators.length === 0 && !hideEmptyState ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-muted rounded-lg bg-muted/20">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <div>
            <h3 className="text-lg font-medium text-foreground">Aucun administrateur</h3>
            <p className="text-muted-foreground">
              Ajoutez des administrateurs pour ce projet
            </p>
          </div>
        </div>
      ) : administrators.length > 0 ? (
        <div className="space-y-3">
          {administrators.map((admin) => (
            <Card key={admin.id} className="transition-all hover:shadow-md border-l-4 border-l-primary/30">
              <CardContent className="p-5">
                {editingAdmin === admin.id ? (
                  // Mode édition
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label>Titre/Poste</Label>
                        <Input
                          value={adminForms[admin.id]?.position || ''}
                          onChange={(e) => updateAdminForm(admin.id, 'position', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Nom complet</Label>
                        <Input
                          value={adminForms[admin.id]?.name || ''}
                          onChange={(e) => updateAdminForm(admin.id, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={adminForms[admin.id]?.email || ''}
                          onChange={(e) => updateAdminForm(admin.id, 'email', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Téléphone</Label>
                        <Input
                          type="tel"
                          value={adminForms[admin.id]?.phone || ''}
                          onChange={(e) => updateAdminForm(admin.id, 'phone', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateAdministrator(admin.id)}
                        disabled={loading}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Enregistrer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingAdmin(null)}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Mode affichage
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {admin.position || 'Administrateur'}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-base">{admin.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{admin.email}</span>
                          </div>
                          {admin.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{admin.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingAdmin(admin.id)}
                        disabled={loading}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAdministrator(admin.id)}
                        disabled={loading}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default ProjectAdministratorsManager;