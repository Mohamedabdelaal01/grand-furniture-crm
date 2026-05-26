import { createContext, useContext, useState, useCallback } from 'react';

const AlertsContext = createContext({ unreadCount: 0, alerts: [] });

/**
 * AlertsProvider — lifts lead-alert state so Navbar can read unreadCount
 * without prop-drilling through App → Navbar.
 * Dashboard calls pushAlerts() whenever useLeadAlerts updates.
 */
export function AlertsProvider({ children }) {
  const [alerts, setAlerts]       = useState([]);
  const [unreadCount, setUnread]  = useState(0);

  const pushAlerts = useCallback((newAlerts, count) => {
    setAlerts(newAlerts);
    setUnread(count);
  }, []);

  return (
    <AlertsContext.Provider value={{ alerts, unreadCount, pushAlerts }}>
      {children}
    </AlertsContext.Provider>
  );
}

export const useAlerts = () => useContext(AlertsContext);
