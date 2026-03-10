import { useState, useCallback, useRef } from 'react';

export function useMultiClick(requiredClicks: number = 5, timeoutMs: number = 3000) {
    const [clicks, setClicks] = useState(0);
    const timerRef = useRef<number | null>(null);

    const handleClick = useCallback(() => {
        setClicks((prev) => {
            const newClicks = prev + 1;

            if (newClicks >= requiredClicks) {
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                }
                return requiredClicks; // We achieved the goal
            }

            // Reset timer on first click or subsequent clicks
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = window.setTimeout(() => {
                setClicks(0); // Reset if timeout reached
                timerRef.current = null;
            }, timeoutMs);

            return newClicks;
        });
    }, [requiredClicks, timeoutMs]);

    const reset = useCallback(() => {
        setClicks(0);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    return {
        onClick: handleClick,
        isTriggered: clicks >= requiredClicks,
        reset,
    };
}
