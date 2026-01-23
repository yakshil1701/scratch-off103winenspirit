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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookOpen, ScanLine, Package, Plus } from 'lucide-react';
import { GameInfo, TicketBox } from '@/types/ticket';
import { StateCode } from '@/types/settings';

interface AddBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddBook: (gameNumber: string, bookNumber: string, ticketPrice: number, totalTickets: number, startingTicketNumber: number, targetBoxNumber: number) => void;
  gameRegistry: GameInfo[];
  existingBoxes: TicketBox[];
  preselectedBoxNumber: number | null;
  stateCode: StateCode;
}

export const AddBookDialog = ({
  open,
  onOpenChange,
  onAddBook,
  gameRegistry,
  existingBoxes,
  preselectedBoxNumber,
  stateCode,
}: AddBookDialogProps) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [gameNumber, setGameNumber] = useState('');
  const [bookNumber, setBookNumber] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [totalTickets, setTotalTickets] = useState('');
  const [startingTicket, setStartingTicket] = useState('');
  const [isKnownGame, setIsKnownGame] = useState(false);
  
  // Box assignment state
  const [boxAssignment, setBoxAssignment] = useState<'existing' | 'new'>('existing');
  const [selectedExistingBox, setSelectedExistingBox] = useState<string>('');
  const [newBoxNumber, setNewBoxNumber] = useState('');
  
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Focus scan input when dialog opens
  useEffect(() => {
    if (open && activeTab === 'scan') {
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [open, activeTab]);

  // Set preselected box when dialog opens
  useEffect(() => {
    if (open && preselectedBoxNumber !== null) {
      setBoxAssignment('existing');
      setSelectedExistingBox(preselectedBoxNumber.toString());
    } else if (open && existingBoxes.length > 0) {
      setBoxAssignment('existing');
      setSelectedExistingBox(existingBoxes[0].boxNumber.toString());
    } else if (open) {
      setBoxAssignment('new');
      // Find next available box number
      const existingNumbers = existingBoxes.map(b => b.boxNumber);
      let nextNumber = 1;
      while (existingNumbers.includes(nextNumber)) {
        nextNumber++;
      }
      setNewBoxNumber(nextNumber.toString());
    }
  }, [open, preselectedBoxNumber, existingBoxes]);

  const resetForm = () => {
    setBarcodeInput('');
    setGameNumber('');
    setBookNumber('');
    setTicketPrice('');
    setTotalTickets('');
    setStartingTicket('');
    setIsKnownGame(false);
    setBoxAssignment('existing');
    setSelectedExistingBox('');
    setNewBoxNumber('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Extract game number and book number from barcode based on state
  const extractFromBarcode = (barcode: string) => {
    if (stateCode === 'DC') {
      // Washington DC dashed format: 1619-04147-7-017
      if (barcode.includes('-')) {
        const segments = barcode.split('-');
        if (segments.length >= 3) {
          const game = segments[0];
          const book = segments[1];
          return { gameNumber: game, bookNumber: book };
        }
        return null;
      }
      
      // Long numeric DC format: 1629030580016913270220
      // First 4 digits = game number, next 5 digits = book number
      if (/^\d{12,}$/.test(barcode)) {
        const game = barcode.substring(0, 4);
        const book = barcode.substring(4, 9);
        return { gameNumber: game, bookNumber: book };
      }
      
      return null;
    }
    
    // Maryland format: 20-digit numeric barcode
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
    // Allow numeric input and dashes for DC format
    const value = stateCode === 'DC' 
      ? e.target.value.replace(/[^0-9-]/g, '')
      : e.target.value.replace(/\D/g, '');
    setBarcodeInput(value);
  };

  // State-specific limits
  const gameNumberMaxLength = stateCode === 'DC' ? 4 : 3;
  const bookNumberMaxLength = stateCode === 'DC' ? 5 : 6;
  const gameNumberPlaceholder = stateCode === 'DC' ? 'e.g., 1629' : 'e.g., 746';
  const bookNumberPlaceholder = stateCode === 'DC' ? 'e.g., 03058' : 'e.g., 047551';

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
    
    // Determine target box number
    let targetBox: number;
    if (boxAssignment === 'existing') {
      targetBox = parseInt(selectedExistingBox);
    } else {
      targetBox = parseInt(newBoxNumber);
    }
    
    if (gameNumber && bookNumber && price > 0 && tickets > 0 && startNum >= 0 && targetBox > 0) {
      onAddBook(gameNumber, bookNumber, price, tickets, startNum, targetBox);
      handleClose();
    }
  };

  // Validate new box number doesn't already exist
  const existingBoxNumbers = existingBoxes.map(b => b.boxNumber);
  const isValidNewBoxNumber = newBoxNumber && parseInt(newBoxNumber) > 0 && !existingBoxNumbers.includes(parseInt(newBoxNumber));

  const isValidBoxSelection = 
    (boxAssignment === 'existing' && selectedExistingBox) ||
    (boxAssignment === 'new' && isValidNewBoxNumber);

  const isValid = 
    gameNumber.length >= 1 && 
    bookNumber.length >= 1 && 
    parseFloat(ticketPrice) > 0 && 
    parseInt(totalTickets) > 0 &&
    parseInt(startingTicket) >= 0 &&
    isValidBoxSelection;

  // Determine dialog title based on context
  const dialogTitle = preselectedBoxNumber !== null 
    ? `Add New Book to Box ${preselectedBoxNumber}`
    : 'Add New Book';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {dialogTitle}
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
                placeholder={stateCode === 'DC' ? "e.g., 1619-04147-7-017 or 1629030580016913270220" : "Scan ticket barcode..."}
                className="font-mono text-lg"
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                {stateCode === 'DC' 
                  ? 'Enter barcode (dashed format or long numeric). Game and book numbers will be extracted.'
                  : 'Scan any ticket from the book. Game and book numbers will be extracted automatically.'
                }
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
                  placeholder={gameNumberPlaceholder}
                  maxLength={gameNumberMaxLength}
                />
              </div>
              <div className="space-y-2">
                <Label>Book Number</Label>
                <Input
                  value={bookNumber}
                  onChange={(e) => setBookNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder={bookNumberPlaceholder}
                  maxLength={bookNumberMaxLength}
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

            {/* Box Assignment Section - only show if no preselected box */}
            {preselectedBoxNumber === null && (
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-base font-semibold">Assign to Box</Label>
                <RadioGroup 
                  value={boxAssignment} 
                  onValueChange={(v) => setBoxAssignment(v as 'existing' | 'new')}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="existing" id="existing" disabled={existingBoxes.length === 0} />
                    <Label htmlFor="existing" className="flex items-center gap-2 cursor-pointer">
                      <Package className="w-4 h-4" />
                      Use existing box
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="new" id="new" />
                    <Label htmlFor="new" className="flex items-center gap-2 cursor-pointer">
                      <Plus className="w-4 h-4" />
                      Create new box
                    </Label>
                  </div>
                </RadioGroup>

                {boxAssignment === 'existing' && existingBoxes.length > 0 && (
                  <div className="space-y-2 pl-6">
                    <Label>Select Box</Label>
                    <Select value={selectedExistingBox} onValueChange={setSelectedExistingBox}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a box" />
                      </SelectTrigger>
                      <SelectContent>
                        {existingBoxes.map(box => (
                          <SelectItem key={box.boxNumber} value={box.boxNumber.toString()}>
                            Box {box.boxNumber}
                            {box.isConfigured && box.gameNumber && (
                              <span className="text-muted-foreground ml-2">
                                (Game #{box.gameNumber})
                              </span>
                            )}
                            {!box.isConfigured && (
                              <span className="text-muted-foreground ml-2">(Empty)</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Adding a book to an existing box will replace its current configuration.
                    </p>
                  </div>
                )}

                {boxAssignment === 'new' && (
                  <div className="space-y-2 pl-6">
                    <Label>New Box Number</Label>
                    <Input
                      type="number"
                      value={newBoxNumber}
                      onChange={(e) => setNewBoxNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter box number"
                      min="1"
                    />
                    {newBoxNumber && !isValidNewBoxNumber && (
                      <p className="text-sm text-destructive">
                        {parseInt(newBoxNumber) <= 0 
                          ? 'Box number must be greater than 0'
                          : 'This box number already exists'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
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