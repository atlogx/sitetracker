'use client';

import React, { useState, useEffect } from 'react';
import type { Administrator, UpsertAdministratorInput } from '@/types/models';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Save, Users, Edit2, UserPlus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  const [editingAdmin, setEditingAdmin] = useState<string | null>(null);
  const [adminForms, setAdminForms] = useState<Record<string, AdministratorFormData>>({});
  const [newAdminForm, setNewAdminForm] = useState<AdministratorFormData>({
    name: '',
    email: '',
    phone: '',
    position: ''
  });
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

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
    <div className="space-y-4">
      {!hideTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Administrateurs</h3>
            <Badge variant="secondary" className="ml-2">
              {administrators.length}
            </Badge>
          </div>
          <Button
            onClick={() => setIsAddingAdmin(true)}
            disabled={isAddingAdmin || loading}
            size="sm"
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      )}

      {isAddingAdmin && (
        <Card className="border-dashed border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nouvel administrateur</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAddingAdmin(false);
                  setNewAdminForm({ name: '', email: '', phone: '', position: '' });
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <form onSubmit={handleAddAdministrator} className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-position">Poste</Label>
                  <Input
                    id="new-position"
                    value={newAdminForm.position}
                    onChange={(e) => setNewAdminForm(prev => ({ ...prev, position: e.target.value }))}
                    placeholder="Directeur de projet"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-name">Nom</Label>
                  <Input
                    id="new-name"
                    value={newAdminForm.name}
                    onChange={(e) => setNewAdminForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Jean Dupont"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newAdminForm.email}
                    onChange={(e) => setNewAdminForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="jean@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-phone">Téléphone</Label>
                  <Input
                    id="new-phone"
                    type="tel"
                    value={newAdminForm.phone}
                    onChange={(e) => setNewAdminForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+224 622 123 456"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" size="sm" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
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

      {administrators.length === 0 && !hideEmptyState ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-6 px-3">
            <Users className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              Aucun administrateur assigné à ce projet
            </p>
            <Button
              onClick={() => setIsAddingAdmin(true)}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter le premier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {administrators.map((admin) => (
            <Card key={admin.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3">
                {editingAdmin === admin.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Poste</Label>
                        <Input
                          value={adminForms[admin.id]?.position || ''}
                          onChange={(e) => updateAdminForm(admin.id, 'position', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nom</Label>
                        <Input
                          value={adminForms[admin.id]?.name || ''}
                          onChange={(e) => updateAdminForm(admin.id, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={adminForms[admin.id]?.email || ''}
                          onChange={(e) => updateAdminForm(admin.id, 'email', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Téléphone</Label>
                        <Input
                          type="tel"
                          value={adminForms[admin.id]?.phone || ''}
                          onChange={(e) => updateAdminForm(admin.id, 'phone', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-3">
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
                  <div className="flex items-center justify-between">
                    <div className="grid grid-cols-2 gap-6 flex-1">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {admin.position || 'Administrateur'}
                          </Badge>
                        </div>
                        <p className="font-medium">{admin.name}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{admin.email}</p>
                        {admin.phone && (
                          <p className="text-sm text-muted-foreground">{admin.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingAdmin(admin.id)}
                        disabled={loading}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={loading}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer l'administrateur</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer <strong>{admin.name}</strong> ?
                              Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveAdministrator(admin.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectAdministratorsManager;