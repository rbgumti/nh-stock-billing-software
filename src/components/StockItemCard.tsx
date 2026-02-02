import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Check, X, Pencil, AlertTriangle, Clock } from "lucide-react";
import { StockItem } from "@/hooks/useStockStore";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPrecision } from "@/lib/formatUtils";

interface EditingState {
  id: number;
  batchNo: string;
  expiryDate: string;
  qty: number;
  mrp: string;
}

interface StockItemCardProps {
  item: StockItem;
  batches: StockItem[]; // All batches for this medicine
  index: number;
  getCategoryStyle: (category: string) => {
    bg: string;
    text: string;
    border: string;
    badge: string;
    iconBg: string;
    Icon: React.ElementType;
  };
  getStockStatus: (current: number, minimum: number) => { label: string; variant?: string };
  onViewLedger: (item: StockItem) => void;
  onEdit: (item: StockItem) => void;
  onReorder: () => void;
  isAdmin?: boolean;
  onStockUpdated?: () => void; // Callback to refresh stock data
}

export function StockItemCard({
  item,
  batches,
  index,
  getCategoryStyle,
  getStockStatus,
  onViewLedger,
  onEdit,
  onReorder,
  isAdmin = false,
  onStockUpdated,
}: StockItemCardProps) {
  // Store editing state per batch using a map-like state
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate total stock across all batches
  const totalStock = batches.reduce((sum, b) => sum + b.currentStock, 0);
  const stockStatus = getStockStatus(totalStock, item.minimumStock);
  const categoryStyle = getCategoryStyle(item.category);
  const CategoryIcon = categoryStyle.Icon;

  const isValidExpiry = (dateStr: string) => {
    return dateStr && dateStr !== 'N/A' && dateStr.trim() !== '' && !isNaN(new Date(dateStr).getTime());
  };

  const getExpiryStatus = (dateStr: string) => {
    if (!isValidExpiry(dateStr)) return null;
    const expiry = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return { status: 'expired', label: 'Expired', daysText: 'Expired', color: 'destructive' };
    if (diffDays <= 30) return { status: 'critical', label: 'Expiring', daysText: `${diffDays}d`, color: 'destructive' };
    if (diffDays <= 60) return { status: 'warning', label: 'Soon', daysText: `${diffDays}d`, color: 'orange' };
    if (diffDays <= 90) return { status: 'caution', label: 'Check', daysText: `${diffDays}d`, color: 'yellow' };
    return null;
  };

  const formatExpiry = (dateStr: string) => {
    if (!isValidExpiry(dateStr)) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const isValidBatch = (batch: string) => {
    return batch && batch !== 'N/A' && !batch.startsWith('BATCH');
  };

  const startEditingBatch = (batch: StockItem) => {
    setEditingState({
      id: batch.id,
      batchNo: batch.batchNo || "",
      expiryDate: batch.expiryDate || "",
      qty: batch.currentStock || 0,
      mrp: batch.mrp?.toString() || "",
    });
  };

  const updateEditingField = (field: keyof Omit<EditingState, 'id'>, value: string | number) => {
    if (!editingState) return;
    setEditingState(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSaveBatchExpiry = async (batch: StockItem) => {
    if (!editingState || editingState.id !== batch.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('stock_items')
        .update({
          batch_no: editingState.batchNo || batch.batchNo,
          expiry_date: editingState.expiryDate || batch.expiryDate,
          current_stock: editingState.qty,
          mrp: editingState.mrp ? parseFloat(editingState.mrp) : batch.mrp,
        })
        .eq('item_id', batch.id);

      if (error) throw error;

      toast.success("Batch details updated successfully");
      setEditingState(null);
      
      // Trigger stock data refresh to update cumulative totals
      onStockUpdated?.();
    } catch (error) {
      console.error("Error updating batch details:", error);
      toast.error("Failed to update batch details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingState(null);
  };

  // Check if any batch has expiry warning
  const hasExpiryWarning = batches.some(b => getExpiryStatus(b.expiryDate));
  const criticalBatch = batches.find(b => {
    const status = getExpiryStatus(b.expiryDate);
    return status?.status === 'expired' || status?.status === 'critical';
  });

  return (
    <Card className={`glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300 border-l-4 ${categoryStyle.border} ${
      criticalBatch ? 'ring-2 ring-destructive/30' : ''
    }`}>
      {/* Warning Banner for critical items */}
      {criticalBatch && (
        <div className="absolute top-0 left-0 right-0 px-3 py-1 flex items-center justify-between text-xs font-medium bg-gradient-to-r from-destructive to-pink text-white">
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Expiry Alert
          </span>
        </div>
      )}
      
      <div className={`absolute inset-0 bg-gradient-to-br ${
        index % 4 === 0 ? 'from-purple/5 via-transparent to-cyan/5' :
        index % 4 === 1 ? 'from-cyan/5 via-transparent to-teal/5' :
        index % 4 === 2 ? 'from-gold/5 via-transparent to-orange/5' :
        'from-pink/5 via-transparent to-purple/5'
      } opacity-50 group-hover:opacity-100 transition-opacity`} />
      
      <CardHeader className={`relative pb-2 ${criticalBatch ? 'pt-8' : ''}`}>
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg bg-gradient-to-r ${
              item.category === 'BNX' ? 'from-blue-500 to-cyan' :
              item.category === 'TPN' ? 'from-amber-500 to-orange' :
              item.category === 'PSHY' ? 'from-purple to-pink' :
              'from-gray-500 to-gray-600'
            }`}>
              <CategoryIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <Badge className={`${
                  item.category === 'BNX' ? 'bg-gradient-to-r from-blue-500 to-cyan text-white border-0' :
                  item.category === 'TPN' ? 'bg-gradient-to-r from-amber-500 to-orange text-white border-0' :
                  item.category === 'PSHY' ? 'bg-gradient-to-r from-purple to-pink text-white border-0' :
                  'bg-gray-500 text-white border-0'
                }`}>
                  {item.category}
                </Badge>
              </div>
              {/* Total Stock Display */}
              <div className="mt-1 flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Total Qty:</span>
                <span className={`text-xl font-bold ${
                  stockStatus.label === 'Critical' ? 'text-destructive' :
                  stockStatus.label === 'Low Stock' ? 'text-orange-500' :
                  'bg-gradient-to-r from-emerald to-teal bg-clip-text text-transparent'
                }`}>
                  {totalStock}
                </span>
                <Badge className={`${
                  stockStatus.label === 'Critical' ? 'bg-gradient-to-r from-destructive to-pink text-white border-0' :
                  stockStatus.label === 'Low Stock' ? 'bg-gradient-to-r from-orange to-gold text-white border-0' :
                  'bg-gradient-to-r from-emerald to-teal text-white border-0'
                }`}>
                  {stockStatus.label}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-2 relative">
        <div className="space-y-3">
          {/* Batch-wise Details Table */}
          <div className="border border-border/50 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground text-xs">Batch No</th>
                  <th className="px-2 py-1.5 text-right font-medium text-muted-foreground text-xs">Qty</th>
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground text-xs">Expiry</th>
                  <th className="px-2 py-1.5 text-right font-medium text-muted-foreground text-xs">MRP</th>
                  <th className="px-2 py-1.5 text-center font-medium text-muted-foreground text-xs w-10"></th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch, idx) => {
                  const expiryStatus = getExpiryStatus(batch.expiryDate);
                  const isEditing = editingState?.id === batch.id;
                  
                  return (
                    <tr 
                      key={batch.id} 
                      className={`${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'} ${
                        expiryStatus?.status === 'expired' ? 'bg-destructive/10' :
                        expiryStatus?.status === 'critical' ? 'bg-destructive/5' : ''
                      }`}
                    >
                      <td className="px-2 py-1.5">
                        {isEditing ? (
                          <Input
                            value={editingState.batchNo}
                            onChange={(e) => updateEditingField('batchNo', e.target.value)}
                            placeholder="Batch"
                            className="h-6 text-xs px-1"
                          />
                        ) : (
                          <span className="font-medium">{isValidBatch(batch.batchNo) ? batch.batchNo : '-'}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editingState.qty}
                            onChange={(e) => updateEditingField('qty', parseInt(e.target.value) || 0)}
                            min={0}
                            className="h-6 text-xs px-1 w-16 text-right"
                          />
                        ) : (
                          batch.currentStock
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editingState.expiryDate}
                            onChange={(e) => updateEditingField('expiryDate', e.target.value)}
                            className="h-6 text-xs px-1"
                          />
                        ) : (
                          <span className={`flex items-center gap-1 ${
                            expiryStatus?.status === 'expired' ? 'text-destructive font-medium' :
                            expiryStatus?.status === 'critical' ? 'text-destructive' :
                            expiryStatus?.status === 'warning' ? 'text-orange-500' :
                            expiryStatus?.status === 'caution' ? 'text-yellow-600' : ''
                          }`}>
                            {formatExpiry(batch.expiryDate)}
                            {expiryStatus && (
                              <span className="text-xs">({expiryStatus.daysText})</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editingState.mrp}
                            onChange={(e) => updateEditingField('mrp', e.target.value)}
                            step="0.00001"
                            min={0}
                            placeholder="MRP"
                            className="h-6 text-xs px-1 w-20 text-right"
                          />
                        ) : (
                          batch.mrp ? `₹${formatPrecision(batch.mrp)}` : '-'
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {isEditing ? (
                          <div className="flex gap-0.5 justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 hover:bg-emerald/10 text-emerald"
                              onClick={() => handleSaveBatchExpiry(batch)}
                              disabled={isSaving}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 hover:bg-destructive/10 text-destructive"
                              onClick={handleCancelEdit}
                              disabled={isSaving}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : isAdmin ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 hover:bg-purple/10"
                            onClick={() => startEditingBatch(batch)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Unit Price & Value Summary */}
          <div className="grid grid-cols-2 gap-4 text-sm pt-1">
            <div>
              <p className="text-muted-foreground text-xs">Cost/Tab</p>
              <p className="font-semibold">₹{formatPrecision(item.unitPrice)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Total Value</p>
              <p className="font-semibold bg-gradient-to-r from-gold to-orange bg-clip-text text-transparent">
                ₹{formatPrecision(totalStock * item.unitPrice)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <Button 
              size="sm" 
              className="w-full bg-gradient-to-r from-purple to-cyan hover:shadow-glow text-white"
              onClick={() => onViewLedger(item)}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Stock Ledger
            </Button>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 glass-subtle border-cyan/20 hover:border-cyan/40"
                onClick={() => onEdit(item)}
              >
                Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 glass-subtle border-gold/20 hover:border-gold/40"
                onClick={onReorder}
              >
                Reorder
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
