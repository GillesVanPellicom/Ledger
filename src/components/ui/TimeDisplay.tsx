import React from 'react';
import { cn } from '../../utils/cn';
import { useSettingsStore } from '../../store/useSettingsStore';

interface TimeDisplayProps {
  date: string | Date;
  className?: string;
}

const TimeDisplay: React.FC<TimeDisplayProps> = ({ date, className }) => {
  const { settings } = useSettingsStore();
  const timeFormat = settings.formatting?.timeFormat || 'international';
  const showSeconds = settings.formatting?.showSeconds || false;

  const d = new Date(date);
  if (isNaN(d.getTime())) return <span className={className}>Invalid Time</span>;

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = showSeconds ? `:${d.getSeconds().toString().padStart(2, '0')}` : '';
  
  let ampm = '';
  if (timeFormat === 'american') {
    ampm = hours >= 12 ? ' PM' : ' AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
  }
  
  const displayHours = hours.toString().padStart(2, '0');

  return (
    <span className={cn("tabular-nums text-font-1", className)}>
      {displayHours}:{minutes}{seconds}{ampm}
    </span>
  );
};

export default TimeDisplay;
