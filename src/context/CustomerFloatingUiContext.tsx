"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type CustomerFloatingUiContextValue = {
  /** Matches measured `<header>` height — shop nav `top` and stuck threshold */
  mainHeaderStickyTopPx: number;
  reportMainHeaderHeight: (px: number) => void;
  /** Sentinel above main header left viewport upward → main bar elevated */
  mainNavElevated: boolean;
  setMainNavElevated: (elevated: boolean) => void;
  /** Sentinel above shop nav crossed sticky band → shop strip pinned */
  shopNavStuck: boolean;
  setShopNavStuck: (stuck: boolean) => void;
};

const CustomerFloatingUiContext = createContext<CustomerFloatingUiContextValue | null>(null);

const DEFAULT_HEADER_PX = 72;

export function CustomerFloatingUiProvider({ children }: { children: React.ReactNode }) {
  const [mainHeaderStickyTopPx, setMainHeaderStickyTopPx] = useState(DEFAULT_HEADER_PX);
  const [mainNavElevated, setMainNavElevatedState] = useState(false);
  const [shopNavStuck, setShopNavStuckState] = useState(false);

  const reportMainHeaderHeight = useCallback((px: number) => {
    const rounded = Math.max(48, Math.round(px));
    setMainHeaderStickyTopPx((prev) => (prev === rounded ? prev : rounded));
  }, []);

  const setMainNavElevated = useCallback((elevated: boolean) => {
    setMainNavElevatedState((prev) => (prev === elevated ? prev : elevated));
  }, []);

  const setShopNavStuck = useCallback((stuck: boolean) => {
    setShopNavStuckState((prev) => (prev === stuck ? prev : stuck));
  }, []);

  const value = useMemo(
    () => ({
      mainHeaderStickyTopPx,
      reportMainHeaderHeight,
      mainNavElevated,
      setMainNavElevated,
      shopNavStuck,
      setShopNavStuck,
    }),
    [
      mainHeaderStickyTopPx,
      reportMainHeaderHeight,
      mainNavElevated,
      setMainNavElevated,
      shopNavStuck,
      setShopNavStuck,
    ]
  );

  return (
    <CustomerFloatingUiContext.Provider value={value}>{children}</CustomerFloatingUiContext.Provider>
  );
}

export function useCustomerFloatingUi(): CustomerFloatingUiContextValue | null {
  return useContext(CustomerFloatingUiContext);
}
