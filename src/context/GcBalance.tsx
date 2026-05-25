"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface GcBalanceCtx {
  balance: number;
  setBalance: (n: number) => void;
  refresh: () => Promise<void>;
}

const GcBalanceContext = createContext<GcBalanceCtx>({
  balance: 0,
  setBalance: () => {},
  refresh: async () => {},
});

export function GcBalanceProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial: number;
}) {
  const [balance, setBalance] = useState(initial);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/gc-balance");
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance ?? 0);
      }
    } catch {
      // silent
    }
  }, []);

  return (
    <GcBalanceContext.Provider value={{ balance, setBalance, refresh }}>
      {children}
    </GcBalanceContext.Provider>
  );
}

export const useGcBalance = () => useContext(GcBalanceContext);
