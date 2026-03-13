"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  value?: string[];
  onChange: (urls: string[]) => void;
  onUpload: (file: File, index: number) => Promise<string>;
  maxFiles?: number;
  label?: string;
};

export function ImageUpload({ value = [], onChange, onUpload, maxFiles = 10, label = "Upload Images" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        if (value.length + newUrls.length >= maxFiles) break;
        const url = await onUpload(files[i], value.length + i);
        newUrls.push(url);
      }
      onChange([...value, ...newUrls]);
    } finally {
      setUploading(false);
    }
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border group">
            <Image src={url} alt={`Image ${i + 1}`} fill className="object-cover" sizes="80px" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-lg transition-opacity"
            >
              ✕
            </button>
          </div>
        ))}
        {value.length < maxFiles && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors",
              uploading && "opacity-50 pointer-events-none"
            )}
          >
            {uploading ? "…" : "+"}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      <p className="text-xs text-muted-foreground">{value.length}/{maxFiles} images. {label}</p>
    </div>
  );
}
