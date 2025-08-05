import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
}

async function makeRequest(method: string, params: any = {}): Promise<TelegramResponse> {
  const url = `${TELEGRAM_API_URL}/${method}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  return await response.json();
}

async function createEventChannel(eventName: string, eventCode: string): Promise<any> {
  // For demo purposes, create a mock Telegram channel response
  // In a real implementation, this would use the actual Telegram Bot API
  console.log('Creating Telegram channel for:', eventName, eventCode);
  
  // Mock channel data - in production this would come from actual Telegram API
  const mockChannelData = {
    channelId: `@sportscast_${eventCode.toLowerCase()}`,
    channelUsername: `sportscast_${eventCode.toLowerCase()}`,
    inviteLink: `https://t.me/sportscast_${eventCode.toLowerCase()}`
  };
  
  console.log('Mock Telegram channel created:', mockChannelData);
  return mockChannelData;
}

async function startLiveStream(channelId: string, eventName: string): Promise<any> {
  // Mock live stream start for demo purposes
  console.log('Starting live stream for channel:', channelId, eventName);
  
  return {
    success: true,
    message: `Live stream started for ${eventName}`,
    streamUrl: `https://t.me/${channelId.replace('@', '')}`
  };
}

async function sendEventNotification(channelId: string, eventName: string, eventCode: string): Promise<void> {
  // Mock notification sending for demo purposes
  console.log('Sending notification to channel:', channelId, eventName, eventCode);
  
  // In a real implementation, this would send an actual Telegram message
  console.log(`Notification sent: 🎬 ${eventName} is about to start! Event Code: ${eventCode}`);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Telegram bot function called');
    
    const { action, eventName, eventCode, channelId } = await req.json();
    console.log('Action requested:', action, { eventName, eventCode, channelId });

    let result;

    switch (action) {
      case 'createChannel':
        if (!eventName || !eventCode) {
          throw new Error('eventName and eventCode are required for createChannel');
        }
        result = await createEventChannel(eventName, eventCode);
        break;
        
      case 'startStream':
        if (!channelId || !eventName) {
          throw new Error('channelId and eventName are required for startStream');
        }
        result = await startLiveStream(channelId, eventName);
        break;
        
      case 'sendNotification':
        if (!channelId || !eventName || !eventCode) {
          throw new Error('channelId, eventName, and eventCode are required for sendNotification');
        }
        await sendEventNotification(channelId, eventName, eventCode);
        result = { success: true };
        break;
        
      case 'getBotInfo':
        // Mock bot info for demo
        result = { 
          id: 'demo_bot', 
          username: 'sportscast_bot', 
          first_name: 'Sportscast Bot',
          is_bot: true 
        };
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('Action completed successfully:', result);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in telegram-bot function:', error);
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