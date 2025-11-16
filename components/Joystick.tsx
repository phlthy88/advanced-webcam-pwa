
import React, { useRef, useState, useCallback, MouseEvent, TouchEvent } from 'react';

interface JoystickProps {
    pan: number;
    tilt: number;
    onPtzChange: (pan: number, tilt: number) => void;
    disabled?: boolean;
}

const Joystick: React.FC<JoystickProps> = ({ pan, tilt, onPtzChange, disabled }) => {
    const joystickRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const getHandlePosition = () => {
        if (!joystickRef.current || isDragging) return {};
        const radius = joystickRef.current.offsetWidth / 2 - 20; // 20 is half handle width
        const panX = (pan / 180) * radius;
        const tiltY = -(tilt / 90) * radius;
        return {
            transform: `translate(${panX}px, ${tiltY}px)`,
        };
    };

    const handleInteraction = useCallback((clientX: number, clientY: number) => {
        if (!joystickRef.current) return;

        const rect = joystickRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const radius = rect.width / 2;

        let x = clientX - centerX;
        let y = clientY - centerY;

        const distance = Math.sqrt(x * x + y * y);
        if (distance > radius) {
            x = (x / distance) * radius;
            y = (y / distance) * radius;
        }

        const newPan = Math.round((x / radius) * 180);
        const newTilt = Math.round(-(y / radius) * 90);

        onPtzChange(newPan, newTilt);
    }, [onPtzChange]);

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if (disabled) return;
        setIsDragging(true);
        handleInteraction(e.clientX, e.clientY);
    };

    const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        if (disabled) return;
        setIsDragging(true);
        handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMove = useCallback((e: globalThis.MouseEvent | globalThis.TouchEvent) => {
        if (!isDragging || disabled) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        handleInteraction(clientX, clientY);
    }, [isDragging, disabled, handleInteraction]);

    React.useEffect(() => {
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchend', handleEnd);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [handleMove, handleEnd]);


    return (
        <div
            ref={joystickRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className={`w-40 h-40 bg-gray-200 dark:bg-gray-700 rounded-full relative flex items-center justify-center border-4 border-gray-300 dark:border-gray-600 shadow-inner ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-crosshair'}`}
        >
            <div className="absolute w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full" />
            <div
                style={getHandlePosition()}
                className={`w-10 h-10 bg-blue-500 rounded-full shadow-lg absolute transition-transform duration-100 ease-linear ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            />
        </div>
    );
};

export default Joystick;
