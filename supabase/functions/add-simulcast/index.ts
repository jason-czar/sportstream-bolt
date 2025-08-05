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
    console.log('Add simulcast function called');
    const { eventId } = await req.json();
    console.log('Event ID received:', eventId);

    // Create Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get event data with stream keys
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('mux_stream_id, youtube_key, twitch_key, status')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      throw new Error('Event not found');
    }

    if (eventData.status === 'live') {
      throw new Error('Cannot add simulcast targets while stream is live');
    }

    // Initialize Mux client
    const muxTokenId = Deno.env.get('MUX_TOKEN_ID');
    const muxSecretKey = Deno.env.get('MUX_SECRET_KEY');
    
    if (!muxTokenId || !muxSecretKey) {
      throw new Error('Mux credentials not configured');
    }

    const auth = btoa(`${muxTokenId}:${muxSecretKey}`);
    const simulcastTargets = [];

    // Add YouTube simulcast target if key provided
    if (eventData.youtube_key) {
      simulcastTargets.push({
        url: "rtmp://a.rtmp.youtube.com/live2",
        stream_key: eventData.youtube_key
      });
    }

    // Add Twitch simulcast target if key provided
    if (eventData.twitch_key) {
      simulcastTargets.push({
        url: "rtmp://live.twitch.tv/app",
        stream_key: eventData.twitch_key
      });
    }

    if (simulcastTargets.length === 0) {
      throw new Error('No simulcast keys provided');
    }

    // Add simulcast targets to Mux
    for (const target of simulcastTargets) {
      const muxResponse = await fetch(
        `https://api.mux.com/video/v1/live-streams/${eventData.mux_stream_id}/simulcast-targets`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(target)
        }
      );

      if (!muxResponse.ok) {
        const error = await muxResponse.text();
        console.error('Mux Simulcast Error:', error);
        throw new Error(`Failed to add simulcast target: ${target.url}`);
      }

      console.log('Added simulcast target:', target.url);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Added ${simulcastTargets.length} simulcast target(s)`,
        targets: simulcastTargets.map(t => t.url)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in add-simulcast function:', error);
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