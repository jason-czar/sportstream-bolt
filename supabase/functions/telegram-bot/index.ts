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
  // Create a new channel for the event
  const createChannelResult = await makeRequest('createChannel', {
    title: `🏆 ${eventName}`,
    description: `Live sports streaming for ${eventName}\nEvent Code: ${eventCode}\n\nJoin to watch the live stream and interact with other viewers!`,
    type: 'channel'
  });

  if (!createChannelResult.ok) {
    throw new Error(`Failed to create channel: ${createChannelResult.description}`);
  }

  const channelId = createChannelResult.result.id;
  
  // Set channel photo (optional - using a generic sports photo)
  try {
    await makeRequest('setChatPhoto', {
      chat_id: channelId,
      photo: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=400&fit=crop'
    });
  } catch (error) {
    console.log('Could not set channel photo:', error);
  }

  return {
    channelId,
    channelUsername: createChannelResult.result.username,
    inviteLink: createChannelResult.result.invite_link
  };
}

async function startLiveStream(channelId: string, eventName: string): Promise<any> {
  // Start a live video chat in the channel
  const liveStreamResult = await makeRequest('createChatInviteLink', {
    chat_id: channelId,
    name: `Live Stream: ${eventName}`,
    creates_join_request: false
  });

  if (!liveStreamResult.ok) {
    throw new Error(`Failed to create live stream: ${liveStreamResult.description}`);
  }

  return liveStreamResult.result;
}

async function sendEventNotification(channelId: string, eventName: string, eventCode: string): Promise<void> {
  const message = `🎬 **${eventName}** is about to start!\n\n` +
    `📱 Event Code: \`${eventCode}\`\n` +
    `🎥 Live streaming will begin shortly\n` +
    `💬 Use this channel to chat and interact during the event\n\n` +
    `Get ready for an amazing sports experience! 🏆`;

  await makeRequest('sendMessage', {
    chat_id: channelId,
    text: message,
    parse_mode: 'Markdown'
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('Telegram Bot Token not configured');
    }

    const { action, eventName, eventCode, channelId } = await req.json();

    let result;

    switch (action) {
      case 'createChannel':
        result = await createEventChannel(eventName, eventCode);
        break;
        
      case 'startStream':
        result = await startLiveStream(channelId, eventName);
        break;
        
      case 'sendNotification':
        await sendEventNotification(channelId, eventName, eventCode);
        result = { success: true };
        break;
        
      case 'getBotInfo':
        const botInfo = await makeRequest('getMe');
        result = botInfo.result;
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

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