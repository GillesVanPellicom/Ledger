export interface Settings {
  backup: {
    editsSinceLastBackup: number;
    interval: number;
    maxBackups: number;
  };
  modules: {
    debt: {
      enabled: boolean;
    };
    paymentMethods: {
      enabled: boolean;
    };
    capitalizationProtection?: {
      enabled: boolean;
    };
  };
  pdf: any;
  datastore: {
    folderPath: string;
  };
  userName?: string;
  paymentMethodStyles?: Record<string, PaymentMethodStyle>;
  debtorStyles?: Record<string, DebtorStyle>;
  theme?: string;
  uiScale?: number;
}

export interface Debtor {
  DebtorID: number;
  DebtorName: string;
  DebtorIsActive: boolean;
}

export interface DebtorStyle {
  symbol: string;
  type: 'icon' | 'emoji';
}

export interface Store {
  StoreID: number;
  StoreName: string;
  StoreIsActive: boolean;
}

export interface Category {
  CategoryID: number;
  CategoryName: string;
  CategoryIsActive: boolean;
}

export interface Entity {
  EntityID: number;
  DebtorID: number;
  DebtorName: string;
  EntityName: string;
  EntityIsActive: boolean;
}

export interface Product {
  ProductID: number;
  ProductName: string;
  ProductBrand: string;
  ProductSize: number;
  ProductUnitID: number;
  ProductUnitType: string;
  ProductIsActive: boolean;
  CategoryID?: number;
  CategoryName?: string;
}

export interface Receipt {
  ReceiptID: number;
  ReceiptDate: string;
  ReceiptNote: string;
  Discount: number;
  StoreName: string;
  PaymentMethodName: string;
  SubTotal: number;
  Total: number;
  Status?: 'unpaid' | 'paid';
  TotalDebtorCount?: number;
  UnpaidDebtorCount?: number;
  SplitType?: 'none' | 'total_split' | 'line_item';
  OwnShares?: number;
  TotalShares?: number;
  OwedToDebtorID?: number;
  OwedToDebtorName?: string;
  PaymentMethodID?: number;
  ReceiptIsSettled?: boolean;
  DebtorTotal?: number;
  type?: 'to_entity' | 'to_me' | 'receipt' | 'topup';
  amount?: number;
  isSettled?: boolean;
  id?: number;
  date?: string;
  name?: string;
  note?: string;
  subtotal?: number;
  IsNonItemised?: number;
  NonItemisedTotal?: number;
  splitPart?: number;
}

export interface LineItem {
  key: string;
  LineItemID?: number;
  ReceiptID?: number;
  ProductID: number;
  ProductName: string;
  ProductBrand: string;
  ProductSize: number;
  ProductUnitType: string;
  LineQuantity: number;
  LineUnitPrice: number;
  IsExcludedFromDiscount?: boolean;
  DebtorID?: number | null;
  DebtorName?: string | null;
}

export interface ReceiptImage {
  key: string;
  ImagePath: string;
  file?: File;
  src?: string;
}

export interface ReceiptSplit {
  key: string;
  DebtorID: number;
  DebtorName: string;
  SplitPart: number;
}

export interface ReceiptDebtorPayment {
  PaymentID: number;
  ReceiptID: number;
  DebtorID: number;
  PaidDate: string;
  TopUpID?: number;
}

export interface MonthlySpending {
  total: number;
  prevMonthTotal: number;
  prevYearMonthTotal: number;
}

export interface StoreSpending {
  name: string;
  value: number;
}

export interface CategorySpending {
  name: string;
  value: number;
}

export interface Averages {
  avgPerReceipt: number;
  avgItemsPerReceipt: number;
  avgPricePerItem: number;
}

export interface PaymentMethodStats {
  totalCapacity: number;
  methods: {
    name: string;
    balance: number;
  }[];
}

export interface DebtStats {
  netBalances: {
    name: string;
    value: number;
  }[];
  totalOwedToMe: number;
  totalOwedByMe: number;
}

export interface PaymentMethod {
  PaymentMethodID: number;
  PaymentMethodName: string;
  PaymentMethodFunds: number;
  PaymentMethodIsActive: number;
  balance: number;
}

export interface PaymentMethodStyle {
  type: 'icon' | 'emoji';
  symbol: string;
  color: string;
}

export interface TopUp {
  TopUpID: number;
  TopUpDate: string;
  TopUpNote: string;
  TopUpAmount: number;
}
