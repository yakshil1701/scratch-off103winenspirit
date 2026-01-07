import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DailySummary } from '@/types/summary';
import { cn } from '@/lib/utils';

interface SummaryDateFilterProps {
  summaries: DailySummary[];
  daysOfWeek: string[];
  onSelectDate: (date: string) => void;
  onClearFilter: () => void;
  selectedDate: string | null;
}

export const SummaryDateFilter = ({
  summaries,
  daysOfWeek,
  onSelectDate,
  onClearFilter,
  selectedDate,
}: SummaryDateFilterProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dayFilter, setDayFilter] = useState<string>('');

  // Get dates that have summaries
  const summaryDates = summaries.map(s => new Date(s.summary_date + 'T00:00:00'));

  // Filter summaries by day of week
  const filteredSummaries = dayFilter
    ? summaries.filter(s => s.day_of_week === dayFilter)
    : summaries;

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd');
      const matchingSummary = summaries.find(s => s.summary_date === dateStr);
      if (matchingSummary) {
        onSelectDate(dateStr);
        setCalendarOpen(false);
      }
    }
  };

  const handleDayFilterChange = (day: string) => {
    setDayFilter(day === 'all' ? '' : day);
  };

  const isDateAvailable = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return summaries.some(s => s.summary_date === dateStr);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Day of Week Filter */}
      <Select value={dayFilter || 'all'} onValueChange={handleDayFilterChange}>
        <SelectTrigger className="w-[160px]">
          <Filter className="w-4 h-4 mr-2" />
          <SelectValue placeholder="Filter by day" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Days</SelectItem>
          {daysOfWeek.map(day => (
            <SelectItem key={day} value={day}>
              {day}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Calendar Date Picker */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <CalendarIcon className="w-4 h-4" />
            {selectedDate ? format(new Date(selectedDate + 'T00:00:00'), 'MMM d, yyyy') : 'Select Date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate ? new Date(selectedDate + 'T00:00:00') : undefined}
            onSelect={handleDateSelect}
            modifiers={{
              available: (date) => isDateAvailable(date),
            }}
            modifiersStyles={{
              available: { fontWeight: 'bold', color: 'hsl(var(--primary))' },
            }}
            disabled={(date) => !isDateAvailable(date)}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      {/* Quick Select from Filtered List */}
      {filteredSummaries.length > 0 && (
        <Select 
          value={selectedDate || ''} 
          onValueChange={(date) => date && onSelectDate(date)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Quick select date" />
          </SelectTrigger>
          <SelectContent>
            {filteredSummaries.slice(0, 10).map(summary => (
              <SelectItem key={summary.id} value={summary.summary_date}>
                {format(new Date(summary.summary_date + 'T00:00:00'), 'MMM d, yyyy')} ({summary.day_of_week})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear Filter Button */}
      {selectedDate && (
        <Button variant="ghost" size="sm" onClick={onClearFilter} className="gap-1">
          <X className="w-4 h-4" />
          Back to Today
        </Button>
      )}
    </div>
  );
};
