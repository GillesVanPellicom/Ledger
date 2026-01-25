import React from 'react';
import { cn } from '../../utils/cn';
import { useSettingsStore } from '../../store/useSettingsStore';

interface DateDisplayProps {
  date: string | Date;
  className?: string;
}

const DateDisplay: React.FC<DateDisplayProps> = ({ date, className }) => {
  const { settings } = useSettingsStore();
  const dateFormat = settings.formatting?.dateFormat || 'international';
  const shortenYear = settings.formatting?.shortenYear || false;

  const d = new Date(date);
  if (isNaN(d.getTime())) return <span className={className}>Invalid Date</span>;

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  let year = d.getFullYear().toString();

  if (shortenYear) {
    year = year.slice(-2);
  }

  const formattedDate = dateFormat === 'american' 
    ? `${month}/${day}/${year}` 
    : `${day}/${month}/${year}`;

  return (
    <span className={cn("tabular-nums text-font-1", className)}>
      {formattedDate}
    </span>
  );
};

export default DateDisplay;
