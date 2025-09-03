import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface CountdownTimerProps {
  expiresAt: string;
  className?: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ expiresAt, className }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const expiresAtTime = new Date(expiresAt).getTime();
      const difference = expiresAtTime - now;

      if (difference <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
        return;
      }

      const minutes = Math.floor(difference / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s left`);
      } else {
        setTimeLeft(`${seconds}s left`);
      }
      setIsExpired(false);
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <Badge 
      variant={isExpired ? "destructive" : "outline"} 
      className={`${isExpired ? 'text-red-600 bg-red-50' : 'text-orange-600 bg-orange-50 border-orange-200'} ${className}`}
    >
      ⏰ {timeLeft}
    </Badge>
  );
};

export default CountdownTimer;