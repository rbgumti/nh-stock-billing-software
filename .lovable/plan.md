

## Make Stock Item Card Fully Editable for Admin Users

### Overview
This plan adds inline editing capability for all four fields in the Stock Item Card's batch table (Batch No, Qty, Expiry, MRP) but restricts this functionality to admin users only. Currently, only Batch No and Expiry are editable. The edit button (pencil icon) will only be visible to admins.

---

### Changes Required

#### 1. Update StockItemCard Component Props

**File:** `src/components/StockItemCard.tsx`

Add a new prop to receive admin status:
- `isAdmin: boolean` - Controls whether editing is allowed

---

#### 2. Add State for Qty and MRP Editing

**File:** `src/components/StockItemCard.tsx`

Add two new state variables to track edited values:
- `editQty: number` - For editing current stock quantity
- `editMrp: string` - For editing MRP (as string for input handling)

Update `startEditingBatch` to initialize all four fields:
- `editBatchNo`, `editExpiryDate`, `editQty`, `editMrp`

---

#### 3. Update Save Function

**File:** `src/components/StockItemCard.tsx`

Modify `handleSaveBatchExpiry` to update all four fields:

```text
Update to stock_items:
  - batch_no
  - expiry_date  
  - current_stock (new)
  - mrp (new)
```

---

#### 4. Make Table Cells Conditionally Editable

**File:** `src/components/StockItemCard.tsx`

Transform each table cell to show input fields when editing:

| Column | Current | New (when editing) |
|--------|---------|-------------------|
| Batch No | Input (text) | No change |
| Qty | Static display | Input (number) |
| Expiry | Input (date) | No change |
| MRP | Static display | Input (number, step 0.00001) |

---

#### 5. Conditionally Show Edit Button

**File:** `src/components/StockItemCard.tsx`

The pencil icon button in the last column will:
- **Show** only if `isAdmin === true`
- **Hide** for non-admin users (the column will still exist but be empty)

---

#### 6. Pass isAdmin from Stock Page

**File:** `src/pages/Stock.tsx`

Import and use the `useUserRole` hook:
```text
const { isAdmin } = useUserRole();
```

Pass to StockItemCard:
```text
<StockItemCard
  ...existing props
  isAdmin={isAdmin}
/>
```

---

### Technical Details

#### Input Specifications
| Field | Type | Validation |
|-------|------|------------|
| Batch No | text | Optional, max 50 chars |
| Qty | number | Integer, min 0 |
| Expiry | date | Valid date format |
| MRP | number | Precision up to 5 decimals (step 0.00001) |

#### Database Update Query
```sql
UPDATE stock_items 
SET batch_no = ?, 
    expiry_date = ?, 
    current_stock = ?, 
    mrp = ?
WHERE item_id = ?
```

#### Security Consideration
The admin check is UI-only (hides the edit button). The underlying RLS policies in Supabase will continue to enforce database-level security. All authenticated users can currently update stock_items - if stricter control is needed, an additional RLS policy restricting writes to admins would be required.

---

### Files to Modify
1. `src/components/StockItemCard.tsx` - Add isAdmin prop, new state variables, editable inputs for Qty/MRP
2. `src/pages/Stock.tsx` - Import useUserRole, pass isAdmin to StockItemCard

