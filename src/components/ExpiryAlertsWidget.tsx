import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Package, ChevronRight, Pill, Droplets, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface ExpiringItem {
  item_id: number;
  name: string;
  batch_no: string;
  expiry_date: string;
  current_stock: number;
  category: string;
  daysLeft: number;
}

type FilterPeriod = 30 | 60 | 90 | 'expired';

export function ExpiryAlertsWidget() {
  const navigate = useNavigate();
  const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterPeriod>(30);

  useEffect(() => {
    loadExpiringItems();
  }, []);

  const loadExpiringItems = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('item_id, name, batch_no, expiry_date, current_stock, category')
        .order('expiry_date', { ascending: true });

      if (error) throw error;

      const today = new Date();
      const items: ExpiringItem[] = (data || [])
        .filter(item => {
          if (!item.expiry_date || item.expiry_date === 'N/A') return false;
          const expiry = new Date(item.expiry_date);
          return !isNaN(expiry.getTime());
        })
        .map(item => {
          const expiry = new Date(item.expiry_date);
          const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return { ...item, daysLeft: diffDays };
        })
        .filter(item => item.daysLeft <= 90);

      setExpiringItems(items);
    } catch (error) {
      console.error('Error loading expiring items:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredItems = () => {
    if (filter === 'expired') {
      return expiringItems.filter(item => item.daysLeft <= 0);
    }
    return expiringItems.filter(item => item.daysLeft > 0 && item.daysLeft <= filter);
  };

  const getCounts = () => {
    const expired = expiringItems.filter(item => item.daysLeft <= 0).length;
    const within30 = expiringItems.filter(item => item.daysLeft > 0 && item.daysLeft <= 30).length;
    const within60 = expiringItems.filter(item => item.daysLeft > 30 && item.daysLeft <= 60).length;
    const within90 = expiringItems.filter(item => item.daysLeft > 60 && item.daysLeft <= 90).length;
    return { expired, within30, within60, within90 };
  };

  const counts = getCounts();
  const filteredItems = getFilteredItems();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'BNX': return Pill;
      case 'TPN': return Droplets;
      case 'PSHY': return Brain;
      default: return Package;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'BNX': return 'from-blue-500 to-cyan';
      case 'TPN': return 'from-amber-500 to-orange';
      case 'PSHY': return 'from-purple to-pink';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const formatExpiry = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  if (loading) {
    return (
      <Card className="glass-strong border-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-orange/5 to-destructive/5" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Expiry Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAlerts = counts.expired + counts.within30 + counts.within60 + counts.within90;

  return (
    <Card className="glass-strong border-0 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-orange/5 to-destructive/5" />
      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-orange to-destructive">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
            <span className="bg-gradient-to-r from-orange to-destructive bg-clip-text text-transparent">
              Expiry Alerts
            </span>
            {totalAlerts > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalAlerts}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs hover:bg-orange/10"
            onClick={() => navigate('/stock')}
          >
            View All
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filter === 'expired' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('expired')}
            className={filter === 'expired' 
              ? 'bg-gradient-to-r from-destructive to-pink text-white border-0' 
              : 'glass-subtle border-destructive/20 hover:border-destructive/40'
            }
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Expired ({counts.expired})
          </Button>
          <Button
            variant={filter === 30 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(30)}
            className={filter === 30 
              ? 'bg-gradient-to-r from-destructive to-orange text-white border-0' 
              : 'glass-subtle border-orange/20 hover:border-orange/40'
            }
          >
            <Clock className="h-3 w-3 mr-1" />
            30 Days ({counts.within30})
          </Button>
          <Button
            variant={filter === 60 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(60)}
            className={filter === 60 
              ? 'bg-gradient-to-r from-orange to-amber-500 text-white border-0' 
              : 'glass-subtle border-amber-500/20 hover:border-amber-500/40'
            }
          >
            <Clock className="h-3 w-3 mr-1" />
            60 Days ({counts.within60})
          </Button>
          <Button
            variant={filter === 90 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(90)}
            className={filter === 90 
              ? 'bg-gradient-to-r from-yellow-500 to-amber-400 text-black border-0' 
              : 'glass-subtle border-yellow-500/20 hover:border-yellow-500/40'
            }
          >
            <Clock className="h-3 w-3 mr-1" />
            90 Days ({counts.within90})
          </Button>
        </div>

        {/* Items List */}
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          <AnimatePresence mode="popLayout">
            {filteredItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8 text-muted-foreground"
              >
                <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No items in this category</p>
              </motion.div>
            ) : (
              filteredItems.slice(0, 8).map((item, idx) => {
                const CategoryIcon = getCategoryIcon(item.category);
                const isExpired = item.daysLeft <= 0;
                const isCritical = item.daysLeft > 0 && item.daysLeft <= 30;
                
                return (
                  <motion.div
                    key={item.item_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isExpired 
                        ? 'bg-destructive/10 border-destructive/30' 
                        : isCritical 
                          ? 'bg-orange-500/10 border-orange-500/30'
                          : 'bg-card/50 border-border/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg bg-gradient-to-r ${getCategoryColor(item.category)}`}>
                        <CategoryIcon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Batch: {item.batch_no && !item.batch_no.startsWith('BATCH') ? item.batch_no : '-'}</span>
                          <span>•</span>
                          <span>Stock: {item.current_stock}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={isExpired ? 'destructive' : 'secondary'}
                        className={
                          isExpired 
                            ? 'bg-destructive text-white' 
                            : isCritical
                              ? 'bg-gradient-to-r from-destructive to-orange text-white border-0'
                              : item.daysLeft <= 60
                                ? 'bg-gradient-to-r from-orange to-amber-500 text-white border-0'
                                : 'bg-gradient-to-r from-yellow-500 to-amber-400 text-black border-0'
                        }
                      >
                        {isExpired ? 'Expired' : `${item.daysLeft}d left`}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatExpiry(item.expiry_date)}
                      </p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
          
          {filteredItems.length > 8 && (
            <p className="text-xs text-center text-muted-foreground pt-2">
              And {filteredItems.length - 8} more items...
            </p>
          )}
        </div>

        {/* Summary Stats */}
        {totalAlerts > 0 && (
          <div className="pt-3 border-t border-border/50">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-lg bg-destructive/10">
                <p className="text-lg font-bold text-destructive">{counts.expired}</p>
                <p className="text-[10px] text-muted-foreground">Expired</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <p className="text-lg font-bold text-orange-500">{counts.within30}</p>
                <p className="text-[10px] text-muted-foreground">≤30 Days</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10">
                <p className="text-lg font-bold text-amber-500">{counts.within60}</p>
                <p className="text-[10px] text-muted-foreground">31-60 Days</p>
              </div>
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <p className="text-lg font-bold text-yellow-600">{counts.within90}</p>
                <p className="text-[10px] text-muted-foreground">61-90 Days</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
