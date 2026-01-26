import React, { useState, useEffect } from 'react';
import { Play, Square, Timer } from 'lucide-react';
import { cn } from '../../utils/cn';
import { toast } from 'sonner';
import { useSettingsStore } from '../../store/useSettingsStore';
import Tooltip from './Tooltip';

const ProfilerOverlay: React.FC = () => {
  const { settings } = useSettingsStore();
  const showControls = settings.dev?.profiling?.showControls ?? false;

  const [isProfiling, setIsProfiling] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const checkStatus = async () => {
      if (window.electronAPI?.isProfiling) {
        try {
          const status = await window.electronAPI.isProfiling();
          setIsProfiling(status);
          if (status) {
            setStartTime(Date.now()); 
          }
        } catch (err) {
          console.error('Failed to check profiling status:', err);
        }
      }
    };
    checkStatus();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProfiling && startTime) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isProfiling, startTime]);

  // Sync with external changes (e.g. from SettingsModal)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (window.electronAPI?.isProfiling) {
        try {
          const status = await window.electronAPI.isProfiling();
          if (status !== isProfiling) {
            setIsProfiling(status);
            if (status && !startTime) {
              setStartTime(Date.now());
            } else if (!status) {
              setStartTime(null);
            }
          }
        } catch (err) {}
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isProfiling, startTime]);

  const handleToggle = async () => {
    if (!window.electronAPI?.startProfiling) {
      toast.error('Profiling API not available. Please restart the app.');
      return;
    }

    try {
      if (!isProfiling) {
        await window.electronAPI.startProfiling();
        setIsProfiling(true);
        setStartTime(Date.now());
        setElapsed(0);
        toast.success('CPU Profiling started');
      } else {
        const path = await window.electronAPI.stopProfiling();
        setIsProfiling(false);
        setStartTime(null);
        toast.success(`Profile saved to: ${path}`);
      }
    } catch (err: any) {
      toast.error(`Profiler error: ${err.message}`);
    }
  };

  if (!showControls) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[9999] flex items-center gap-3 bg-bg-2 border border-border shadow-2xl rounded-full p-1.5 pr-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <Tooltip content={isProfiling ? "Stop Profiling" : "Start Profiling"}>
        <button
          onClick={handleToggle}
          className={cn(
            "p-2 rounded-full transition-all hover:scale-110 active:scale-95",
            isProfiling ? "bg-red text-white" : "bg-accent text-white"
          )}
        >
          {isProfiling ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
        </button>
      </Tooltip>

      <div className="flex items-center gap-2">
        <Timer className={cn("h-4 w-4", isProfiling ? "text-red animate-pulse" : "text-font-2")} />
        <span className="text-xs font-mono font-medium text-font-1 min-w-[40px]">
          {formatTime(elapsed)}
        </span>
      </div>
    </div>
  );
};

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default ProfilerOverlay;
