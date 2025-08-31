import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/serverSupabase';

export async function GET() {
  try {
    console.log('API projects: Starting request');
    const supabase = getServiceSupabase();
    
    console.log('API projects: Making database query');
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('API projects: Database error:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des projets' }, { status: 500 });
    }

    console.log(`API projects: Found ${projects?.length || 0} projects`);
    return NextResponse.json(projects || []);
    
  } catch (error) {
    console.error('Error in projects API:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}