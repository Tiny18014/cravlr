import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useClockSkew() {
  const [skewMs, setSkewMs] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const t0 = performance.now();
        const { data, error } = await supabase.functions.invoke("server-time");
        const t1 = performance.now();
        
        if (error || !data?.now) {
          console.warn("⏰ Clock skew: Failed to get server time", error);
          return;
        }

        // midpoint to reduce network latency bias
        const rtt = t1 - t0;
        const localMid = Date.now() - rtt / 2;
        const serverMs = Date.parse(data.now);
        const skew = serverMs - localMid; // positive => server ahead
        
        if (alive) {
          setSkewMs(skew);
          console.log(`⏰ Clock skew calculated: ${skew}ms (RTT: ${Math.round(rtt)}ms)`);
        }
        
        // refresh occasionally (15 min)
        setTimeout(() => alive && setSkewMs(0), 15 * 60 * 1000);
      } catch (error) {
        console.warn("⏰ Clock skew: Error calculating skew", error);
      }
    })();
    return () => { alive = false; };
  }, []);

  return skewMs;
}