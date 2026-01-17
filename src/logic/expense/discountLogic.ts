import { LineItem } from '../../types';

/**
 * Calculates the total discount for a given set of line items and a discount percentage.
 * @param items - The line items to calculate the discount for.
 * @param discountPercentage - The discount percentage to apply.
 * @returns The total discount amount.
 */
export function calculateDiscount(items: LineItem[], discountPercentage: number): number {
  if (!discountPercentage) {
    return 0;
  }

  const discountableAmount = items
    .filter(item => !item.IsExcludedFromDiscount)
    .reduce((sum, item) => sum + (item.LineQuantity * item.LineUnitPrice), 0);

  return (discountableAmount * discountPercentage) / 100;
}

/**
 * Calculates the total amount for a given set of line items, taking into account discounts.
 * @param items - The line items to calculate the total for.
 * @param discountPercentage - The discount percentage to apply.
 * @returns The total amount after discounts.
 */
export function calculateTotalWithDiscount(items: LineItem[], discountPercentage: number): number {
  const subtotal = items.reduce((sum, item) => sum + (item.LineQuantity * item.LineUnitPrice), 0);
  const discountAmount = calculateDiscount(items, discountPercentage);
  return subtotal - discountAmount;
}

/**
 * Calculates the total amount for a single line item, taking into account discounts.
 * @param item - The line item to calculate the total for.
 * @param discountPercentage - The discount percentage to apply.
 * @returns The total amount for the line item after discounts.
 */
export function calculateLineItemTotalWithDiscount(item: LineItem, discountPercentage: number): number {
    const itemTotal = item.LineQuantity * item.LineUnitPrice;
    if (!discountPercentage || item.IsExcludedFromDiscount) {
        return itemTotal;
    }
    const itemDiscount = (itemTotal * discountPercentage) / 100;
    return itemTotal - itemDiscount;
}
