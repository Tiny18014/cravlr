import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarkConversionRequest {
  referral_click_id: string;
  conversion_method: string;
  conversion_value?: number;
  commission_rate?: number;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get the user from the JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Verify user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check if user is admin using has_role RPC
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('❌ Non-admin user attempted to mark conversion:', user.id);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Validate request body with zod
    const markConversionSchema = z.object({
      referral_click_id: z.string().uuid('Invalid referral click ID'),
      conversion_value: z.number().min(0, 'Value must be positive').max(100000, 'Value too large').optional(),
      commission_rate: z.number().min(0, 'Rate must be positive').max(1, 'Rate cannot exceed 100%').optional(),
      conversion_method: z.enum(['in_person', 'code', 'call', 'link', 'business_verified', 'other'], {
        errorMap: () => ({ message: 'Invalid conversion method' })
      }),
      notes: z.string().max(1000, 'Notes too long').optional()
    });

    let validatedData;
    try {
      const rawBody = await req.json();
      validatedData = markConversionSchema.parse(rawBody);
    } catch (error: any) {
      console.error('❌ Validation error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: error.errors || error.message 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const {
      referral_click_id,
      conversion_method,
      conversion_value,
      commission_rate = 0.10,
      notes
    } = validatedData;

    console.log('🎯 Admin marking conversion:', {
      referral_click_id,
      conversion_method,
      conversion_value,
      admin_id: user.id
    });

    // Check if referral click exists and is not already converted
    const { data: existingClick, error: fetchError } = await supabase
      .from('referral_clicks')
      .select('*')
      .eq('id', referral_click_id)
      .single();

    if (fetchError || !existingClick) {
      console.error('❌ Referral click not found:', referral_click_id);
      return new Response(
        JSON.stringify({ error: 'Referral click not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (existingClick.converted) {
      console.log('⚠️ Referral click already converted:', referral_click_id);
      return new Response(
        JSON.stringify({ error: 'Referral click already converted' }),
        { status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Calculate commission amount
    const commission_amount = (conversion_value || 0) * commission_rate;

    // Update the referral click to mark as converted
    const { data: updatedClick, error: updateError } = await supabase
      .from('referral_clicks')
      .update({
        converted: true,
        conversion_at: new Date().toISOString(),
        conversion_method,
        conversion_value,
        commission_rate,
        commission_amount,
        reported_by: user.id,
        notes
      })
      .eq('id', referral_click_id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating referral click:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('✅ Successfully marked conversion:', {
      referral_click_id,
      commission_amount,
      conversion_method
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: updatedClick
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('❌ Error in mark-conversion function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);