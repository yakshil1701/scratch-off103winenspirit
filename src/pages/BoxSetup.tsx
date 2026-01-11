import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { BoxSetupCard } from '@/components/BoxSetupCard';
import { useTicketStore } from '@/hooks/useTicketStore';
import { Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const BoxSetup = () => {
  const { boxes, updateBox, addBox, addBoxWithNumber, removeBox } = useTicketStore();
  const configuredCount = boxes.filter(b => b.isConfigured).length;
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBoxNumber, setNewBoxNumber] = useState('');

  const handleAddBox = () => {
    addBox();
  };

  const handleAddBoxWithNumber = () => {
    const num = parseInt(newBoxNumber);
    if (num > 0 && !boxes.some(b => b.boxNumber === num)) {
      addBoxWithNumber(num);
      setNewBoxNumber('');
      setIsAddDialogOpen(false);
    }
  };

  const existingNumbers = boxes.map(b => b.boxNumber);
  const isValidNewNumber = newBoxNumber && parseInt(newBoxNumber) > 0 && !existingNumbers.includes(parseInt(newBoxNumber));

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
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
              <Button onClick={handleAddBox} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Box
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Specific #
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Box with Specific Number</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="boxNumber">Box Number</Label>
                      <Input
                        id="boxNumber"
                        type="number"
                        min="1"
                        value={newBoxNumber}
                        onChange={(e) => setNewBoxNumber(e.target.value)}
                        placeholder="Enter box number"
                      />
                      {newBoxNumber && !isValidNewNumber && (
                        <p className="text-sm text-destructive">
                          {parseInt(newBoxNumber) <= 0 
                            ? 'Box number must be greater than 0'
                            : 'This box number already exists'}
                        </p>
                      )}
                    </div>
                    <Button 
                      onClick={handleAddBoxWithNumber} 
                      disabled={!isValidNewNumber}
                      className="w-full"
                    >
                      Add Box #{newBoxNumber}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

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
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BoxSetup;
