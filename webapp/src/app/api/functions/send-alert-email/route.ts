import { getServiceSupabase } from '@/lib/serverSupabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    
    const payload = await request.json();
    
    // Validate required fields
    if (!payload.alert_id || !payload.type || !payload.message || !payload.recipients?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-alert-email', {
      body: payload
    });

    if (error) {
      console.error('Edge Function error:', error);
      return NextResponse.json({ 
        error: 'Failed to send email',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json(data);
    
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}