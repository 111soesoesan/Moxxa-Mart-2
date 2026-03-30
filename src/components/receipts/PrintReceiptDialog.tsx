"use client";

import { useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { FileDown, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { OrderReceiptData, ReceiptFormat, ReceiptThermalWidthMm } from "@/types/receipt";
import { OrderReceiptPrintRoot } from "./OrderReceiptDocument";

export function PrintReceiptDialog({
  data,
  triggerLabel = "Print receipt",
  className,
}: {
  data: OrderReceiptData;
  triggerLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ReceiptFormat>("a4");
  const [thermalWidthMm, setThermalWidthMm] = useState<ReceiptThermalWidthMm>("80");

  // One ref shared by Print and Save as PDF — both use react-to-print.
  const printRef = useRef<HTMLDivElement>(null);

  const shortId = data.orderId.slice(0, 8);

  const pageStyle = useMemo(() => {
    if (format === "a4") {
      return `@page { size: A4 portrait; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`;
    }
    const w = thermalWidthMm === "80" ? "80mm" : "58mm";
    return `@page { size: ${w} auto; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`;
  }, [format, thermalWidthMm]);

  const documentTitle = useMemo(
    () => (format === "a4" ? `Invoice-${shortId}` : `Receipt-${shortId}`),
    [format, shortId]
  );

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: () => documentTitle,
    pageStyle,
    onPrintError: () => {
      toast.error("Could not open the print dialog.");
    },
  });

  // "Save as PDF" reuses the same print flow — the browser's print dialog
  // has a native "Save as PDF" destination that works perfectly everywhere.
  // This replaces the html2canvas + jsPDF approach which fails inside Dialogs.
  const handleSaveAsPdf = useReactToPrint({
    contentRef: printRef,
    documentTitle: () => documentTitle,
    pageStyle,
    onPrintError: () => {
      toast.error("Could not open the print dialog. Try the Print button instead.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className={cn(className)}>
          <Printer className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "flex max-h-[min(90vh,880px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,720px)]"
        )}
        showCloseButton
      >
        <div className="border-b border-border px-4 py-3 pr-12">
          <DialogHeader className="gap-1">
            <DialogTitle>Receipt &amp; invoice</DialogTitle>
            <DialogDescription>
              Choose format, then print or save as PDF.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-3 border-b border-border bg-muted/30 px-4 py-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Format</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={format === "a4" ? "default" : "outline"}
                onClick={() => setFormat("a4")}
              >
                A4 invoice
              </Button>
              <Button
                type="button"
                size="sm"
                variant={format === "thermal" ? "default" : "outline"}
                onClick={() => setFormat("thermal")}
              >
                Thermal receipt
              </Button>
            </div>
          </div>
          {format === "thermal" && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Paper width</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={thermalWidthMm === "80" ? "secondary" : "outline"}
                  onClick={() => setThermalWidthMm("80")}
                >
                  80 mm
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={thermalWidthMm === "58" ? "secondary" : "outline"}
                  onClick={() => setThermalWidthMm("58")}
                >
                  58 mm
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="h-[min(420px,52vh)] min-h-[200px] shrink-0 overflow-y-auto overflow-x-hidden bg-muted/50">
          <div className="flex w-full min-w-0 justify-center p-4 print:p-0">
            <div className="w-full min-w-0 max-w-full rounded-lg border border-border bg-white shadow-sm print:w-auto print:border-0 print:shadow-none">
              <OrderReceiptPrintRoot
                ref={printRef}
                data={data}
                format={format}
                thermalWidthMm={thermalWidthMm}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/50 p-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSaveAsPdf()}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Save as PDF
          </Button>
          <Button type="button" onClick={() => handlePrint()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
