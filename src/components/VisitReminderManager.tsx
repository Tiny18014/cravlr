import { useState, useEffect } from 'react';
import { VisitReminderModal } from './VisitReminderModal';
import { useVisitReminders } from '@/hooks/useVisitReminders';

export const VisitReminderManager = () => {
  const { reminders, loading, dismissReminder } = useVisitReminders();
  const [currentReminderIndex, setCurrentReminderIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && reminders.length > 0) {
      setModalOpen(true);
    } else {
      setModalOpen(false);
    }
  }, [loading, reminders]);

  const handleModalClose = (open: boolean) => {
    if (!open) {
      // Move to next reminder or close if done
      if (currentReminderIndex < reminders.length - 1) {
        setCurrentReminderIndex(currentReminderIndex + 1);
        setModalOpen(true);
      } else {
        setModalOpen(false);
        setCurrentReminderIndex(0);
      }
    }
  };

  if (loading || reminders.length === 0) {
    return null;
  }

  const currentReminder = reminders[currentReminderIndex];

  return (
    <VisitReminderModal
      open={modalOpen}
      onOpenChange={handleModalClose}
      recommendationId={currentReminder.recommendation_id}
      requestId={currentReminder.request_id}
      restaurantName={currentReminder.restaurant_name}
      foodType={currentReminder.food_type}
      onDismiss={() => dismissReminder(currentReminder.id)}
    />
  );
};