import { useEffect } from "react";
import { usePopupBus } from "@/hooks/usePopupBus";

export function PopupDebugBinder() {
  const { pushPopup } = usePopupBus();
  
  useEffect(() => {
    (window as any).__pushPopup = pushPopup;
    console.log("🔧 window.__pushPopup bound - test with: __pushPopup({ type: 'request_results', title: 'Test', message: 'Hello', cta:{label:'Open', to:'/'} })");
  }, [pushPopup]);
  
  return null;
}