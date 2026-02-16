import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Plus, Phone, Users, Upload, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, LayoutGrid, List, Eye, Pencil, ArrowUp, ArrowDown, ArrowUpDown, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { PatientExcelImport } from "@/components/PatientExcelImport";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPhone } from "@/lib/patientUtils";

interface Patient {
  id: string;
  patient_name: string;
  phone: string;
  address: string;
  aadhar_card: string;
  govt_id: string;
  new_govt_id: string;
  file_no: string;
  father_name: string;
  age: string;
  category: string | null;
}

type ViewMode = 'grid' | 'table';
type SortColumnType = 'id' | 'file_no' | 'patient_name' | 'phone' | 'aadhar_card' | 'govt_id' | 'category';
type SortDirectionType = 'asc' | 'desc';

interface SortableHeaderProps {
  column: SortColumnType;
  label: string;
  sortColumn: SortColumnType;
  sortDirection: SortDirectionType;
  onSort: (column: SortColumnType) => void;
  className?: string;
}

const SortableHeader = ({ column, label, sortColumn, sortDirection, onSort, className }: SortableHeaderProps) => (
  <TableHead 
    className={`cursor-pointer hover:bg-muted/50 select-none ${className || ''}`}
    onClick={() => onSort(column)}
  >
    <div className="flex items-center gap-1">
      {label}
      {sortColumn === column ? (
        sortDirection === 'asc' ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-30" />
      )}
    </div>
  </TableHead>
);

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fileNoSearch, setFileNoSearch] = useState("");
  const [debouncedFileNo, setDebouncedFileNo] = useState("");
  const [searchTab, setSearchTab] = useState<"general" | "fileno">("general");
  const [showImport, setShowImport] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortColumn, setSortColumn] = useState<SortColumnType>('file_no');
  const [sortDirection, setSortDirection] = useState<SortDirectionType>('desc');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce file number search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFileNo(fileNoSearch);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fileNoSearch]);

  // Load patients with pagination and search
  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('patients')
        .select('*', { count: 'exact' });

      // Apply search filter based on active tab
      if (searchTab === "general" && debouncedSearch.trim()) {
        const search = debouncedSearch.trim();
        query = query.or(
          `patient_name.ilike.%${search}%,phone.ilike.%${search}%,file_no.ilike.%${search}%,aadhar_card.ilike.%${search}%,govt_id.ilike.%${search}%,new_govt_id.ilike.%${search}%`
        );
      } else if (searchTab === "fileno" && debouncedFileNo.trim()) {
        query = query.ilike('file_no', `%${debouncedFileNo.trim()}%`);
      }

      const { data, error, count } = await query
        .order(sortColumn, { ascending: sortDirection === 'asc' })
        .range(from, to);

      if (error) throw error;

      setPatients(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast({
        title: "Error",
        description: "Failed to load patients",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, debouncedFileNo, searchTab, sortColumn, sortDirection]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel('patients-page-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients' },
        () => loadPatients()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPatients]);

  const deletePatient = async (patientId: string) => {
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Patient deleted successfully"
      });
      
      loadPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast({
        title: "Error",
        description: "Failed to delete patient",
        variant: "destructive"
      });
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleSort = (column: SortColumnType) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="p-6 space-y-6 relative">
      <FloatingOrbs />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple via-cyan to-pink bg-clip-text text-transparent">
            Patients
          </h1>
          <p className="text-muted-foreground mt-2">
            {loading ? "Loading patients..." : `${totalCount.toLocaleString()} patients total`}
            {searchTab === "general" && debouncedSearch && ` matching "${debouncedSearch}"`}
            {searchTab === "fileno" && debouncedFileNo && ` with file no. "${debouncedFileNo}"`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(!showImport)} className="glass-subtle border-purple/20 hover:border-purple/40 hover:bg-purple/5">
            <Upload className="h-4 w-4 mr-2 text-purple" />
            Import Excel
          </Button>
          <Button asChild className="bg-gradient-to-r from-gold to-orange hover:shadow-glow-gold text-white font-semibold">
            <Link to="/patients/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Patient
            </Link>
          </Button>
        </div>
      </div>

      {/* Import Section */}
      <Collapsible open={showImport} onOpenChange={setShowImport}>
        <CollapsibleContent>
          <PatientExcelImport />
        </CollapsibleContent>
      </Collapsible>

      {/* Search */}
      <Card className="glass-strong border-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple/5 via-transparent to-cyan/5" />
        <CardContent className="pt-6 relative">
          <Tabs value={searchTab} onValueChange={(v) => setSearchTab(v as "general" | "fileno")}>
            <div className="flex items-center justify-between mb-4">
              <TabsList className="glass-subtle border-purple/20">
                <TabsTrigger value="general" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple data-[state=active]:to-cyan data-[state=active]:text-white">
                  <Search className="h-4 w-4" />
                  General Search
                </TabsTrigger>
                <TabsTrigger value="fileno" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan data-[state=active]:to-teal data-[state=active]:text-white">
                  <FileText className="h-4 w-4" />
                  File No. Search
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Per page:</span>
                  <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="24">24</SelectItem>
                      <SelectItem value="48">48</SelectItem>
                      <SelectItem value="96">96</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)}>
                  <ToggleGroupItem value="grid" aria-label="Grid view">
                    <LayoutGrid className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="table" aria-label="Table view">
                    <List className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
            <TabsContent value="general" className="mt-0">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patients by name, phone, file no., Aadhar, or govt ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </TabsContent>
            <TabsContent value="fileno" className="mt-0">
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter file number to search..."
                  value={fileNoSearch}
                  onChange={(e) => setFileNoSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: pageSize }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loading State - Table */}
      {loading && viewMode === 'table' && (
        <Card>
          <CardContent className="p-0">
            <div className="animate-pulse">
              <div className="h-12 bg-muted border-b"></div>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-14 border-b flex items-center gap-4 px-4">
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-4 bg-muted rounded w-28"></div>
                  <div className="h-4 bg-muted rounded flex-1"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patients Grid View */}
      {!loading && viewMode === 'grid' && patients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient, index) => (
            <Card key={patient.id} className="glass-strong border-0 overflow-hidden relative hover:shadow-glow transition-all duration-300 group">
              <div className={`absolute inset-0 bg-gradient-to-br ${
                index % 4 === 0 ? 'from-purple/10 via-transparent to-cyan/10' :
                index % 4 === 1 ? 'from-cyan/10 via-transparent to-teal/10' :
                index % 4 === 2 ? 'from-gold/10 via-transparent to-orange/10' :
                'from-pink/10 via-transparent to-purple/10'
              } opacity-50 group-hover:opacity-100 transition-opacity`} />
              <CardHeader className="relative">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">{patient.patient_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{patient.age ? `${patient.age} years old` : 'Age not specified'}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {patient.category && (
                      <Badge className={`${
                        patient.category === 'BNX' ? 'bg-gradient-to-r from-orange to-gold text-white border-0' :
                        patient.category === 'TPN' ? 'bg-gradient-to-r from-cyan to-teal text-white border-0' :
                        patient.category === 'PSHY' ? 'bg-gradient-to-r from-purple to-pink text-white border-0' :
                        'bg-gradient-to-r from-emerald to-teal text-white border-0'
                      }`}>
                        {patient.category}
                      </Badge>
                    )}
                    <Badge className="bg-gradient-to-r from-emerald to-teal text-white border-0">Active</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-3">
                  {patient.father_name && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Father:</span> {patient.father_name}
                    </div>
                  )}
                  {patient.file_no && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">File No.:</span> {patient.file_no}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 mr-2 text-cyan" />
                    {formatPhone(patient.phone) || 'N/A'}
                  </div>
                  {patient.address && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Address:</span> {patient.address}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Aadhar:</span> {patient.aadhar_card || 'N/A'}
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1 glass-subtle border-cyan/20 hover:border-cyan/40 hover:bg-cyan/5" asChild>
                      <Link to={`/patients/view/${patient.id}`}>
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 glass-subtle border-purple/20 hover:border-purple/40 hover:bg-purple/5" asChild>
                      <Link to={`/patients/edit/${patient.id}`}>
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="glass-subtle border-pink/20 hover:border-pink/40 hover:bg-pink/5">
                          <Trash2 className="h-4 w-4 text-pink" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="glass-strong border-0">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Patient</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {patient.patient_name}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="glass-subtle">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-gradient-to-r from-pink to-destructive text-white hover:shadow-lg"
                            onClick={() => deletePatient(patient.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Patients Table View */}
      {!loading && viewMode === 'table' && patients.length > 0 && (
        <Card className="glass-strong border-0 overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-purple/10 via-cyan/10 to-teal/10 border-b border-purple/20">
                  <SortableHeader column="id" label="ID" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="w-16 text-purple font-semibold" />
                  <SortableHeader column="file_no" label="File No." sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="w-20 text-cyan font-semibold" />
                  <SortableHeader column="patient_name" label="Name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-foreground font-semibold" />
                  <SortableHeader column="phone" label="Phone" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-foreground font-semibold" />
                  <SortableHeader column="aadhar_card" label="Aadhar" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-foreground font-semibold" />
                  <SortableHeader column="govt_id" label="Govt ID" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-foreground font-semibold" />
                  <SortableHeader column="category" label="Category" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="w-20 text-foreground font-semibold" />
                  <TableHead className="w-32 text-right text-foreground font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient, index) => (
                  <TableRow key={patient.id} className={`hover:bg-gradient-to-r hover:from-purple/5 hover:via-transparent hover:to-cyan/5 transition-all ${index % 2 === 0 ? 'bg-background/50' : 'bg-muted/20'}`}>
                    <TableCell className="font-medium text-purple">{patient.id}</TableCell>
                    <TableCell className="text-cyan font-mono">{patient.file_no || '-'}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{patient.patient_name}</div>
                        {patient.age && (
                          <div className="text-xs text-muted-foreground">{patient.age} years</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatPhone(patient.phone) || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{patient.aadhar_card || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{patient.govt_id || '-'}</TableCell>
                    <TableCell>
                      {patient.category && (
                        <Badge className={`text-xs ${
                          patient.category === 'BNX' ? 'bg-gradient-to-r from-orange to-gold text-white border-0' :
                          patient.category === 'TPN' ? 'bg-gradient-to-r from-cyan to-teal text-white border-0' :
                          patient.category === 'PSHY' ? 'bg-gradient-to-r from-purple to-pink text-white border-0' :
                          'bg-gradient-to-r from-emerald to-teal text-white border-0'
                        }`}>
                          {patient.category}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="hover:bg-cyan/10 hover:text-cyan" asChild>
                          <Link to={`/patients/view/${patient.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" className="hover:bg-purple/10 hover:text-purple" asChild>
                          <Link to={`/patients/edit/${patient.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="hover:bg-pink/10">
                              <Trash2 className="h-4 w-4 text-pink" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="glass-strong border-0">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Patient</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {patient.patient_name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="glass-subtle">Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-gradient-to-r from-pink to-destructive text-white hover:shadow-lg"
                                onClick={() => deletePatient(patient.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && patients.length === 0 && (
        <Card className="glass-strong border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple/5 via-transparent to-cyan/5" />
          <CardContent className="text-center py-12 relative">
            <div className="p-4 rounded-full bg-gradient-to-r from-purple/10 to-cyan/10 w-fit mx-auto mb-4">
              <Users className="h-12 w-12 text-purple" />
            </div>
            <h3 className="text-lg font-medium mb-2">No patients found</h3>
            <p className="text-muted-foreground mb-4">
              {(searchTerm || fileNoSearch) ? "Try adjusting your search terms" : "Get started by adding your first patient"}
            </p>
            <Button asChild className="bg-gradient-to-r from-purple to-cyan hover:shadow-glow text-white">
              <Link to="/patients/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Patient
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <Card className="glass-strong border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple/5 via-transparent to-cyan/5" />
          <CardContent className="py-4 relative">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing <span className="text-purple font-medium">{((currentPage - 1) * pageSize) + 1}</span> to <span className="text-purple font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="text-cyan font-medium">{totalCount.toLocaleString()}</span> patients
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="glass-subtle border-purple/20 hover:border-purple/40 disabled:opacity-50"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="glass-subtle border-purple/20 hover:border-purple/40 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {getPageNumbers().map((page, idx) => (
                  typeof page === 'number' ? (
                    <Button
                      key={idx}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(page)}
                      className={`min-w-[36px] ${currentPage === page ? 'bg-gradient-to-r from-purple to-cyan text-white border-0 shadow-glow' : 'glass-subtle border-purple/20 hover:border-purple/40'}`}
                    >
                      {page}
                    </Button>
                  ) : (
                    <span key={idx} className="px-2 text-muted-foreground">...</span>
                  )
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="glass-subtle border-cyan/20 hover:border-cyan/40 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="glass-subtle border-cyan/20 hover:border-cyan/40 disabled:opacity-50"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
