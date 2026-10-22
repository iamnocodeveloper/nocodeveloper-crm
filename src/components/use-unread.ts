"use client";

import { useCallback, useEffect, useState } from "react";
import { useEvents } from "@/components/use-events";

/**
 * Contador de no leídos compartido por el lateral y la barra inferior. Vive una
 * sola vez en `AppShell`: si cada menú abriera su propio `EventSource`, el
 * teléfono mantendría dos conexiones SSE para el mismo dato.
 */
export function useUnread(): number {
  const [unread, setUnread] = useState(0);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/conversations").catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json().catch(() => null)) as {
      conversations?: { unreadCount?: number }[];
    } | null;
    setUnread(
      (data?.conversations ?? []).reduce(
        (total, conversation) => total + Number(conversation.unreadCount ?? 0),
        0
      )
    );
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEvents({
    onMessageNew: () => void refetch(),
    onConversationUpdated: () => void refetch(),
  });

  return unread;
}
