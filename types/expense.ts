export interface Expense {
  id: string;
  title: string;
  amount: number;
  groupId: string;
  paidBy: string;
  createdAt: Date;
  updatedAt: Date;
} 