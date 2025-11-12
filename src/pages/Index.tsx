import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { QuotationFilters } from "@/components/QuotationFilters";
import { QuotationStats } from "@/components/QuotationStats";
import { QuotationTable } from "@/components/QuotationTable";
import { AddQuotationDialog } from "@/components/AddQuotationDialog";
import { EditQuotationDialog } from "@/components/EditQuotationDialog";
import { Quotation } from "@/types/quotation";
import quotationsData from "@/data/quotations.json";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<Quotation[]>(quotationsData as Quotation[]);
  const [loading, setLoading] = useState(true);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    client: "all",
    status: "all",
    salesPerson: "all",
    newOld: "all",
    quotationNo: "",
    invoiceNo: "",
    dateFrom: "",
    dateTo: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Check authentication
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Save to localStorage whenever quotations change
  useEffect(() => {
    localStorage.setItem('quotations', JSON.stringify(quotations));
  }, [quotations]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('quotations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuotations(parsed);
        }
      } catch (e) {
        console.error('Failed to load saved quotations');
      }
    }
  }, []);

  // Get unique values for filters (excluding empty strings)
  const uniqueClients = useMemo(() => {
    return Array.from(new Set(quotations.map((q) => q.CLIENT).filter(c => c && c.trim() !== ""))).sort();
  }, [quotations]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(quotations.map((q) => q.STATUS).filter(s => s && s.trim() !== ""))).sort();
  }, [quotations]);

  const uniqueSalesPeople = useMemo(() => {
    return Array.from(new Set(quotations.map((q) => q["SALES  PERSON"]).filter(p => p && p.trim() !== ""))).sort();
  }, [quotations]);

  // Filter quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((quotation) => {
      // Search query filter (searches across all fields)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableFields = [
          quotation["QUOTATION NO"],
          quotation.CLIENT,
          quotation["DESCRIPTION 1"],
          quotation["DESCRIPTION 2"],
          quotation["SALES  PERSON"],
          quotation.STATUS,
          quotation["INVOICE NO"],
        ];
        if (!searchableFields.some((field) => field.toLowerCase().includes(query))) {
          return false;
        }
      }

      // Client filter
      if (filters.client !== "all" && quotation.CLIENT !== filters.client) {
        return false;
      }

      // Status filter
      if (filters.status !== "all" && quotation.STATUS !== filters.status) {
        return false;
      }

      // Sales person filter
      if (filters.salesPerson !== "all" && quotation["SALES  PERSON"] !== filters.salesPerson) {
        return false;
      }

      // New/Old filter
      if (filters.newOld !== "all" && quotation["NEW/OLD"] !== filters.newOld) {
        return false;
      }

      // Quotation number filter
      if (filters.quotationNo && !quotation["QUOTATION NO"].toLowerCase().includes(filters.quotationNo.toLowerCase())) {
        return false;
      }

      // Invoice number filter
      if (filters.invoiceNo && !quotation["INVOICE NO"].toLowerCase().includes(filters.invoiceNo.toLowerCase())) {
        return false;
      }

      // Date filters
      if (filters.dateFrom || filters.dateTo) {
        const quotationDate = parseDate(quotation["QUOTATION DATE"]);
        if (filters.dateFrom && quotationDate < new Date(filters.dateFrom)) {
          return false;
        }
        if (filters.dateTo && quotationDate > new Date(filters.dateTo)) {
          return false;
        }
      }

      return true;
    });
  }, [quotations, filters, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalAmount = filteredQuotations.reduce((sum, q) => {
      const amount = parseFloat(q["TOTAL AMOUNT"].replace(/,/g, ""));
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const invoicedCount = filteredQuotations.filter((q) => q.STATUS === "INVOICED").length;
    const regretCount = filteredQuotations.filter((q) => q.STATUS === "REGRET").length;

    return {
      totalQuotations: filteredQuotations.length,
      totalAmount,
      invoicedCount,
      regretCount,
    };
  }, [filteredQuotations]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      client: "all",
      status: "all",
      salesPerson: "all",
      newOld: "all",
      quotationNo: "",
      invoiceNo: "",
      dateFrom: "",
      dateTo: "",
    });
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleAddQuotation = (newQuotation: Quotation) => {
    setQuotations(prev => [newQuotation, ...prev]);
  };

  const handleEditQuotation = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = (updatedQuotation: Quotation, originalQuotationNo: string) => {
    setQuotations(prev => 
      prev.map(q => 
        q["QUOTATION NO"] === originalQuotationNo ? updatedQuotation : q
      )
    );
  };

  const handleExportExcel = () => {
    exportToExcel(filteredQuotations, 'rea_quotations');
    toast({
      title: "Export Successful",
      description: `Exported ${filteredQuotations.length} quotations to Excel.`,
    });
  };

  const handleExportPDF = () => {
    exportToPDF(filteredQuotations, 'rea_quotations');
    toast({
      title: "Export Successful",
      description: `Exported ${filteredQuotations.length} quotations to PDF.`,
    });
  };

  const parseDate = (dateStr: string): Date => {
    const [day, month, year] = dateStr.split("-");
    const monthMap: { [key: string]: number } = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
    };
    return new Date(2000 + parseInt(year), monthMap[month], parseInt(day));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex flex-col">
      <Header />
      
      <div className="container mx-auto py-8 px-4 flex-1">
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Quotation Management</h2>
            <p className="text-muted-foreground">Track, manage, and export your quotations</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <AddQuotationDialog onAdd={handleAddQuotation} />
            <Button 
              onClick={handleExportExcel}
              variant="outline"
              className="border-success text-success hover:bg-success hover:text-white"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
            <Button 
              onClick={handleExportPDF}
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            placeholder="Search across all fields..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 h-12 text-lg shadow-sm border-2 focus:border-brand-teal"
          />
        </div>

        <QuotationStats
          totalQuotations={stats.totalQuotations}
          totalAmount={stats.totalAmount}
          invoicedCount={stats.invoicedCount}
          regretCount={stats.regretCount}
        />

        <QuotationFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          uniqueClients={uniqueClients}
          uniqueStatuses={uniqueStatuses}
          uniqueSalesPeople={uniqueSalesPeople}
        />

        <div className="mt-6">
          <QuotationTable
            quotations={filteredQuotations}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onEdit={handleEditQuotation}
          />
        </div>

        <EditQuotationDialog
          quotation={editingQuotation}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleSaveEdit}
        />
      </div>

      <Footer />
    </div>
  );
};

export default Index;
