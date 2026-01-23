import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type LiveEvent = 
  | { type: "hello" | "heartbeat"; serverTime: string }
  | { type: "request.created" | "request.updated" | "request.closed" | "recommendation.created"; requestId: string; serverTime: string; payload: any };

type Client = {
  id: string;
  controller: ReadableStreamDefaultController;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  role?: "requester" | "recommender" | "both";
  notify?: boolean;
};

const clients = new Map<string, Client>();

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

function withinRadiusKm(a: {lat:number,lng:number}, b:{lat:number,lng:number}, r=15) {
  const toRad = (d:number) => d * Math.PI / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat/2)**2 + 
           Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng/2)**2;
  return (2 * R * Math.asin(Math.sqrt(s))) <= r;
}

function sendEvent(controller: ReadableStreamDefaultController, event: LiveEvent) {
  try {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    controller.enqueue(new TextEncoder().encode(data));
  } catch (error) {
    console.error('Error sending event:', error);
  }
}

function eligible(client: Client, payload: any) {
  if (!client.notify) return false;
  if (!(client.role === "recommender" || client.role === "both")) return false;
  if (!client.lat || !client.lng || isNaN(client.lat) || isNaN(client.lng)) return false;
  if (!payload.lat || !payload.lng) return false;
  
  return withinRadiusKm(
    {lat: client.lat, lng: client.lng}, 
    {lat: payload.lat, lng: payload.lng}, 
    client.radiusKm ?? 15
  );
}

export function broadcastRequestCreated(payload: any) {
  const event: LiveEvent = { 
    type: "request.created", 
    requestId: payload.requestId, 
    serverTime: new Date().toISOString(), 
    payload 
  };
  
  for (const client of clients.values()) {
    if (eligible(client, payload)) {
      sendEvent(client.controller, event);
    }
  }
}

export function broadcastRequestUpdated(requestId: string, partial: any) {
  const event: LiveEvent = { 
    type: "request.updated", 
    requestId, 
    serverTime: new Date().toISOString(), 
    payload: partial 
  };
  
  for (const client of clients.values()) {
    sendEvent(client.controller, event);
  }
}

export function broadcastRecommendationCreated(requestId: string, count: number) {
  const event: LiveEvent = { 
    type: "recommendation.created", 
    requestId, 
    serverTime: new Date().toISOString(), 
    payload: { count } 
  };
  
  for (const client of clients.values()) {
    sendEvent(client.controller, event);
  }
}

export function broadcastRequestClosed(requestId: string, reason: "expired" | "reached_cap") {
  const event: LiveEvent = { 
    type: "request.closed", 
    requestId, 
    serverTime: new Date().toISOString(), 
    payload: { reason } 
  };
  
  for (const client of clients.values()) {
    sendEvent(client.controller, event);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { headers, url } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // For SSE, we don't need websocket upgrade
  if (upgradeHeader.toLowerCase() === "websocket") {
    return new Response("WebSocket not supported for this endpoint", { status: 400 });
  }

  const urlObj = new URL(url);
  const lat = parseFloat(urlObj.searchParams.get('lat') || '0');
  const lng = parseFloat(urlObj.searchParams.get('lng') || '0');
  const radiusKm = parseFloat(urlObj.searchParams.get('radiusKm') || '15');
  const userId = urlObj.searchParams.get('userId') || 'anonymous';

  // Verify JWT token
  const authHeader = headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      const client: Client = { 
        id: user.id, 
        controller, 
        lat, 
        lng, 
        radiusKm, 
        role: "both", 
        notify: true 
      };
      
      clients.set(user.id, client);
      
      // Send hello message
      sendEvent(controller, { 
        type: "hello", 
        serverTime: new Date().toISOString() 
      });

      // Send heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          sendEvent(controller, { 
            type: "heartbeat", 
            serverTime: new Date().toISOString() 
          });
        } catch (error) {
          clearInterval(heartbeatInterval);
          clients.delete(user.id);
        }
      }, 30000);

      // Clean up on connection close
      controller.enqueue = new Proxy(controller.enqueue, {
        apply(target, thisArg, args: [chunk?: unknown]) {
          try {
            return target.apply(thisArg, args);
          } catch (error) {
            clearInterval(heartbeatInterval);
            clients.delete(user.id);
            throw error;
          }
        }
      });
    },
    
    cancel() {
      clients.delete(user.id);
    }
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
});