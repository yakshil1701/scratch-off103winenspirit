import { useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen, Pencil, Check, X, Trash2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GameInfo } from '@/types/ticket';
import { cn } from '@/lib/utils';
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

interface KnownGamesSectionProps {
  gameRegistry: GameInfo[];
  onUpdateGame: (gameNumber: string, updates: { ticketPrice: number; totalTicketsPerBook: number }) => void;
  onDeleteGame: (gameNumber: string) => void;
}

interface EditableGameProps {
  game: GameInfo;
  onSave: (gameNumber: string, updates: { ticketPrice: number; totalTicketsPerBook: number }) => void;
  onDelete: (gameNumber: string) => void;
  isDeleting: boolean;
}

const EditableGame = ({ game, onSave, onDelete, isDeleting }: EditableGameProps) => {
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
      <div className={cn(
        "bg-card border border-border rounded-lg px-3 py-2 text-sm flex items-center gap-2 animate-fade-in",
        isDeleting && "animate-fade-out opacity-0 scale-95 transition-all duration-300"
      )}>
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
        "bg-background border border-transparent rounded-lg px-3 py-1.5 text-sm transition-all group relative",
        isHovered && "border-primary/30 bg-primary/5",
        isDeleting && "animate-fade-out opacity-0 scale-95 transition-all duration-300"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="font-semibold">#{game.gameNumber}</span>
      <span className="text-muted-foreground ml-2">${game.ticketPrice} • {game.totalTicketsPerBook} tickets</span>
      
      <div className={cn(
        "inline-flex items-center gap-1 ml-2 transition-opacity",
        isHovered ? "opacity-100" : "opacity-0"
      )}>
        <button
          onClick={() => setIsEditing(true)}
          className="p-0.5 rounded hover:bg-primary/10 transition-colors"
          title="Edit game"
        >
          <Pencil className="w-3 h-3 text-primary" />
        </button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="p-0.5 rounded hover:bg-destructive/10 transition-colors"
              title="Delete game"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="w-3 h-3 text-destructive" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Game #{game.gameNumber}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove this game from your registry. Any boxes currently using this game will need to be reconfigured.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(game.gameNumber)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export const KnownGamesSection = ({ gameRegistry, onUpdateGame, onDeleteGame }: KnownGamesSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [deletingGameNumber, setDeletingGameNumber] = useState<string | null>(null);

  const handleDelete = (gameNumber: string) => {
    setDeletingGameNumber(gameNumber);
    // Wait for animation to complete before actually deleting
    setTimeout(() => {
      onDeleteGame(gameNumber);
      setDeletingGameNumber(null);
    }, 300);
  };

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
                  onDelete={handleDelete}
                  isDeleting={deletingGameNumber === game.gameNumber}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Hover over any game to edit or delete it.
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};