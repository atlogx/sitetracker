import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/serverSupabase';

export async function POST() {
  try {
    const supabase = getServiceSupabase();
    
    // Créer une alerte de test simple
    const { data, error } = await supabase
      .from('alerts')
      .insert({
        type: 'data_entry_delay',
        title: 'Test Alert - Generation',
        message: 'Alerte de test générée automatiquement.',
        project_id: (await supabase.from('projects').select('id').eq('is_active', true).limit(1).single())?.data?.id || '00000000-0000-0000-0000-000000000000',
        recipients: ['admin@test.com']
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating test alert:', error);
      return NextResponse.json({ 
        error: 'Erreur lors de la création de l\'alerte de test',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Alerte de test créée avec succès',
      alertId: data?.id
    });
    
  } catch (error) {
    console.error('Error generating test alert:', error);
    return NextResponse.json({ 
      error: 'Erreur interne',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    return NextResponse.json({ 
      success: true, 
      message: 'API accessible' 
    });
    
  } catch (error) {
    console.error('Error in GET:', error);
    return NextResponse.json({ 
      error: 'Erreur interne'
    }, { status: 500 });
  }
}