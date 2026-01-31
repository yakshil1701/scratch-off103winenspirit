import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval, parseISO } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { DailySummary } from '@/types/summary';
import { cn } from '@/lib/utils';

type TimeFilter = 'day' | 'week' | 'month' | 'year';

interface SalesAnalyticsChartProps {
  summaries: DailySummary[];
  className?: string;
}

interface ChartDataPoint {
  label: string;
  fullLabel: string;
  sales: number;
  tickets: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl p-3 animate-fade-in">
        <p className="font-semibold text-foreground mb-1">{payload[0]?.payload?.fullLabel || label}</p>
        <div className="space-y-1">
          <p className="text-sm text-primary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Sales: <span className="font-medium">${payload[0]?.value?.toFixed(2) || '0.00'}</span>
          </p>
          {payload[0]?.payload?.tickets !== undefined && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-muted-foreground" />
              Tickets: <span className="font-medium">{payload[0]?.payload?.tickets}</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const SalesAnalyticsChart = ({ summaries, className }: SalesAnalyticsChartProps) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('day');

  const chartData = useMemo((): ChartDataPoint[] => {
    if (!summaries.length) return [];

    const sortedSummaries = [...summaries].sort(
      (a, b) => new Date(a.summary_date).getTime() - new Date(b.summary_date).getTime()
    );

    const now = new Date();

    switch (timeFilter) {
      case 'day': {
        // Last 14 days
        const last14Days = sortedSummaries.slice(-14);
        return last14Days.map((s) => ({
          label: format(parseISO(s.summary_date), 'MMM d'),
          fullLabel: format(parseISO(s.summary_date), 'EEEE, MMMM d, yyyy'),
          sales: s.total_amount_sold,
          tickets: s.total_tickets_sold,
        }));
      }

      case 'week': {
        // Last 8 weeks
        const eightWeeksAgo = new Date(now);
        eightWeeksAgo.setDate(now.getDate() - 56);
        
        const weeks = eachWeekOfInterval({ start: eightWeeksAgo, end: now }, { weekStartsOn: 0 });
        
        return weeks.slice(-8).map((weekStart) => {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
          const weekSales = sortedSummaries.filter((s) => {
            const date = parseISO(s.summary_date);
            return isWithinInterval(date, { start: weekStart, end: weekEnd });
          });
          
          const totalSales = weekSales.reduce((sum, s) => sum + s.total_amount_sold, 0);
          const totalTickets = weekSales.reduce((sum, s) => sum + s.total_tickets_sold, 0);
          
          return {
            label: format(weekStart, 'MMM d'),
            fullLabel: `Week of ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`,
            sales: totalSales,
            tickets: totalTickets,
          };
        });
      }

      case 'month': {
        // Last 12 months
        const twelveMonthsAgo = new Date(now);
        twelveMonthsAgo.setMonth(now.getMonth() - 11);
        
        const months = eachMonthOfInterval({ start: startOfMonth(twelveMonthsAgo), end: now });
        
        return months.map((monthStart) => {
          const monthEnd = endOfMonth(monthStart);
          const monthSales = sortedSummaries.filter((s) => {
            const date = parseISO(s.summary_date);
            return isWithinInterval(date, { start: monthStart, end: monthEnd });
          });
          
          const totalSales = monthSales.reduce((sum, s) => sum + s.total_amount_sold, 0);
          const totalTickets = monthSales.reduce((sum, s) => sum + s.total_tickets_sold, 0);
          
          return {
            label: format(monthStart, 'MMM'),
            fullLabel: format(monthStart, 'MMMM yyyy'),
            sales: totalSales,
            tickets: totalTickets,
          };
        });
      }

      case 'year': {
        // Group by year
        const yearMap = new Map<number, { sales: number; tickets: number }>();
        
        sortedSummaries.forEach((s) => {
          const year = parseISO(s.summary_date).getFullYear();
          const existing = yearMap.get(year) || { sales: 0, tickets: 0 };
          yearMap.set(year, {
            sales: existing.sales + s.total_amount_sold,
            tickets: existing.tickets + s.total_tickets_sold,
          });
        });
        
        return Array.from(yearMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([year, data]) => ({
            label: year.toString(),
            fullLabel: `Year ${year}`,
            sales: data.sales,
            tickets: data.tickets,
          }));
      }

      default:
        return [];
    }
  }, [summaries, timeFilter]);

  const useBarChart = timeFilter === 'month' || timeFilter === 'year';
  const hasData = chartData.length > 0 && chartData.some(d => d.sales > 0);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            Sales Analytics
          </CardTitle>
          <ToggleGroup
            type="single"
            value={timeFilter}
            onValueChange={(value) => value && setTimeFilter(value as TimeFilter)}
            className="bg-muted/50 rounded-lg p-1"
          >
            <ToggleGroupItem
              value="day"
              className="rounded-md px-3 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm transition-all"
            >
              Day
            </ToggleGroupItem>
            <ToggleGroupItem
              value="week"
              className="rounded-md px-3 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm transition-all"
            >
              Week
            </ToggleGroupItem>
            <ToggleGroupItem
              value="month"
              className="rounded-md px-3 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm transition-all"
            >
              Month
            </ToggleGroupItem>
            <ToggleGroupItem
              value="year"
              className="rounded-md px-3 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm transition-all"
            >
              Year
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No sales data available for this period</p>
            <p className="text-xs mt-1">Complete some sales to see analytics</p>
          </div>
        ) : (
          <div className="h-[300px] w-full animate-fade-in">
            <ResponsiveContainer width="100%" height="100%">
              {useBarChart ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    opacity={0.5}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                    dx={-5}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
                  <Bar
                    dataKey="sales"
                    fill="url(#barGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    opacity={0.5}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                    dx={-5}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
