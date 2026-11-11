"use client";

import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export type DeviceSession = {
  session: {
    id: string;
    token: string;
    expiresAt: string | Date;
  };
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
};

export function useDeviceSessions() {
  const { data, isLoading, refetch } = useQuery<DeviceSession[]>({
    queryKey: ["device-sessions"],
    queryFn: async () => {
      const res = await authClient.multiSession.listDeviceSessions();
      if (res?.data && Array.isArray(res.data)) {
        return res.data as unknown as DeviceSession[];
      }
      return [];
    },
    staleTime: 60 * 1000,
  });

  return {
    sessions: data ?? [],
    isLoading,
    refetch,
  };
}
