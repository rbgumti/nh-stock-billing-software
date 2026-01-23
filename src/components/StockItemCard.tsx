import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Check, X, Pencil, AlertTriangle, Clock } from "lucide-react";
import { StockItem } from "@/hooks/useStockStore";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface StockItemCardProps {
  item: StockItem;
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
}

export function StockItemCard({
  item,
  index,
  getCategoryStyle,
  getStockStatus,
  onViewLedger,
  onEdit,
  onReorder,
}: StockItemCardProps) {
  const [isEditingBatch, setIsEditingBatch] = useState(false);
  const [editBatchNo, setEditBatchNo] = useState(item.batchNo || "");
  const [editExpiryDate, setEditExpiryDate] = useState(item.expiryDate || "");
  const [isSaving, setIsSaving] = useState(false);

  const stockStatus = getStockStatus(item.currentStock, item.minimumStock);
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
    if (diffDays <= 30) return { status: 'critical', label: 'Expiring', daysText: `${diffDays}d left`, color: 'destructive' };
    if (diffDays <= 60) return { status: 'warning', label: 'Expiring Soon', daysText: `${diffDays}d left`, color: 'orange' };
    if (diffDays <= 90) return { status: 'caution', label: 'Check Expiry', daysText: `${diffDays}d left`, color: 'yellow' };
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

  const handleSaveBatchExpiry = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('stock_items')
        .update({
          batch_no: editBatchNo || item.batchNo,
          expiry_date: editExpiryDate || item.expiryDate,
        })
        .eq('item_id', item.id);

      if (error) throw error;

      toast.success("Batch & Expiry updated successfully");
      setIsEditingBatch(false);
    } catch (error) {
      console.error("Error updating batch/expiry:", error);
      toast.error("Failed to update batch & expiry");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditBatchNo(item.batchNo || "");
    setEditExpiryDate(item.expiryDate || "");
    setIsEditingBatch(false);
  };

  const expiryStatus = getExpiryStatus(item.expiryDate);

  return (
    <Card className={`glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300 border-l-4 ${categoryStyle.border} ${
      expiryStatus?.status === 'expired' ? 'ring-2 ring-destructive/50' : 
      expiryStatus?.status === 'critical' ? 'ring-2 ring-destructive/30' : ''
    }`}>
      {/* Expiry Warning Banner */}
      {expiryStatus && (
        <div className={`absolute top-0 left-0 right-0 px-3 py-1.5 flex items-center justify-between text-xs font-medium ${
          expiryStatus.status === 'expired' ? 'bg-destructive text-white' :
          expiryStatus.status === 'critical' ? 'bg-gradient-to-r from-destructive to-pink text-white' :
          expiryStatus.status === 'warning' ? 'bg-gradient-to-r from-orange to-amber-500 text-white' :
          'bg-gradient-to-r from-yellow-500 to-amber-400 text-black'
        }`}>
          <span className="flex items-center gap-1">
            {expiryStatus.status === 'expired' ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {expiryStatus.label}
          </span>
          <span>{expiryStatus.daysText}</span>
        </div>
      )}
      <div className={`absolute inset-0 bg-gradient-to-br ${
        index % 4 === 0 ? 'from-purple/5 via-transparent to-cyan/5' :
        index % 4 === 1 ? 'from-cyan/5 via-transparent to-teal/5' :
        index % 4 === 2 ? 'from-gold/5 via-transparent to-orange/5' :
        'from-pink/5 via-transparent to-purple/5'
      } opacity-50 group-hover:opacity-100 transition-opacity`} />
      <CardHeader className={`relative ${expiryStatus ? 'pt-10' : ''}`}>
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-r ${
              item.category === 'BNX' ? 'from-blue-500 to-cyan' :
              item.category === 'TPN' ? 'from-amber-500 to-orange' :
              item.category === 'PSHY' ? 'from-purple to-pink' :
              'from-gray-500 to-gray-600'
            }`}>
              <CategoryIcon className="h-5 w-5 text-white" />
            </div>
            <div>
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
          </div>
          <Badge className={`${
            stockStatus.label === 'Critical' ? 'bg-gradient-to-r from-destructive to-pink text-white border-0' :
            stockStatus.label === 'Low Stock' ? 'bg-gradient-to-r from-orange to-gold text-white border-0' :
            'bg-gradient-to-r from-emerald to-teal text-white border-0'
          }`}>
            {stockStatus.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 relative">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Current Stock</p>
              <p className="font-semibold">{item.currentStock}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Minimum Stock</p>
              <p className="font-semibold">{item.minimumStock}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Unit Price</p>
              <p className="font-semibold">₹{item.unitPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Value</p>
              <p className="font-semibold bg-gradient-to-r from-gold to-orange bg-clip-text text-transparent">₹{(item.currentStock * item.unitPrice).toFixed(2)}</p>
            </div>
          </div>

          <div className="text-sm">
            <p className="text-muted-foreground">Supplier</p>
            <p className="font-medium">{item.supplier}</p>
          </div>

          {/* Batch & Expiry Section */}
          <div className="border-t border-border/50 pt-3 mt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Batch & Expiry</p>
              {!isEditingBatch ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-purple/10"
                  onClick={() => setIsEditingBatch(true)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-emerald/10 text-emerald"
                    onClick={handleSaveBatchExpiry}
                    disabled={isSaving}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-destructive/10 text-destructive"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            
            {isEditingBatch ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Batch No</label>
                  <Input
                    value={editBatchNo}
                    onChange={(e) => setEditBatchNo(e.target.value)}
                    placeholder="Enter batch"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Expiry Date</label>
                  <Input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Batch No</p>
                  <p className="font-medium">{isValidBatch(item.batchNo) ? item.batchNo : '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expiry</p>
                  <p className={`font-medium ${
                    expiryStatus?.status === 'expired' ? 'text-destructive' :
                    expiryStatus?.status === 'critical' ? 'text-destructive' :
                    expiryStatus?.status === 'warning' ? 'text-orange-500' :
                    expiryStatus?.status === 'caution' ? 'text-yellow-600' : ''
                  }`}>
                    {formatExpiry(item.expiryDate)}
                    {expiryStatus && <span className="ml-1 text-xs">⚠️</span>}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2">
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
