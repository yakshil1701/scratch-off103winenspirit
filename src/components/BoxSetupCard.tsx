import { useState, useEffect } from 'react';
import { TicketBox } from '@/types/ticket';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check, Edit2, X, Package, Trash2, BookOpen, Plus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BoxSetupCardProps {
  box: TicketBox;
  onUpdate: (boxNumber: number, updates: Partial<TicketBox>) => void;
  onRemove: (boxNumber: number) => void;
  onAddBook: (boxNumber: number) => void;
}

export const BoxSetupCard = ({ box, onUpdate, onRemove, onAddBook }: BoxSetupCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
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

  // Unconfigured box - show "Add Book" option
  if (!box.isConfigured) {
    return (
      <div 
        className="box-card opacity-60 cursor-pointer hover:opacity-100"
        onClick={() => onAddBook(box.boxNumber)}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-foreground">Box {box.boxNumber}</span>
          <div className="flex items-center gap-1">
            <Package className="w-5 h-5 text-muted-foreground" />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Box {box.boxNumber}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove the box from your setup. You can add it back later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onRemove(box.boxNumber)}>
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Plus className="w-4 h-4" />
          <span>Add Book</span>
        </div>
      </div>
    );
  }

  // Configured box - display mode
  if (!isEditing) {
    return (
      <div className="box-card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-foreground">Box {box.boxNumber}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddBook(box.boxNumber)}
              className="h-8 w-8 p-0 text-primary hover:text-primary"
              title="Add new book"
            >
              <BookOpen className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Box {box.boxNumber}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This box has configuration data. Removing it will delete all settings. You can add it back later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onRemove(box.boxNumber)}>
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        
        {/* Game/Book Info */}
        {box.gameNumber && (
          <div className="mb-2 px-2 py-1 bg-primary/10 rounded text-xs">
            <span className="font-semibold text-primary">Game #{box.gameNumber}</span>
            {box.bookNumber && (
              <span className="text-muted-foreground ml-1">· Book #{box.bookNumber}</span>
            )}
          </div>
        )}
        
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
            <span className="text-muted-foreground">Current #:</span>
            <span className="font-semibold">{box.lastScannedTicketNumber ?? box.startingTicketNumber}</span>
          </div>
        </div>
      </div>
    );
  }

  // Editing mode
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
      
      {/* Show game/book info in edit mode */}
      {box.gameNumber && (
        <div className="mb-3 px-2 py-1 bg-primary/10 rounded text-xs">
          <span className="font-semibold text-primary">Game #{box.gameNumber}</span>
          {box.bookNumber && (
            <span className="text-muted-foreground ml-1">· Book #{box.bookNumber}</span>
          )}
        </div>
      )}
      
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
