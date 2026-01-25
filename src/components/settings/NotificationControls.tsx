import React, { useState, useEffect, useCallback } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { cn } from '../../utils/cn';
import { toast } from 'sonner';
import { Bell, Info } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import Radio from '../ui/Radio';
import StepperInput from '../ui/StepperInput';
import Divider from '../ui/Divider';
import { debounce } from 'lodash';

const NotificationControls: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const currentPosition = settings.notifications?.position || 'top-center';
  const currentDuration = settings.notifications?.duration || 4000;
  
  // Local state for immediate UI updates
  const [localDuration, setLocalDuration] = useState(String(currentDuration / 1000));

  useEffect(() => {
    setLocalDuration(String(currentDuration / 1000));
  }, [currentDuration]);

  const positions = [
    { id: 'top-left', label: 'Top Left', className: 'top-4 left-4' },
    { id: 'top-center', label: 'Top Center', className: 'top-4 left-1/2 -translate-x-1/2' },
    { id: 'top-right', label: 'Top Right', className: 'top-4 right-4' },
    { id: 'bottom-left', label: 'Bottom Left', className: 'bottom-4 left-4' },
    { id: 'bottom-center', label: 'Bottom Center', className: 'bottom-4 left-1/2 -translate-x-1/2' },
    { id: 'bottom-right', label: 'Bottom Right', className: 'bottom-4 right-4' },
  ] as const;

  const toastPositions: Record<string, React.CSSProperties> = {
    'top-left': { top: '56px', left: '16px' },
    'top-center': { top: '56px', left: 'calc(50% - 96px)' },
    'top-right': { top: '56px', left: 'calc(100% - 16px - 192px)' },
    'bottom-left': { top: 'calc(100% - 104px)', left: '16px' },
    'bottom-center': { top: 'calc(100% - 104px)', left: 'calc(50% - 96px)' },
    'bottom-right': { top: 'calc(100% - 104px)', left: 'calc(100% - 16px - 192px)' },
  };

  const handlePositionChange = (position: typeof positions[number]['id']) => {
    updateSettings({ notifications: { ...settings.notifications, position } });
    toast('Position updated', {
      position: position,
      description: `Notifications will now appear in the ${position.replace('-', ' ')}.`,
    });
  };

  // Debounced update function
  const debouncedUpdateDuration = useCallback(
    debounce((val: number) => {
      updateSettings({ notifications: { ...settings.notifications, duration: val * 1000 } });
    }, 500),
    [settings.notifications, updateSettings]
  );

  const handleDurationChange = (val: string) => {
    setLocalDuration(val);
    debouncedUpdateDuration(Number(val));
  };

  const handleReset = () => {
    updateSettings({ notifications: { position: 'top-center', duration: 4000 } });
    toast('Notifications reset', {
      description: 'Notification settings have been reset to default.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium text-font-1">Notification Position</h3>
          <Tooltip content="Choose where notifications appear on the screen.">
            <Info className="h-5 w-5 text-font-2 hover:text-font-1 cursor-help" />
          </Tooltip>
        </div>
        <button onClick={handleReset} className="text-xs text-font-2 hover:text-font-1 underline">reset</button>
      </div>

      <div className="p-6 border border-border rounded-xl bg-field relative h-72 w-full overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-border/30" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/30" />
        </div>

        <div className="flex flex-col items-center gap-2 text-font-2 opacity-50">
          <Bell className="h-8 w-8" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wider">Preview Area</span>
            <Tooltip content="Click the radio buttons to change where notifications appear.">
              <Info className="h-3.5 w-3.5 cursor-help" />
            </Tooltip>
          </div>
        </div>
        
        {positions.map((pos) => (
          <button
            key={pos.id}
            onClick={() => handlePositionChange(pos.id)}
            className={cn(
              "absolute transition-all duration-200 z-10 hover:scale-110 focus:outline-none",
              pos.className
            )}
            aria-label={`Set notification position to ${pos.label}`}
            title={pos.label}
          >
            <Radio selected={currentPosition === pos.id} />
          </button>
        ))}

        <div 
          className="absolute transition-all duration-500 ease-in-out pointer-events-none"
          style={{
            width: '192px',
            height: '48px',
            ...toastPositions[currentPosition]
          }}
        >
          <div className="w-full h-full bg-bg-modal rounded-lg shadow-lg border border-border flex items-center px-3 gap-3 relative">
            <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
            <div className="h-2 w-24 bg-font-2/20 rounded-full" />
            {/* Mock Close Button */}
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-field border border-border rounded-full flex items-center justify-center text-[10px] text-font-2 shadow-sm">
              ×
            </div>
          </div>
        </div>
      </div>

      <Divider />

      <div className="w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-font-1">Display Duration</span>
            <Tooltip content="How long notifications stay on screen (in seconds).">
              <Info className="h-4 w-4 text-font-2 cursor-help" />
            </Tooltip>
          </div>
          <StepperInput 
            value={localDuration} 
            onChange={(e) => handleDurationChange(e.target.value)}
            onIncrement={() => handleDurationChange(String(Math.min(60, Number(localDuration) + 1)))}
            onDecrement={() => handleDurationChange(String(Math.max(1, Number(localDuration) - 1)))}
            min={1}
            max={60}
            precision={0}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
};

export default NotificationControls;
