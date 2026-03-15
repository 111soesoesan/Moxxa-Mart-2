"use client";

import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Error boundary caught:", event.error);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  return (
    <div>
      {fallback}
      {children}
    </div>
  );
}

interface ErrorStateProps {
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function ErrorState({ title, message, action }: ErrorStateProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{message}</p>
        {action && (
          <Button
            onClick={action.onClick}
            variant="outline"
            size="sm"
            className="mt-3"
          >
            {action.label}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
