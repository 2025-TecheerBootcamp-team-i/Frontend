import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface EasterEggContextType {
    isActive: boolean;
    triggerEasterEgg: () => void;
    clickCount: number;
    incrementClick: () => void;
    showFailedPlatform: boolean;
}

const EasterEggContext = createContext<EasterEggContextType | undefined>(undefined);

export const EasterEggProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isActive, setIsActive] = useState(false);
    const [clickCount, setClickCount] = useState(0);
    const [showFailedPlatform, setShowFailedPlatform] = useState(false);

    const incrementClick = () => {
        if (isActive) return;
        setClickCount((prev) => {
            const newCount = prev + 1;
            if (newCount >= 5) {
                triggerEasterEgg();
            }
            return newCount;
        });
    };

    const triggerEasterEgg = () => {
        setIsActive(true);
        setTimeout(() => {
            setShowFailedPlatform(true);
        }, 4000);
    };

    return (
        <EasterEggContext.Provider value={{ isActive, triggerEasterEgg, clickCount, incrementClick, showFailedPlatform }}>
            {children}
        </EasterEggContext.Provider>
    );
};

export const useEasterEgg = () => {
    const context = useContext(EasterEggContext);
    if (context === undefined) {
        throw new Error('useEasterEgg must be used within an EasterEggProvider');
    }
    return context;
};
