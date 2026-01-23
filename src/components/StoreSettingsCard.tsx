import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings, MapPin, ArrowUpDown } from 'lucide-react';
import { StoreSettings, STATE_OPTIONS, TICKET_ORDER_OPTIONS, StateCode, TicketOrder } from '@/types/settings';

interface StoreSettingsCardProps {
  settings: StoreSettings;
  onStateChange: (state: StateCode) => void;
  onTicketOrderChange: (order: TicketOrder) => void;
  disabled?: boolean;
}

export const StoreSettingsCard = ({
  settings,
  onStateChange,
  onTicketOrderChange,
  disabled = false,
}: StoreSettingsCardProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5" />
          Store Settings
        </CardTitle>
        <CardDescription>
          Configure state-specific barcode format and ticket counting order
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* State Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              State
            </Label>
            <Select
              value={settings.stateCode}
              onValueChange={(value) => onStateChange(value as StateCode)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {STATE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {settings.stateCode === 'MD' 
                ? 'Maryland: 20-digit barcode format'
                : 'DC: Dashed format (1619-04147-7-017)'
              }
            </p>
          </div>

          {/* Ticket Order Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4" />
              Ticket Number Order
            </Label>
            <Select
              value={settings.ticketOrder}
              onValueChange={(value) => onTicketOrderChange(value as TicketOrder)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select order" />
              </SelectTrigger>
              <SelectContent>
                {TICKET_ORDER_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {settings.ticketOrder === 'descending'
                ? 'Tickets sold: previous - current'
                : 'Tickets sold: current - previous'
              }
            </p>
          </div>
        </div>

        {disabled && (
          <p className="text-sm text-warning flex items-center gap-2">
            ⚠️ Settings cannot be changed while boxes are configured with sales data.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
