UPDATE purchase_order_items 
SET qty_in_strips = 500, qty_in_tabs = 5000 
WHERE purchase_order_id = (
  SELECT id FROM purchase_orders WHERE po_number = 'NH/PO-0013'
);