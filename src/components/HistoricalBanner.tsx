import { format } from 'date-fns';
import { History, Edit3, Save, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface HistoricalBannerProps {
  selectedDate: string;
  dayOfWeek: string;
  isEditMode: boolean;
  onEnterEditMode: () => void;
  onCancelEdit: () => void;
  onSaveEdits: () => void;
  isSaving?: boolean;
}

export const HistoricalBanner = ({
  selectedDate,
  dayOfWeek,
  isEditMode,
  onEnterEditMode,
  onCancelEdit,
  onSaveEdits,
  isSaving,
}: HistoricalBannerProps) => {
  const formattedDate = format(new Date(selectedDate + 'T00:00:00'), 'MMMM d, yyyy');

  return (
    <div className={`rounded-xl p-4 mb-6 ${isEditMode ? 'bg-warning/10 border-2 border-warning' : 'bg-primary/10 border-2 border-primary/30'}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {isEditMode ? (
            <AlertTriangle className="w-6 h-6 text-warning" />
          ) : (
            <History className="w-6 h-6 text-primary" />
          )}
          <div>
            <p className="text-lg font-bold text-foreground">
              {isEditMode ? 'Editing Historical Data' : 'Viewing Historical Summary'}
            </p>
            <p className="text-muted-foreground">
              {dayOfWeek}, {formattedDate}
              {isEditMode && (
                <span className="ml-2 text-warning font-medium">
                  — Changes will only affect this date
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {isEditMode ? (
            <>
              <Button variant="outline" onClick={onCancelEdit} className="gap-2">
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="default" className="gap-2" disabled={isSaving}>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Save Changes</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to save changes to the summary for {dayOfWeek}, {formattedDate}? 
                      This will update the historical record for this date only.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onSaveEdits}>
                      Yes, Save Changes
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <Button variant="outline" onClick={onEnterEditMode} className="gap-2">
              <Edit3 className="w-4 h-4" />
              Edit This Summary
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
