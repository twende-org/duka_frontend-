import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { XCircle, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

interface ErrorAlertProps {
  error: string | null;
  onClear?: () => void;
  className?: string;
}

/**
 * Reusable component to display localized error messages from Redux store.
 */
export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onClear, className }) => {
  const { t } = useI18n();

  if (!error) return null;

  return (
    <Alert variant="destructive" className={`mb-6 relative animate-in fade-in slide-in-from-top-2 ${className}`}>
      <XCircle className="h-4 w-4" />
      <AlertTitle>{t("common.error")}</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{t(error as any) === error ? error : t(error as any)}</span>
        {onClear && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 absolute top-2 right-2 text-destructive hover:bg-destructive/10" 
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
