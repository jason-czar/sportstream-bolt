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
  console.log('Creating Telegram channel for:', eventName, eventCode);
  
  // Use your actual channel @channelAIapp for all events
  const channelUsername = 'channelAIapp';
  const channelId = `@${channelUsername}`;
  
  // Verify the bot has access to the channel
  try {
    const chatInfo = await makeRequest('getChat', {
      chat_id: channelId
    });
    
    if (!chatInfo.ok) {
      throw new Error(`Failed to access channel ${channelId}: ${chatInfo.description}`);
    }
    
    console.log('Successfully verified access to channel:', channelId);
    
    const channelData = {
      channelId: channelId,
      channelUsername: channelUsername,
      inviteLink: `https://t.me/${channelUsername}`
    };
    
    console.log('Telegram channel configured:', channelData);
    return channelData;
  } catch (error) {
    console.error('Error accessing Telegram channel:', error);
    throw new Error(`Cannot access Telegram channel @${channelUsername}. Make sure the bot is added as admin to the channel.`);
  }
}

async function startLiveStream(channelId: string, eventName: string): Promise<any> {
  console.log('Starting live stream announcement for channel:', channelId, eventName);
  
  const message = `🔴 LIVE NOW: ${eventName}\n\nThe event is now streaming live! Join us now.`;
  
  try {
    const response = await makeRequest('sendMessage', {
      chat_id: channelId,
      text: message,
      parse_mode: 'HTML'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send live stream message: ${response.description}`);
    }
    
    return {
      success: true,
      message: `Live stream announcement sent for ${eventName}`,
      streamUrl: `https://t.me/${channelId.replace('@', '')}`
    };
  } catch (error) {
    console.error('Error starting live stream announcement:', error);
    throw error;
  }
}

async function sendEventNotification(channelId: string, eventName: string, eventCode: string): Promise<void> {
  console.log('Sending notification to channel:', channelId, eventName, eventCode);
  
  const message = `🎬 <b>${eventName}</b> is about to start!\n\n📋 Event Code: <code>${eventCode}</code>\n\nGet ready for the live stream!`;
  
  try {
    const response = await makeRequest('sendMessage', {
      chat_id: channelId,
      text: message,
      parse_mode: 'HTML'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send notification: ${response.description}`);
    }
    
    console.log(`Notification sent successfully: ${eventName} (${eventCode})`);
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
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
        try {
          const botInfo = await makeRequest('getMe');
          if (!botInfo.ok) {
            throw new Error(`Failed to get bot info: ${botInfo.description}`);
          }
          result = botInfo.result;
        } catch (error) {
          console.error('Error getting bot info:', error);
          throw error;
        }
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