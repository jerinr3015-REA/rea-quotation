import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Camera, Upload, Loader2 } from "lucide-react";
import { Quotation } from "@/types/quotation";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AddQuotationDialogProps {
  onAdd: (quotation: Quotation) => void;
}

export const AddQuotationDialog = ({ onAdd }: AddQuotationDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Quotation>({
    "QUOTATION NO": "",
    "QUOTATION DATE": "",
    "CLIENT": "",
    "NEW/OLD": "NEW",
    "DESCRIPTION 1": "",
    "DESCRIPTION 2": "",
    "QTY": "",
    "UNIT COST": "",
    "TOTAL AMOUNT": "",
    "SALES  PERSON": "",
    "INVOICE NO": "",
    "STATUS": "PENDING",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData["QUOTATION NO"] || !formData.CLIENT || !formData["QUOTATION DATE"]) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in Quotation No, Client, and Date",
        variant: "destructive",
      });
      return;
    }

    onAdd(formData);
    toast({
      title: "Quotation Added",
      description: `Quotation ${formData["QUOTATION NO"]} has been added successfully.`,
    });
    
    // Reset form
    setFormData({
      "QUOTATION NO": "",
      "QUOTATION DATE": "",
      "CLIENT": "",
      "NEW/OLD": "NEW",
      "DESCRIPTION 1": "",
      "DESCRIPTION 2": "",
      "QTY": "",
      "UNIT COST": "",
      "TOTAL AMOUNT": "",
      "SALES  PERSON": "",
      "INVOICE NO": "",
      "STATUS": "PENDING",
    });
    setOpen(false);
  };

  const handleChange = (field: keyof Quotation, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate total amount if qty and unit cost are present
      if (field === "QTY" || field === "UNIT COST") {
        const qty = parseFloat((field === "QTY" ? value : updated.QTY).replace(/,/g, "")) || 0;
        const unitCost = parseFloat((field === "UNIT COST" ? value : updated["UNIT COST"]).replace(/,/g, "")) || 0;
        const total = qty * unitCost;
        updated["TOTAL AMOUNT"] = total > 0 ? total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
      }
      
      return updated;
    });
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const extractQuotationData = async (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image (JPG, PNG, WEBP) or PDF file.",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    try {
      console.log('Converting file to base64...', file.name, file.type);
      const base64Data = await convertFileToBase64(file);
      
      console.log('Calling extract-quotation function...');
      const { data, error } = await supabase.functions.invoke('extract-quotation', {
        body: { imageData: base64Data }
      });

      console.log('Response:', data, error);

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data.success && data.data) {
        setFormData(data.data);
        toast({
          title: "Success",
          description: "Quotation data extracted successfully!",
        });
      } else {
        throw new Error(data.error || "Failed to extract data");
      }
    } catch (error) {
      console.error('Error extracting quotation:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to extract quotation data";
      toast({
        title: "Extraction Failed",
        description: errorMessage + " Please fill the form manually.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await extractQuotationData(file);
    }
  };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await extractQuotationData(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-brand-teal hover:bg-brand-teal/90">
          <Plus className="w-4 h-4 mr-2" />
          Add New Quotation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Quotation</DialogTitle>
          <DialogDescription>
            Fill in the quotation details below. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 p-4 bg-muted rounded-lg">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              className="hidden"
            />
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isScanning}
          >
            <Camera className="mr-2 h-4 w-4" />
            Take Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload File
          </Button>
        </div>

        {isScanning && (
          <div className="flex items-center justify-center gap-2 p-4 bg-primary/10 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Extracting quotation data...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quotationNo">Quotation No *</Label>
              <Input
                id="quotationNo"
                value={formData["QUOTATION NO"]}
                onChange={(e) => handleChange("QUOTATION NO", e.target.value)}
                placeholder="e.g., 25-0001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Quotation Date *</Label>
              <Input
                id="date"
                value={formData["QUOTATION DATE"]}
                onChange={(e) => handleChange("QUOTATION DATE", e.target.value)}
                placeholder="e.g., 01-Jan-25"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="client">Client *</Label>
              <Input
                id="client"
                value={formData.CLIENT}
                onChange={(e) => handleChange("CLIENT", e.target.value)}
                placeholder="Client name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newOld">Client Type</Label>
              <Select value={formData["NEW/OLD"]} onValueChange={(value) => handleChange("NEW/OLD", value)}>
                <SelectTrigger id="newOld">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">NEW</SelectItem>
                  <SelectItem value="OLD">OLD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salesPerson">Sales Person</Label>
              <Input
                id="salesPerson"
                value={formData["SALES  PERSON"]}
                onChange={(e) => handleChange("SALES  PERSON", e.target.value)}
                placeholder="Sales person name"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="desc1">Description 1</Label>
              <Textarea
                id="desc1"
                value={formData["DESCRIPTION 1"]}
                onChange={(e) => handleChange("DESCRIPTION 1", e.target.value)}
                placeholder="Main description"
                rows={2}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="desc2">Description 2</Label>
              <Textarea
                id="desc2"
                value={formData["DESCRIPTION 2"]}
                onChange={(e) => handleChange("DESCRIPTION 2", e.target.value)}
                placeholder="Additional details"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                value={formData.QTY}
                onChange={(e) => handleChange("QTY", e.target.value)}
                placeholder="e.g., 100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitCost">Unit Cost (AED)</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                value={formData["UNIT COST"]}
                onChange={(e) => handleChange("UNIT COST", e.target.value)}
                placeholder="e.g., 150.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalAmount">Total Amount (AED)</Label>
              <Input
                id="totalAmount"
                value={formData["TOTAL AMOUNT"]}
                onChange={(e) => handleChange("TOTAL AMOUNT", e.target.value)}
                placeholder="Auto-calculated or manual"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.STATUS} onValueChange={(value) => handleChange("STATUS", value)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                  <SelectItem value="INVOICED">INVOICED</SelectItem>
                  <SelectItem value="REGRET">REGRET</SelectItem>
                  <SelectItem value="OPEN">OPEN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="invoiceNo">Invoice No</Label>
              <Input
                id="invoiceNo"
                value={formData["INVOICE NO"]}
                onChange={(e) => handleChange("INVOICE NO", e.target.value)}
                placeholder="Leave empty if not invoiced"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-brand-teal hover:bg-brand-teal/90">
              Add Quotation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
