import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function TestNotificationButton() {
  const { user } = useAuth();
  
  const testUpdate = async () => {
    if (!user?.id) {
      console.log("❌ No user logged in for test");
      return;
    }

    try {
      console.log("🔍 Testing manual update to trigger notification...");
      
      // First, let's create a test request
      const { data: request, error: insertError } = await supabase
        .from('food_requests')
        .insert({
          requester_id: user.id,
          food_type: 'Test Food',
          location_city: 'Test City', 
          location_state: 'Test State',
          response_window: 1,
          expires_at: new Date(Date.now() + 60000).toISOString() // 1 minute from now
        })
        .select()
        .single();

      if (insertError) {
        console.error("❌ Error creating test request:", insertError);
        return;
      }

      console.log("✅ Created test request:", request);

      // Wait a moment, then update it to expired
      setTimeout(async () => {
        const { data: updated, error: updateError } = await supabase
          .from('food_requests')
          .update({ 
            status: 'expired',
            closed_at: new Date().toISOString()
          })
          .eq('id', request.id)
          .select()
          .single();

        if (updateError) {
          console.error("❌ Error updating test request:", updateError);
          return;
        }

        console.log("✅ Updated test request to expired:", updated);
      }, 2000);

    } catch (error) {
      console.error("❌ Test failed:", error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button onClick={testUpdate} variant="outline">
        Test Notification
      </Button>
    </div>
  );
}