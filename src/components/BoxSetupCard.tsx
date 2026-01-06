import { useState, useEffect } from 'react';
import { TicketBox } from '@/types/ticket';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check, Edit2, X, Package } from 'lucide-react';

interface BoxSetupCardProps {
  box: TicketBox;
  onUpdate: (boxNumber: number, updates: Partial<TicketBox>) => void;
}

export const BoxSetupCard = ({ box, onUpdate }: BoxSetupCardProps) => {
  const [isEditing, setIsEditing] = useState(!box.isConfigured);
  const [price, setPrice] = useState(box.ticketPrice.toString());
  const [totalTickets, setTotalTickets] = useState(box.totalTicketsPerBook.toString());
  const [startingNumber, setStartingNumber] = useState(box.startingTicketNumber.toString());

  useEffect(() => {
    setPrice(box.ticketPrice.toString());
    setTotalTickets(box.totalTicketsPerBook.toString());
    setStartingNumber(box.startingTicketNumber.toString());
  }, [box]);

  const handleSave = () => {
    const updates: Partial<TicketBox> = {
      ticketPrice: parseFloat(price) || 0,
      totalTicketsPerBook: parseInt(totalTickets) || 0,
      startingTicketNumber: parseInt(startingNumber) || 0,
    };
    onUpdate(box.boxNumber, updates);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setPrice(box.ticketPrice.toString());
    setTotalTickets(box.totalTicketsPerBook.toString());
    setStartingNumber(box.startingTicketNumber.toString());
    setIsEditing(false);
  };

  if (!isEditing && !box.isConfigured) {
    return (
      <div 
        className="box-card opacity-60 cursor-pointer hover:opacity-100"
        onClick={() => setIsEditing(true)}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-foreground">Box {box.boxNumber}</span>
          <Package className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Click to configure</p>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className="box-card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-foreground">Box {box.boxNumber}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-8 w-8 p-0"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price:</span>
            <span className="font-semibold">${box.ticketPrice}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tickets/Book:</span>
            <span className="font-semibold">{box.totalTicketsPerBook}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Starting #:</span>
            <span className="font-semibold">{box.startingTicketNumber}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="box-card-active p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-lg font-bold text-foreground">Box {box.boxNumber}</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className="h-8 w-8 p-0 text-success hover:text-success"
          >
            <Check className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Ticket Price ($)</Label>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-10 text-lg font-semibold"
            placeholder="3"
            min="0"
            step="1"
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Tickets per Book</Label>
          <Input
            type="number"
            value={totalTickets}
            onChange={(e) => setTotalTickets(e.target.value)}
            className="h-10 text-lg font-semibold"
            placeholder="100"
            min="1"
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Starting Ticket #</Label>
          <Input
            type="number"
            value={startingNumber}
            onChange={(e) => setStartingNumber(e.target.value)}
            className="h-10 text-lg font-semibold"
            placeholder="100"
            min="1"
          />
        </div>
      </div>
    </div>
  );
};
