import { TicketBox } from '@/types/ticket';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';

interface BoxSelectorProps {
  boxes: TicketBox[];
  selectedBox: number | null;
  onSelect: (boxNumber: number) => void;
}

export const BoxSelector = ({ boxes, selectedBox, onSelect }: BoxSelectorProps) => {
  const configuredBoxes = boxes.filter(b => b.isConfigured);

  if (configuredBoxes.length === 0) {
    return (
      <div className="bg-warning/10 border-2 border-warning rounded-xl p-6 text-center">
        <Package className="w-12 h-12 text-warning mx-auto mb-3" />
        <h3 className="text-lg font-bold text-foreground mb-1">No Boxes Configured</h3>
        <p className="text-muted-foreground">
          Go to Box Setup to configure your scratch-off boxes first.
        </p>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-muted-foreground mb-3">
        Select Box to Scan
      </label>
      <div className="flex flex-wrap gap-2">
        {configuredBoxes.map(box => (
          <Button
            key={box.boxNumber}
            variant={selectedBox === box.boxNumber ? "default" : "outline"}
            onClick={() => onSelect(box.boxNumber)}
            className={`min-w-[80px] h-14 text-lg font-bold transition-all ${
              selectedBox === box.boxNumber 
                ? 'ring-2 ring-primary ring-offset-2' 
                : ''
            }`}
          >
            <div className="text-center">
              <div>Box {box.boxNumber}</div>
              <div className="text-xs font-normal opacity-80">${box.ticketPrice}</div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};
