import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Authenticate the user making the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Account deletion requested for user: ${user.id}`);

    // Goal 4: Delete profile picture from storage first
    try {
      // List all files in the user's profile-pictures folder
      const { data: files, error: listError } = await supabase.storage
        .from('profile-pictures')
        .list(user.id);

      if (!listError && files && files.length > 0) {
        const filePaths = files.map(file => `${user.id}/${file.name}`);
        const { error: deleteStorageError } = await supabase.storage
          .from('profile-pictures')
          .remove(filePaths);

        if (deleteStorageError) {
          console.error('Error deleting profile pictures:', deleteStorageError);
          // Continue with account deletion even if storage delete fails
        } else {
          console.log(`Deleted ${filePaths.length} profile picture(s) for user ${user.id}`);
        }
      }
    } catch (storageError) {
      console.error('Error accessing storage:', storageError);
      // Continue with account deletion even if storage access fails
    }

    // Delete user data in proper order (respecting foreign key constraints)
    
    // 1. Delete recommendation feedback
    await supabase
      .from('recommendation_feedback')
      .delete()
      .eq('user_id', user.id);

    // 2. Delete notifications
    await supabase
      .from('notifications')
      .delete()
      .eq('requester_id', user.id);

    // 3. Delete recommender notifications
    await supabase
      .from('recommender_notifications')
      .delete()
      .eq('recommender_id', user.id);

    // 4. Delete points events
    await supabase
      .from('points_events')
      .delete()
      .eq('user_id', user.id);

    // 5. Delete referral clicks
    await supabase
      .from('referral_clicks')
      .delete()
      .or(`requester_id.eq.${user.id},recommender_id.eq.${user.id}`);

    // 6. Delete device tokens (push notification subscriptions)
    await supabase
      .from('device_tokens')
      .delete()
      .eq('user_id', user.id);

    // 7. Delete request user state
    await supabase
      .from('request_user_state')
      .delete()
      .eq('user_id', user.id);

    // 8. Delete user current locations
    await supabase
      .from('user_current_locations')
      .delete()
      .eq('user_id', user.id);

    // 9. Delete business profiles
    await supabase
      .from('business_profiles')
      .delete()
      .eq('user_id', user.id);

    // 10. Delete business claims
    await supabase
      .from('business_claims')
      .delete()
      .eq('user_id', user.id);

    // 11. Delete guru map likes
    await supabase
      .from('guru_map_likes')
      .delete()
      .eq('user_id', user.id);

    // 12. Delete guru map places added by user
    await supabase
      .from('guru_map_places')
      .delete()
      .eq('added_by', user.id);

    // 13. Delete guru maps created by user
    await supabase
      .from('guru_maps')
      .delete()
      .eq('created_by', user.id);

    // 14. Delete recommendations
    await supabase
      .from('recommendations')
      .delete()
      .eq('recommender_id', user.id);

    // 15. Delete food requests
    await supabase
      .from('food_requests')
      .delete()
      .eq('requester_id', user.id);

    // 16. Delete user roles
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', user.id);

    // 17. Delete profile
    await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    // 18. Finally, delete the auth user using admin API
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      throw deleteError;
    }

    // Log successful deletion for audit trail
    console.log(`Account successfully deleted: ${user.id} at ${new Date().toISOString()}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-account function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to delete account. Please contact support if this persists.',
        error_code: 'ACCOUNT_DELETE_FAILED'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);