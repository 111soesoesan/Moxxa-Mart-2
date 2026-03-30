"use client";

import type { UseFormRegisterReturn } from "react-hook-form";
import { Field, FieldLabel, FieldControl, FieldError, FieldDescription } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";

export function AuthPasswordField({
  label,
  labelClassName,
  fieldClassName,
  registration,
  error,
  placeholder,
  autoComplete,
  description,
}: {
  label: string;
  labelClassName: string;
  fieldClassName: string;
  registration: UseFormRegisterReturn<"password">;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  description?: string;
}) {
  return (
    <Field error={error}>
      <FieldLabel required className={labelClassName}>
        {label}
      </FieldLabel>
      <FieldControl>
        <PasswordInput
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={fieldClassName}
          {...registration}
        />
      </FieldControl>
      {description ? (
        <FieldDescription className="text-xs text-muted-foreground">{description}</FieldDescription>
      ) : null}
      <FieldError />
    </Field>
  );
}
