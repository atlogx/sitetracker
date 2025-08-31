import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/serverSupabase';

export async function GET(request: NextRequest) {
  try {
    console.log('API sites: Starting request');
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      console.log('API sites: Missing project ID');
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    console.log(`API sites: Fetching sites for project ${projectId}`);
    const supabase = getServiceSupabase();
    
    const { data: sites, error } = await supabase
      .from('sites')
      .select('id, name, address')
      .eq('project_id', projectId)
      .order('name');

    if (error) {
      console.error('API sites: Database error:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des sites' }, { status: 500 });
    }

    console.log(`API sites: Found ${sites?.length || 0} sites`);
    return NextResponse.json(sites || []);
    
  } catch (error) {
    console.error('Error in sites API:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}