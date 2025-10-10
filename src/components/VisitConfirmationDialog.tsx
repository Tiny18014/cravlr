import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface VisitConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: {
    spendAmount?: number;
    visitDate?: Date;
    notes?: string;
  }) => Promise<void>;
  defaultTicketValue?: number;
  recommenderName: string;
  restaurantName: string;
}

export function VisitConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  defaultTicketValue,
  recommenderName,
  restaurantName
}: VisitConfirmationDialogProps) {
  const [spendAmount, setSpendAmount] = useState<string>('');
  const [visitDate, setVisitDate] = useState<Date>();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const amount = spendAmount ? parseFloat(spendAmount) : defaultTicketValue;
    
    if (!amount) {
      alert('Please enter a spend amount or set a default ticket value in your settings.');
      return;
    }

    setLoading(true);
    try {
      await onConfirm({
        spendAmount: amount,
        visitDate,
        notes
      });
      // Reset form
      setSpendAmount('');
      setVisitDate(undefined);
      setNotes('');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Confirm Visit Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Confirming visit from <span className="font-medium">{recommenderName}</span> to{' '}
              <span className="font-medium">{restaurantName}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="spend">How much did the customer spend?</Label>
            <Input
              id="spend"
              type="number"
              step="0.01"
              min="0"
              placeholder={defaultTicketValue ? `Default: $${defaultTicketValue}` : 'Enter amount'}
              value={spendAmount}
              onChange={(e) => setSpendAmount(e.target.value)}
            />
            {defaultTicketValue && !spendAmount && (
              <p className="text-xs text-muted-foreground">
                Will use default ticket value of ${defaultTicketValue.toFixed(2)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Date of visit (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !visitDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {visitDate ? format(visitDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={visitDate}
                  onSelect={setVisitDate}
                  initialFocus
                  disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes about this visit..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Confirming...' : 'Confirm Visit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
