
import React, { useState, useEffect } from 'react';

interface StatusBarProps {
  stream: MediaStream | null;
  cameraLabel: string | undefined;
}

const StatusBar: React.FC<StatusBarProps> = ({ stream, cameraLabel }) => {
    const [resolution, setResolution] = useState<string>('-');
    const [fps, setFps] = useState<number>(0);

    useEffect(() => {
        let frameCount = 0;
        let lastTime = performance.now();
        let animationFrameId: number;

        const updateFPS = () => {
            frameCount++;
            const now = performance.now();
            if (now - lastTime > 1000) {
                setFps(frameCount);
                frameCount = 0;
                lastTime = now;
            }
            if (stream) {
              animationFrameId = requestAnimationFrame(updateFPS);
            }
        };

        if (stream) {
            const track = stream.getVideoTracks()[0];
            const settings = track.getSettings();
            setResolution(`${settings.width}x${settings.height}`);
            animationFrameId = requestAnimationFrame(updateFPS);
        } else {
            setResolution('-');
            setFps(0);
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
        };

    }, [stream]);

    return (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-2 flex gap-4 sm:gap-6 text-xs sm:text-sm flex-wrap">
            <div className="flex items-center gap-2">
                <span className="font-medium text-gray-500 dark:text-gray-400">Camera:</span>
                <span className="text-gray-800 dark:text-gray-200 truncate max-w-[150px] sm:max-w-xs" title={cameraLabel}>{cameraLabel || 'Not connected'}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="font-medium text-gray-500 dark:text-gray-400">Resolution:</span>
                <span className="text-gray-800 dark:text-gray-200">{resolution}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="font-medium text-gray-500 dark:text-gray-400">FPS:</span>
                <span className="text-gray-800 dark:text-gray-200">{fps}</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
                <span className={`text-2xl leading-none ${stream ? 'text-green-500' : 'text-red-500'}`}>●</span>
            </div>
        </div>
    );
};

export default StatusBar;
