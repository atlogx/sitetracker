import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { projectsService, monthlyProgressService } from '@/lib/supabase';
import { mapMonthlyTracking, mapProject } from '@/lib/domainMapping';
import type { MonthlyProgress } from '@/types/models';

import ProjectClientWrapper from '@/components/projects/ProjectClientWrapper';
import { generateSlug } from '@/lib/utils';

interface SiteData {
  id: string;
  name: string;
}

/**
 * /projects/[slug]
 * Server component:
 *  - Handles both slug and UUID formats for backward compatibility
 *  - Fetches project + sites + monthly tracking
 *  - Maps to domain
 *  - Supports query params: ?site=[slug_site] and ?theme=[dark|light]
 */

/**
 * /projects/[slug]
 * Server component:
 *  - Handles both slug and UUID formats for backward compatibility
 *  - Fetches project + sites + monthly tracking
 *  - Maps to domain
 *  - Passes data to client interactive region
 *  - Supports query params: ?site=[slug_site] and ?theme=[dark|light]
 *
 * UI text in French. Code & identifiers in English.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ site?: string; theme?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const awaitedParams = await params;
  const { slug } = awaitedParams;
  const awaitedSearchParams = await searchParams;

  // Check if this is a UUID (legacy format)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  let projectRow;

  if (isUuid) {
    // Legacy UUID - fetch by ID and redirect to slug URL
    try {
      projectRow = await projectsService.getById(slug);
      if (!projectRow) {
        notFound();
      }

      // Generate slug and redirect
      const projectSlug = generateSlug(projectRow.name);
      let redirectUrl = `/site-tracker/projects/${projectSlug}`;

      // Preserve query parameters
      const queryParams = new URLSearchParams();
      if (awaitedSearchParams.site) {
        // Try to convert site ID to slug if possible
        const site = projectRow.sites?.find((s: SiteData) => s.id === awaitedSearchParams.site);
        if (site) {
          queryParams.set('site', generateSlug(site.name));
        } else {
          queryParams.set('site', awaitedSearchParams.site);
        }
      }
      if (awaitedSearchParams.theme) {
        queryParams.set('theme', awaitedSearchParams.theme);
      }

      if (queryParams.toString()) {
        redirectUrl += `?${queryParams.toString()}`;
      }

      redirect(redirectUrl);
    } catch (error) {
      console.error('Project not found by UUID:', slug, error);
      notFound();
    }
  } else {
    // Modern slug format - fetch by slug
    try {
      projectRow = await projectsService.getBySlug(slug);
    } catch (error) {
      console.error('Project not found by slug:', slug, error);
      notFound();
    }
  }

  if (!projectRow) {
    console.error('Project not found:', slug);
    notFound();
  }

  const project = mapProject(projectRow);



  // Determine which site to show (from URL slug or default to first if exists)
  let dashboardSiteId = project.sites.length > 0 ? project.sites[0].id : '';

  if (awaitedSearchParams.site) {
    // Try to find site by slug first
    let requestedSite = project.sites.find(s => generateSlug(s.name) === awaitedSearchParams.site);

    // If not found by slug, try by ID (backward compatibility)
    if (!requestedSite) {
      requestedSite = project.sites.find(s => s.id === awaitedSearchParams.site);
    }

    if (requestedSite) {
      dashboardSiteId = requestedSite.id;
    }
  }

  // Fetch all monthly tracking for all sites
  const allSiteIds = project.sites.map(s => s.id);
  const allMonthly: Record<string, MonthlyProgress[]> = {};

  try {
    // Get monthly progress for each site
    const monthlyPromises = allSiteIds.map(async (siteId) => {
      const data = await monthlyProgressService.getBySite(siteId);
      return { siteId, data: data.map(mapMonthlyTracking) };
    });

    const results = await Promise.all(monthlyPromises);
    results.forEach(({ siteId, data }) => {
      allMonthly[siteId] = data;
    });
  } catch (error) {
    console.error('Error fetching monthly progress:', error);
    // Continue with empty data
  }

  return (
      <div className="space-y-6">
        {/* Interactive Client Component */}
        <ProjectClientWrapper
          project={project}
          dashboardSiteId={dashboardSiteId}
          allMonthly={allMonthly}
        />
      </div>
  );
}
