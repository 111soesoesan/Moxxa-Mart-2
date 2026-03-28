"use client";

import { useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { OrderReceiptData, ReceiptFormat, ReceiptThermalWidthMm } from "@/types/receipt";
import { OrderReceiptPrintRoot } from "./OrderReceiptDocument";

function addImageMultiPageA4(pdf: jsPDF, imgData: string) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgProps = pdf.getImageProperties(imgData);
  const imgWidth = pageWidth;
  const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
}

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
  const printRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

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

  const savePdf = async () => {
    const el = printRef.current;
    if (!el) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png", 1.0);

      if (format === "a4") {
        const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
        addImageMultiPageA4(pdf, imgData);
        pdf.save(`moxxa-invoice-${shortId}.pdf`);
      } else {
        const pdfW = thermalWidthMm === "80" ? 80 : 58;
        const imgW = pdfW;
        const imgH = (canvas.height * imgW) / canvas.width;
        const pdf = new jsPDF({
          orientation: "p",
          unit: "mm",
          format: [pdfW, Math.max(imgH + 2, 24)],
        });
        pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH);
        pdf.save(`moxxa-receipt-${shortId}.pdf`);
      }
      toast.success("PDF saved.");
    } catch {
      toast.error("Could not create PDF. If the shop logo fails to load, try again or use Print.");
    } finally {
      setSaving(false);
    }
  };

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
            <DialogTitle>Receipt & invoice</DialogTitle>
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

        <ScrollArea className="h-[min(420px,52vh)] min-h-[200px] shrink-0 bg-muted/50">
          <div className="flex justify-center p-4 print:p-0">
            <div className="rounded-lg border border-border bg-white shadow-sm print:border-0 print:shadow-none overflow-auto max-w-full">
              <OrderReceiptPrintRoot
                ref={printRef}
                data={data}
                format={format}
                thermalWidthMm={thermalWidthMm}
              />
            </div>
          </div>
        </ScrollArea>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/50 p-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => void savePdf()}
          >
            <FileDown className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save as PDF"}
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
