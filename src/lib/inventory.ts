export const INVENTORY_CATEGORIES = [
  "Lumber",
  "Hardware",
  "Electrical",
  "Plumbing",
  "Paint & Finish",
  "Concrete & Masonry",
  "Tools",
  "Safety",
  "Other",
] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export const INVENTORY_UNITS = [
  "ea",
  "ft",
  "lf",
  "box",
  "gal",
  "bag",
  "roll",
  "sheet",
] as const;

export type InventoryUnit = (typeof INVENTORY_UNITS)[number];

export const INVENTORY_LOCATIONS = [
  "Main warehouse",
  "Truck 1",
  "Truck 2",
  "Site locker",
  "Shop",
] as const;

export function isLowStock(quantity: number, reorderLevel: number) {
  return reorderLevel > 0 && quantity <= reorderLevel;
}

export function transactionLabel(type: string) {
  switch (type) {
    case "pull":
      return "Pulled";
    case "restock":
      return "Restocked";
    case "return":
      return "Returned";
    case "adjustment":
      return "Adjusted";
    default:
      return type;
  }
}

export type PurchaseOrderStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "ordered"
  | "partial"
  | "received"
  | "cancelled";

export function poStatusLabel(status: PurchaseOrderStatus) {
  switch (status) {
    case "draft":
      return "Draft";
    case "pending_approval":
      return "Pending approval";
    case "approved":
      return "Approved";
    case "ordered":
      return "Ordered";
    case "partial":
      return "Partially received";
    case "received":
      return "Received";
    case "cancelled":
      return "Cancelled";
  }
}

export function generatePoNumber() {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `PO-${date}-${suffix}`;
}

export interface PurchaseOrderLineLike {
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
}

export function poLineTotal(line: PurchaseOrderLineLike) {
  return line.quantityOrdered * line.unitCost;
}

export function poTotal(lines: PurchaseOrderLineLike[]) {
  return lines.reduce((sum, l) => sum + poLineTotal(l), 0);
}

export function poRemaining(line: PurchaseOrderLineLike) {
  return Math.max(0, line.quantityOrdered - line.quantityReceived);
}

