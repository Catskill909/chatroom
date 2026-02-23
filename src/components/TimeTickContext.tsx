import { createContext, useContext, useEffect, useState } from 'react';

/**
 * Shared timer context that ticks once per minute.
 * This replaces per-component setInterval timers for relative time display.
 * Instead of N messages each having their own 60s interval (N timers, N re-renders/min),
 * all messages share a single timer and re-render together once per minute.
 */
const TimeTickContext = createContext<number>(Date.now());

export function TimeTickProvider({ children }: { children: React.ReactNode }) {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 60_000);
        return () => clearInterval(interval);
    }, []);

    return (
        <TimeTickContext.Provider value={now}>
            {children}
        </TimeTickContext.Provider>
    );
}

/**
 * Hook to subscribe to the shared minute-tick timer.
 * Returns the current timestamp, updated every 60 seconds.
 */
export function useTimeTick(): number {
    return useContext(TimeTickContext);
}
