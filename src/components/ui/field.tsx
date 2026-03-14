"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

type FieldContextValue = {
  id: string;
  error?: string;
  descriptionId: string;
  errorId: string;
};

const FieldContext = React.createContext<FieldContextValue | null>(null);

function useFieldContext(): FieldContextValue {
  const ctx = React.useContext(FieldContext);
  if (!ctx) throw new Error("Field components must be used within <Field>");
  return ctx;
}

function Field({
  error,
  children,
  className,
}: {
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const uid = React.useId();
  const ctx: FieldContextValue = {
    id: `${uid}-input`,
    error,
    descriptionId: `${uid}-description`,
    errorId: `${uid}-error`,
  };
  return (
    <FieldContext.Provider value={ctx}>
      <div className={cn("flex flex-col gap-1.5", className)}>{children}</div>
    </FieldContext.Provider>
  );
}

function FieldLabel({
  children,
  className,
  required,
  ...props
}: React.ComponentProps<typeof Label> & { required?: boolean }) {
  const { id, error } = useFieldContext();
  return (
    <Label
      htmlFor={id}
      className={cn(error && "text-destructive", className)}
      {...props}
    >
      {children}
      {required && (
        <span aria-hidden="true" className="ml-0.5 text-destructive">
          *
        </span>
      )}
    </Label>
  );
}

function FieldControl({
  children,
  ...props
}: React.ComponentProps<typeof Slot>) {
  const { id, error, descriptionId, errorId } = useFieldContext();
  return (
    <Slot
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={
        [descriptionId, error ? errorId : undefined].filter(Boolean).join(
          " "
        ) || undefined
      }
      {...props}
    >
      {children}
    </Slot>
  );
}

function FieldDescription({
  children,
  className,
  ...props
}: React.ComponentProps<"p">) {
  const { descriptionId } = useFieldContext();
  return (
    <p
      id={descriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </p>
  );
}

function FieldError({
  children,
  className,
  ...props
}: React.ComponentProps<"p">) {
  const { error, errorId } = useFieldContext();
  const message = children ?? error;
  if (!message) return null;
  return (
    <p
      id={errorId}
      role="alert"
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {message}
    </p>
  );
}

function FieldGroup({
  children,
  className,
  cols = 2,
  ...props
}: React.ComponentProps<"div"> & { cols?: 1 | 2 | 3 }) {
  const colsClass =
    cols === 3 ? "sm:grid-cols-3" : cols === 2 ? "sm:grid-cols-2" : "";
  return (
    <div className={cn("grid gap-4", colsClass, className)} {...props}>
      {children}
    </div>
  );
}

export {
  Field,
  FieldLabel,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldGroup,
  useFieldContext,
};
