'use client';

import React from 'react';
import type {
  Project,
  MonthlyProgress
} from '@/types/models';
import { monthlyProgressService } from '@/lib/supabase';
import ProjectInteractiveClient from '@/components/projects/ProjectInteractiveClient';

interface ProjectClientWrapperProps {
  project: Project;
  dashboardSiteId: string;
  allMonthly: Record<string, MonthlyProgress[]>;
}

export default function ProjectClientWrapper({
  project,
  dashboardSiteId,
  allMonthly
}: ProjectClientWrapperProps) {
  // Handler for data changes - saves to Supabase
  const handleUpdate = () => {
    window.location.reload();
  };

  const handleDataChange = async (siteId: string, monthData: Partial<MonthlyProgress>) => {
    try {
      // Calculate status automatically based on monthly progress
      let calculatedStatus = monthData.status;
      if (monthData.monthlyProgress !== undefined) {
        if (monthData.monthlyProgress < 30) {
          calculatedStatus = 'critical';
        } else if (monthData.monthlyProgress < 50) {
          calculatedStatus = 'problematic';
        } else {
          calculatedStatus = 'good';
        }
      } else if (!calculatedStatus) {
        calculatedStatus = 'critical'; // Default to critical if no status provided
      }
      
      // Convert domain model to database format
      const dbData = {
        site_id: siteId,
        month: monthData.month!,
        total_progress: monthData.totalProgress,
        target_rate: monthData.targetRate,
        normal_rate: monthData.normalRate,
        delay_rate: monthData.delayRate,
        observations: monthData.observations
      };

      // Use upsert to create or update
      await monthlyProgressService.upsert(dbData);
    } catch (error) {
      throw error; // Re-throw so the component can handle it
    }
  };

  return (
    <ProjectInteractiveClient
      project={project}
      dashboardSiteId={dashboardSiteId}
      allMonthly={allMonthly}
      onUpdate={handleUpdate}
      onDataChange={handleDataChange}
    />
  );
}