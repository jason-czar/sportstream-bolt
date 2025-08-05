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
    const { name, sport, startTime, expectedDuration, eventCode, youtubeKey, twitchKey } = await req.json();

    // Initialize Mux client
    const muxTokenId = Deno.env.get('MUX_TOKEN_ID');
    const muxSecretKey = Deno.env.get('MUX_SECRET_KEY');
    
    if (!muxTokenId || !muxSecretKey) {
      throw new Error('Mux credentials not configured');
    }

    // Create Mux Live Stream
    const auth = btoa(`${muxTokenId}:${muxSecretKey}`);
    const muxResponse = await fetch('https://api.mux.com/video/v1/live-streams', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playback_policy: ['public'],
        new_asset_settings: { 
          playback_policy: ['public'] 
        },
        reconnect_window: 60,
        reduced_latency: true
      })
    });

    if (!muxResponse.ok) {
      const error = await muxResponse.text();
      console.error('Mux API Error:', error);
      throw new Error('Failed to create Mux live stream');
    }

    const muxData = await muxResponse.json();
    console.log('Mux stream created:', muxData.data.id);

    // Create Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Insert event into database
    const { data: eventData, error: dbError } = await supabase
      .from('events')
      .insert({
        name,
        sport,
        start_time: startTime,
        expected_duration: expectedDuration,
        event_code: eventCode,
        mux_stream_id: muxData.data.id,
        program_url: muxData.data.playback_ids[0]?.url || null,
        youtube_key: youtubeKey || null,
        twitch_key: twitchKey || null,
        status: 'created'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to create event in database');
    }

    console.log('Event created successfully:', eventData.id);

    return new Response(
      JSON.stringify({
        success: true,
        eventId: eventData.id,
        eventCode,
        streamId: muxData.data.id,
        programUrl: muxData.data.playback_ids[0]?.url
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in create-event function:', error);
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