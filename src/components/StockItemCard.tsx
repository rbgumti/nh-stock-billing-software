import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Check, X, Pencil, AlertTriangle } from "lucide-react";
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
  onStockUpdated?: () => void;
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
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
      // Force a small delay then trigger refresh to ensure realtime picks up changes
      setTimeout(() => {
        onStockUpdated?.();
      }, 300);
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

  const criticalBatch = batches.find(b => {
    const status = getExpiryStatus(b.expiryDate);
    return status?.status === 'expired' || status?.status === 'critical';
  });

  return (
    <Card className={`glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300 ${
      criticalBatch ? 'ring-1 ring-destructive/30' : ''
    }`}>
      {/* Warning Banner */}
      {criticalBatch && (
        <div className="absolute top-0 left-0 right-0 px-3 py-1 flex items-center gap-2 text-xs font-medium bg-gradient-to-r from-destructive to-pink text-white">
          <AlertTriangle className="h-3 w-3" />
          Expiry Alert
        </div>
      )}
      
      <CardContent className={`p-4 ${criticalBatch ? 'pt-8' : ''}`}>
        {/* Horizontal Layout Container */}
        <div className="flex flex-col lg:flex-row gap-4">
          
          {/* Left Section: Medicine Info */}
          <div className="flex items-start gap-3 lg:w-64 lg:flex-shrink-0">
            <div className={`p-2 rounded-lg bg-gradient-to-r ${
              item.category === 'BNX' ? 'from-blue-500 to-cyan' :
              item.category === 'TPN' ? 'from-amber-500 to-orange' :
              item.category === 'PSHY' ? 'from-purple to-pink' :
              'from-gray-500 to-gray-600'
            }`}>
              <CategoryIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base truncate">{item.name}</h3>
                <Badge className={`text-[10px] px-1.5 py-0 h-4 ${
                  item.category === 'BNX' ? 'bg-gradient-to-r from-blue-500 to-cyan text-white border-0' :
                  item.category === 'TPN' ? 'bg-gradient-to-r from-amber-500 to-orange text-white border-0' :
                  item.category === 'PSHY' ? 'bg-gradient-to-r from-purple to-pink text-white border-0' :
                  'bg-gray-500 text-white border-0'
                }`}>
                  {item.category}
                </Badge>
              </div>
              {/* Stock Summary */}
              <div className="mt-1 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Total:</span>
                  <span className={`text-lg font-bold ${
                    stockStatus.label === 'Critical' ? 'text-destructive' :
                    stockStatus.label === 'Low Stock' ? 'text-orange-500' :
                    'bg-gradient-to-r from-emerald to-teal bg-clip-text text-transparent'
                  }`}>
                    {totalStock}
                  </span>
                </div>
                <Badge className={`text-[10px] px-1.5 py-0 h-4 ${
                  stockStatus.label === 'Critical' ? 'bg-gradient-to-r from-destructive to-pink text-white border-0' :
                  stockStatus.label === 'Low Stock' ? 'bg-gradient-to-r from-orange to-gold text-white border-0' :
                  'bg-gradient-to-r from-emerald to-teal text-white border-0'
                }`}>
                  {stockStatus.label}
                </Badge>
              </div>
              {/* Unit Price & Value */}
              <div className="mt-1 flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">
                  Cost: <span className="font-medium text-foreground">₹{formatPrecision(item.unitPrice)}</span>
                </span>
                <span className="text-muted-foreground">
                  Value: <span className="font-semibold bg-gradient-to-r from-gold to-orange bg-clip-text text-transparent">
                    ₹{formatPrecision(totalStock * item.unitPrice)}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Center Section: Batch Table */}
          <div className="flex-1 min-w-0">
            <div className="border border-border/50 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Batch</th>
                    <th className="px-2 py-1.5 text-center font-medium text-muted-foreground w-20">Qty</th>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Expiry</th>
                    <th className="px-2 py-1.5 text-right font-medium text-muted-foreground w-20">MRP</th>
                    {isAdmin && <th className="px-2 py-1.5 text-center font-medium text-muted-foreground w-28">Actions</th>}
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
                              className="h-7 text-xs px-2"
                            />
                          ) : (
                            <span className="font-medium">{isValidBatch(batch.batchNo) ? batch.batchNo : '-'}</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editingState.qty}
                              onChange={(e) => updateEditingField('qty', parseInt(e.target.value) || 0)}
                              min={0}
                              className="h-7 text-xs px-2 w-16 text-center mx-auto"
                            />
                          ) : (
                            <span className="font-semibold">{batch.currentStock}</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {isEditing ? (
                            <Input
                              type="date"
                              value={editingState.expiryDate}
                              onChange={(e) => updateEditingField('expiryDate', e.target.value)}
                              className="h-7 text-xs px-2"
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
                                <span className="text-[10px]">({expiryStatus.daysText})</span>
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
                              className="h-7 text-xs px-2 w-20 text-right ml-auto"
                            />
                          ) : (
                            batch.mrp ? `₹${formatPrecision(batch.mrp)}` : '-'
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-2 py-1.5 text-center">
                            {isEditing ? (
                              <div className="flex gap-1 justify-center">
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-7 px-3 text-xs bg-gradient-to-r from-emerald to-teal hover:shadow-glow text-white"
                                  onClick={() => handleSaveBatchExpiry(batch)}
                                  disabled={isSaving}
                                >
                                  {isSaving ? (
                                    <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                                  ) : (
                                    <>
                                      <Check className="h-3 w-3 mr-1" />
                                      Save
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                                  onClick={handleCancelEdit}
                                  disabled={isSaving}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 hover:bg-purple/10"
                                onClick={() => startEditingBatch(batch)}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Section: Action Buttons */}
          <div className="flex lg:flex-col gap-2 lg:w-24 lg:flex-shrink-0 justify-end">
            <Button 
              size="sm" 
              className="h-8 text-xs bg-gradient-to-r from-purple to-cyan hover:shadow-glow text-white"
              onClick={() => onViewLedger(item)}
            >
              <BookOpen className="h-3.5 w-3.5 mr-1" />
              Ledger
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs glass-subtle border-cyan/20 hover:border-cyan/40"
              onClick={() => onEdit(item)}
            >
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs glass-subtle border-gold/20 hover:border-gold/40"
              onClick={onReorder}
            >
              Reorder
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
