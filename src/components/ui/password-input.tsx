"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<typeof Input>, "type">
>(function PasswordInput({ className, disabled, ...props }, ref) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="relative w-full">
      <Input
        ref={ref}
        type={showPassword ? "text" : "password"}
        disabled={disabled}
        className={cn("pe-11", className)}
        {...props}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={disabled}
        className="absolute end-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
      </Button>
    </div>
  );
});

PasswordInput.displayName = "PasswordInput";
