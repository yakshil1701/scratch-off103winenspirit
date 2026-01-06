import { Layout } from '@/components/Layout';
import { BoxSetupCard } from '@/components/BoxSetupCard';
import { useTicketStore } from '@/hooks/useTicketStore';
import { Package } from 'lucide-react';

const BoxSetup = () => {
  const { boxes, updateBox } = useTicketStore();
  const configuredCount = boxes.filter(b => b.isConfigured).length;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Box Setup</h2>
            <p className="text-muted-foreground mt-1">
              Configure your scratch-off ticket boxes (1-70)
            </p>
          </div>
          <div className="bg-primary/10 rounded-xl px-4 py-2">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <span className="text-lg font-semibold text-primary">
                {configuredCount} Boxes Configured
              </span>
            </div>
          </div>
        </div>

        {/* Box Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {boxes.map(box => (
            <BoxSetupCard
              key={box.boxNumber}
              box={box}
              onUpdate={updateBox}
            />
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default BoxSetup;
