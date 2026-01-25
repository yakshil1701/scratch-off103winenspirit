import { useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen, Pencil, Check, X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GameInfo } from '@/types/ticket';
import { cn } from '@/lib/utils';

interface KnownGamesSectionProps {
  gameRegistry: GameInfo[];
  onUpdateGame: (gameNumber: string, updates: { ticketPrice: number; totalTicketsPerBook: number }) => void;
}

interface EditableGameProps {
  game: GameInfo;
  onSave: (gameNumber: string, updates: { ticketPrice: number; totalTicketsPerBook: number }) => void;
}

const EditableGame = ({ game, onSave }: EditableGameProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [price, setPrice] = useState(game.ticketPrice.toString());
  const [tickets, setTickets] = useState(game.totalTicketsPerBook.toString());

  const handleSave = () => {
    const newPrice = parseFloat(price);
    const newTickets = parseInt(tickets, 10);
    
    if (!isNaN(newPrice) && !isNaN(newTickets) && newPrice > 0 && newTickets > 0) {
      onSave(game.gameNumber, { ticketPrice: newPrice, totalTicketsPerBook: newTickets });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setPrice(game.ticketPrice.toString());
    setTickets(game.totalTicketsPerBook.toString());
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm flex items-center gap-2 animate-fade-in">
        <span className="font-semibold text-primary">#{game.gameNumber}</span>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">$</span>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-6 w-14 px-1 text-sm"
            min="0.01"
            step="0.01"
            autoFocus
          />
        </div>
        <span className="text-muted-foreground">•</span>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={tickets}
            onChange={(e) => setTickets(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-6 w-14 px-1 text-sm"
            min="1"
          />
          <span className="text-muted-foreground text-xs">tix</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={handleSave}
        >
          <Check className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleCancel}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-background border border-transparent rounded-lg px-3 py-1.5 text-sm transition-all cursor-pointer group",
        isHovered && "border-primary/30 bg-primary/5"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsEditing(true)}
    >
      <span className="font-semibold">#{game.gameNumber}</span>
      <span className="text-muted-foreground ml-2">${game.ticketPrice} • {game.totalTicketsPerBook} tickets</span>
      <Pencil 
        className={cn(
          "w-3 h-3 inline-block ml-2 transition-opacity",
          isHovered ? "opacity-100 text-primary" : "opacity-0"
        )} 
      />
    </div>
  );
};

export const KnownGamesSection = ({ gameRegistry, onUpdateGame }: KnownGamesSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (gameRegistry.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border/50 rounded-xl bg-muted/20 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Known Games</span>
              <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                {gameRegistry.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              {!isOpen && (
                <span className="text-xs hidden sm:inline">Click to expand</span>
              )}
              {isOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border/30 bg-background/50 p-4">
            <div className="flex flex-wrap gap-2">
              {gameRegistry.map(game => (
                <EditableGame
                  key={game.gameNumber}
                  game={game}
                  onSave={onUpdateGame}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Click on any game to edit its price or ticket count.
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
