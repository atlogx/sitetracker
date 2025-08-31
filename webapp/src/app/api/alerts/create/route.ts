import { NextRequest, NextResponse } from 'next/server';
import { alertService } from '@/lib/alerts/alertService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { projectId, siteId, type, customMessage } = body;
    
    // Validation des paramètres requis
    if (!projectId || !type) {
      return NextResponse.json({ 
        error: 'Les champs projet et type sont requis' 
      }, { status: 400 });
    }

    // Validation du type d'alerte
    const validTypes = ['data_entry_delay', 'problematic', 'critical', 'pre_demobilization', 'demobilization'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ 
        error: 'Type d\'alerte invalide' 
      }, { status: 400 });
    }

    // Créer l'alerte
    const result = await alertService.createManualAlert({
      projectId,
      siteId: siteId || null,
      type,
      customMessage
    });

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Erreur lors de la création de l\'alerte' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      alertId: result.alertId,
      message: 'Alerte créée avec succès'
    });
    
  } catch (error) {
    console.error('Error in create alert API:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur' 
    }, { status: 500 });
  }
}