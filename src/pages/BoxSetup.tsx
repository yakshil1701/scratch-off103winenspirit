import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { BoxSetupCard } from '@/components/BoxSetupCard';
import { AddBookDialog } from '@/components/AddBookDialog';
import { StoreSettingsCard } from '@/components/StoreSettingsCard';
import { useTicketStore } from '@/hooks/useTicketStore';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { Package, Plus, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BoxSetup = () => {
  const { boxes, updateBox, addBox, addBoxWithNumber, addBookToBox, removeBox, gameRegistry } = useTicketStore();
  const { settings, updateStateCode, updateTicketOrder } = useStoreSettings();
  const configuredCount = boxes.filter(b => b.isConfigured).length;
  const [isAddBookDialogOpen, setIsAddBookDialogOpen] = useState(false);
  const [selectedBoxForBook, setSelectedBoxForBook] = useState<number | null>(null);

  const handleAddBox = () => {
    addBox();
  };

  const handleAddBookToBox = (boxNumber: number) => {
    setSelectedBoxForBook(boxNumber);
    setIsAddBookDialogOpen(true);
  };

  const handleOpenAddBookDialog = () => {
    setSelectedBoxForBook(null); // No pre-selected box
    setIsAddBookDialogOpen(true);
  };

  const handleBookAdded = (
    gameNumber: string,
    bookNumber: string,
    ticketPrice: number,
    totalTickets: number,
    startingTicketNumber: number,
    targetBoxNumber: number
  ) => {
    // Ensure the box exists, create if needed
    if (!boxes.some(b => b.boxNumber === targetBoxNumber)) {
      addBoxWithNumber(targetBoxNumber);
    }
    // Use setTimeout to ensure box is created before adding book
    setTimeout(() => {
      addBookToBox(targetBoxNumber, gameNumber, bookNumber, ticketPrice, totalTickets, startingTicketNumber);
    }, 0);
    setIsAddBookDialogOpen(false);
    setSelectedBoxForBook(null);
  };

  // Check if settings can be changed (only when no sales data)
  const hasAnySales = boxes.some(b => b.ticketsSold > 0);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Store Settings */}
        <StoreSettingsCard
          settings={settings}
          onStateChange={updateStateCode}
          onTicketOrderChange={updateTicketOrder}
          disabled={hasAnySales}
        />
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Box Setup</h2>
            <p className="text-muted-foreground mt-1">
              Configure your scratch-off ticket boxes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-xl px-4 py-2">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <span className="text-lg font-semibold text-primary">
                  {configuredCount}/{boxes.length} Configured
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddBox} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Empty Box
              </Button>
              <Button onClick={handleOpenAddBookDialog} className="gap-2">
                <BookOpen className="w-4 h-4" />
                Add Book
              </Button>
            </div>
          </div>
        </div>

        {/* Game Registry Info */}
        {gameRegistry.length > 0 && (
          <div className="bg-muted/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Known Games</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {gameRegistry.map(game => (
                <div key={game.gameNumber} className="bg-background rounded-lg px-3 py-1.5 text-sm">
                  <span className="font-semibold">#{game.gameNumber}</span>
                  <span className="text-muted-foreground ml-2">${game.ticketPrice} • {game.totalTicketsPerBook} tickets</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {boxes.length === 0 && (
          <div className="bg-muted/50 border-2 border-dashed border-muted-foreground/20 rounded-xl p-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">No Boxes Yet</h3>
            <p className="text-muted-foreground mb-6">
              Add boxes to start configuring your scratch-off ticket inventory.
            </p>
            <Button onClick={handleAddBox} size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              Add Your First Box
            </Button>
          </div>
        )}

        {/* Box Grid */}
        {boxes.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {boxes.map(box => (
              <BoxSetupCard
                key={box.boxNumber}
                box={box}
                onUpdate={updateBox}
                onRemove={removeBox}
                onAddBook={handleAddBookToBox}
              />
            ))}
          </div>
        )}

        {/* Add Book Dialog */}
        <AddBookDialog
          open={isAddBookDialogOpen}
          onOpenChange={setIsAddBookDialogOpen}
          onAddBook={handleBookAdded}
          gameRegistry={gameRegistry}
          existingBoxes={boxes}
          preselectedBoxNumber={selectedBoxForBook}
          stateCode={settings.stateCode}
        />
      </div>
    </Layout>
  );
};

export default BoxSetup;
