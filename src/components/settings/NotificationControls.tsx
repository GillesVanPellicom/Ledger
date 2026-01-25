import React from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { cn } from '../../utils/cn';
import { toast } from 'sonner';
import { Bell, Info } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import Radio from '../ui/Radio';

const NotificationControls: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const currentPosition = settings.notifications?.position || 'bottom-right';

  const positions = [
    { id: 'top-left', label: 'Top Left', className: 'top-4 left-4' },
    { id: 'top-center', label: 'Top Center', className: 'top-4 left-1/2 -translate-x-1/2' },
    { id: 'top-right', label: 'Top Right', className: 'top-4 right-4' },
    { id: 'bottom-left', label: 'Bottom Left', className: 'bottom-4 left-4' },
    { id: 'bottom-center', label: 'Bottom Center', className: 'bottom-4 left-1/2 -translate-x-1/2' },
    { id: 'bottom-right', label: 'Bottom Right', className: 'bottom-4 right-4' },
  ] as const;

  // Coordinates for the preview toast (top-left corner)
  // Container is h-72 (288px). Toast is w-48 (192px), h-12 (48px).
  const toastPositions: Record<string, React.CSSProperties> = {
    'top-left': { top: '56px', left: '16px' },
    'top-center': { top: '56px', left: 'calc(50% - 96px)' },
    'top-right': { top: '56px', left: 'calc(100% - 16px - 192px)' },
    'bottom-left': { top: 'calc(100% - 104px)', left: '16px' },
    'bottom-center': { top: 'calc(100% - 104px)', left: 'calc(50% - 96px)' },
    'bottom-right': { top: 'calc(100% - 104px)', left: 'calc(100% - 16px - 192px)' },
  };

  const handlePositionChange = (position: typeof positions[number]['id']) => {
    updateSettings({ notifications: { position } });
    toast('Position updated', {
      position: position,
      description: `Notifications will now appear in the ${position.replace('-', ' ')}.`,
    });
  };

  return (
    <div className="p-6 border border-border rounded-xl bg-field relative h-72 w-full overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 pointer-events-none">
        {/* Grid lines for visual reference */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-border/30" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/30" />
      </div>

      {/* Center Content */}
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

      {/* Preview Toast Representation */}
      <div 
        className="absolute transition-all duration-500 ease-in-out pointer-events-none"
        style={{
          width: '192px',
          height: '48px',
          ...toastPositions[currentPosition]
        }}
      >
        <div className="w-full h-full bg-bg-modal rounded-lg shadow-lg border border-border flex items-center px-3 gap-3">
          <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
          <div className="h-2 w-24 bg-font-2/20 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default NotificationControls;
