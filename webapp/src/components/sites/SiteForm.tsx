"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';


interface Project {
  id: string;
  name: string;
  code?: string;
}

interface CompanyData {
  name: string;
  address: string;
  email: string;
  phone: string;
}

interface SiteFormData {
  name: string;
  code: string;
  address: string;
  project_id: string;
  project_duration_months: string;
  start_month: string;
  company: CompanyData;
}

interface SiteFormProps {
  data: SiteFormData;
  projects: Project[];
  isSubmitting: boolean;
  isEditing?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: SiteFormData) => void;
  onCancel: () => void;
}

export function SiteForm({
  data,
  projects,
  isSubmitting,
  isEditing = false,
  onSubmit,
  onChange,
  onCancel
}: SiteFormProps) {
  const handleFieldChange = (field: keyof SiteFormData, value: string) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  const handleCompanyFieldChange = (field: keyof CompanyData, value: string) => {
    onChange({
      ...data,
      company: {
        ...data.company,
        [field]: value
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="project">Projet *</Label>
        <Select
          value={data.project_id}
          onValueChange={(value) => handleFieldChange('project_id', value)}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un projet" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
                {project.code && (
                  <span className="text-muted-foreground ml-2">({project.code})</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Nom du site *</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="Nom du site"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Code du site</Label>
          <Input
            id="code"
            value={data.code}
            onChange={(e) => handleFieldChange('code', e.target.value)}
            placeholder="Code du site (optionnel)"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Adresse *</Label>
        <Textarea
          id="address"
          value={data.address}
          onChange={(e) => handleFieldChange('address', e.target.value)}
          placeholder="Adresse complète du site"
          required
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="project_duration_months">Durée du chantier *</Label>
          {isEditing ? (
            <div className="flex items-center p-2 bg-muted/30 rounded border">
              <span className="text-sm text-muted-foreground">
                {data.project_duration_months} mois (non modifiable)
              </span>
            </div>
          ) : (
            <Input
              id="project_duration_months"
              type="number"
              min="1"
              max="120"
              value={data.project_duration_months}
              onChange={(e) => handleFieldChange('project_duration_months', e.target.value)}
              placeholder="Nombre de mois"
              required
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="start_month">Mois de début du chantier *</Label>
          {isEditing ? (
            <div className="flex items-center p-2 bg-muted/30 rounded border">
              <span className="text-sm text-muted-foreground">
                {data.start_month === '01' && 'Janvier'}
                {data.start_month === '02' && 'Février'}
                {data.start_month === '03' && 'Mars'}
                {data.start_month === '04' && 'Avril'}
                {data.start_month === '05' && 'Mai'}
                {data.start_month === '06' && 'Juin'}
                {data.start_month === '07' && 'Juillet'}
                {data.start_month === '08' && 'Août'}
                {data.start_month === '09' && 'Septembre'}
                {data.start_month === '10' && 'Octobre'}
                {data.start_month === '11' && 'Novembre'}
                {data.start_month === '12' && 'Décembre'}
                {' (non modifiable)'}
              </span>
            </div>
          ) : (
            <Select
              value={data.start_month}
              onValueChange={(value) => handleFieldChange('start_month', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un mois" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="01">Janvier</SelectItem>
                <SelectItem value="02">Février</SelectItem>
                <SelectItem value="03">Mars</SelectItem>
                <SelectItem value="04">Avril</SelectItem>
                <SelectItem value="05">Mai</SelectItem>
                <SelectItem value="06">Juin</SelectItem>
                <SelectItem value="07">Juillet</SelectItem>
                <SelectItem value="08">Août</SelectItem>
                <SelectItem value="09">Septembre</SelectItem>
                <SelectItem value="10">Octobre</SelectItem>
                <SelectItem value="11">Novembre</SelectItem>
                <SelectItem value="12">Décembre</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <hr className="my-6 border-border" />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Entreprise exécutante</h3>
          <p className="text-sm text-muted-foreground">
            Informations de l&apos;entreprise qui réalisera les travaux sur ce site
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Nom de l&apos;entreprise *</Label>
            <Input
              id="company_name"
              value={data.company.name}
              onChange={(e) => handleCompanyFieldChange('name', e.target.value)}
              placeholder="Nom de l'entreprise exécutante"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_address">Adresse de l&apos;entreprise *</Label>
            <Textarea
              id="company_address"
              value={data.company.address}
              onChange={(e) => handleCompanyFieldChange('address', e.target.value)}
              placeholder="Adresse complète de l'entreprise"
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_email">Email de l&apos;entreprise *</Label>
              <Input
                id="company_email"
                type="email"
                value={data.company.email}
                onChange={(e) => handleCompanyFieldChange('email', e.target.value)}
                placeholder="contact@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_phone">Téléphone de l&apos;entreprise *</Label>
              <Input
                id="company_phone"
                type="tel"
                value={data.company.phone}
                onChange={(e) => handleCompanyFieldChange('phone', e.target.value)}
                placeholder="+224 622 123 456"
                required
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? (isEditing ? 'Modification...' : 'Création...')
            : (isEditing ? 'Modifier' : 'Créer')
          }
        </Button>
      </div>
    </form>
  );
}
