import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, ScanLine } from 'lucide-react';
import { GameInfo } from '@/types/ticket';

interface AddBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddBook: (gameNumber: string, bookNumber: string, ticketPrice: number, totalTickets: number, startingTicketNumber: number) => void;
  gameRegistry: GameInfo[];
  boxNumber: number;
}

export const AddBookDialog = ({
  open,
  onOpenChange,
  onAddBook,
  gameRegistry,
  boxNumber,
}: AddBookDialogProps) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [gameNumber, setGameNumber] = useState('');
  const [bookNumber, setBookNumber] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [totalTickets, setTotalTickets] = useState('');
  const [startingTicket, setStartingTicket] = useState('');
  const [isKnownGame, setIsKnownGame] = useState(false);
  
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Focus scan input when dialog opens
  useEffect(() => {
    if (open && activeTab === 'scan') {
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [open, activeTab]);

  const resetForm = () => {
    setBarcodeInput('');
    setGameNumber('');
    setBookNumber('');
    setTicketPrice('');
    setTotalTickets('');
    setStartingTicket('');
    setIsKnownGame(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Extract game number (first 3 digits) and book number (next 6 digits) from barcode
  const extractFromBarcode = (barcode: string) => {
    if (!/^\d{20}$/.test(barcode)) {
      return null;
    }
    // Game number: first 3 digits
    const game = barcode.substring(0, 3);
    // Book number: digits 4-9 (6 digits)
    const book = barcode.substring(3, 9);
    return { gameNumber: game, bookNumber: book };
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const extracted = extractFromBarcode(barcodeInput);
      if (extracted) {
        setGameNumber(extracted.gameNumber);
        setBookNumber(extracted.bookNumber);
        
        // Check if game is known
        const existingGame = gameRegistry.find(g => g.gameNumber === extracted.gameNumber);
        if (existingGame) {
          setTicketPrice(existingGame.ticketPrice.toString());
          setTotalTickets(existingGame.totalTicketsPerBook.toString());
          setIsKnownGame(true);
        } else {
          setIsKnownGame(false);
        }
        
        // Switch to manual tab to show extracted values and allow edits
        setActiveTab('manual');
      }
    }
  };

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric input
    const value = e.target.value.replace(/\D/g, '');
    setBarcodeInput(value);
  };

  const handleGameNumberChange = (value: string) => {
    setGameNumber(value);
    // Check if this game exists in registry
    const existingGame = gameRegistry.find(g => g.gameNumber === value);
    if (existingGame) {
      setTicketPrice(existingGame.ticketPrice.toString());
      setTotalTickets(existingGame.totalTicketsPerBook.toString());
      setIsKnownGame(true);
    } else {
      setIsKnownGame(false);
      // Don't clear values, let user enter them
    }
  };

  const handleSubmit = () => {
    const price = parseFloat(ticketPrice);
    const tickets = parseInt(totalTickets);
    const startNum = parseInt(startingTicket);
    
    if (gameNumber && bookNumber && price > 0 && tickets > 0 && startNum >= 0) {
      onAddBook(gameNumber, bookNumber, price, tickets, startNum);
      handleClose();
    }
  };

  const isValid = 
    gameNumber.length >= 1 && 
    bookNumber.length >= 1 && 
    parseFloat(ticketPrice) > 0 && 
    parseInt(totalTickets) > 0 &&
    parseInt(startingTicket) >= 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Add New Book to Box {boxNumber}
          </DialogTitle>
          <DialogDescription>
            Scan a ticket barcode or manually enter book details.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'scan' | 'manual')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan" className="gap-2">
              <ScanLine className="w-4 h-4" />
              Scan Barcode
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Scan or Enter Barcode</Label>
              <Input
                ref={scanInputRef}
                value={barcodeInput}
                onChange={handleBarcodeChange}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="Scan ticket barcode..."
                className="font-mono text-lg"
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                Scan any ticket from the book. Game and book numbers will be extracted automatically.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Game Number</Label>
                <Input
                  value={gameNumber}
                  onChange={(e) => handleGameNumberChange(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g., 746"
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Book Number</Label>
                <Input
                  value={bookNumber}
                  onChange={(e) => setBookNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g., 047551"
                  maxLength={6}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ticket Price ($)</Label>
                <Input
                  type="number"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  placeholder="e.g., 5"
                  min="0"
                  step="1"
                  disabled={isKnownGame}
                />
                {isKnownGame && (
                  <p className="text-xs text-muted-foreground">Auto-filled from known game</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Tickets per Book</Label>
                <Input
                  type="number"
                  value={totalTickets}
                  onChange={(e) => setTotalTickets(e.target.value)}
                  placeholder="e.g., 60"
                  min="1"
                  disabled={isKnownGame}
                />
                {isKnownGame && (
                  <p className="text-xs text-muted-foreground">Auto-filled from known game</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Starting Ticket Number</Label>
              <Input
                type="number"
                value={startingTicket}
                onChange={(e) => setStartingTicket(e.target.value)}
                placeholder="e.g., 60 (first ticket in book)"
                min="0"
              />
              <p className="text-sm text-muted-foreground">
                The ticket number you'll scan first (usually the highest number in the book).
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            Add Book
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};