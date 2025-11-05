import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const updateClaimSchema = z.object({
  claimId: z.string().uuid('Invalid claim ID'),
  status: z.enum(['verified', 'rejected'], {
    errorMap: () => ({ message: 'Status must be either verified or rejected' })
  }),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional()
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user is admin using has_role RPC
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('Admin check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate input
    const body = await req.json();
    const validationResult = updateClaimSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.issues.map(i => i.message) 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { claimId, status, notes } = validationResult.data;

    console.log(`Admin ${user.id} updating claim ${claimId} to ${status}`);

    // Update the claim
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'verified') {
      updateData.verified_at = new Date().toISOString();
    }

    if (notes) {
      updateData.verification_notes = notes;
    }

    const { data: updatedClaim, error: updateError } = await supabase
      .from('business_claims')
      .update(updateData)
      .eq('id', claimId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating claim:', updateError);
      throw new Error('Failed to update business claim');
    }

    // Log the admin action
    console.log(`AUDIT: Admin ${user.id} set claim ${claimId} to ${status} at ${new Date().toISOString()}`);

    return new Response(JSON.stringify({ 
      success: true,
      claim: updatedClaim
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in admin-update-claim function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
