import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import * as Network from "expo-network";

type Connectivity = { online: boolean; checking: boolean };
const ConnectivityContext = createContext<Connectivity>({ online: true, checking: true });

function isOnline(state: Network.NetworkState) {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

export function ConnectivityProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<Connectivity>({ online: true, checking: true });

  useEffect(() => {
    let active = true;
    void Network.getNetworkStateAsync()
      .then((network) => { if (active) setState({ online: isOnline(network), checking: false }); })
      .catch(() => { if (active) setState((current) => ({ ...current, checking: false })); });

    const subscription = Network.addNetworkStateListener((network) => {
      if (active) setState({ online: isOnline(network), checking: false });
    });

    return () => { active = false; subscription.remove(); };
  }, []);

  return <ConnectivityContext.Provider value={useMemo(() => state, [state])}>{children}</ConnectivityContext.Provider>;
}

export function useConnectivity() {
  return useContext(ConnectivityContext);
}
