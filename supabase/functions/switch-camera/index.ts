import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId, cameraId } = await req.json();

    // Create Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Log the camera switch
    const { error: logError } = await supabase
      .from('switch_logs')
      .insert({
        event_id: eventId,
        camera_id: cameraId,
        timestamp: new Date().toISOString()
      });

    if (logError) {
      console.error('Failed to log camera switch:', logError);
    }

    // Get event and camera data for WebSocket broadcast
    const { data: eventData } = await supabase
      .from('events')
      .select('program_url')
      .eq('id', eventId)
      .single();

    const { data: cameraData } = await supabase
      .from('cameras')
      .select('device_label, stream_key')
      .eq('id', cameraId)
      .single();

    // In a real implementation, you would broadcast this via WebSocket
    // For now, we'll just log the switch
    console.log('Camera switched:', {
      eventId,
      cameraId,
      cameraLabel: cameraData?.device_label,
      programUrl: eventData?.program_url
    });

    // Simulate program feed update
    // In production, this would trigger Mux stream composition changes
    const programUpdate = {
      eventId,
      activeCameraId: cameraId,
      activeCameraLabel: cameraData?.device_label,
      programUrl: eventData?.program_url,
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Camera switched successfully',
        programUpdate
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in switch-camera function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});