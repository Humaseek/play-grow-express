import { useCallback, useState } from "react";

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, variant = "info") => {
    const id = crypto?.randomUUID?.() ?? String(Date.now());
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, push, remove };
}
