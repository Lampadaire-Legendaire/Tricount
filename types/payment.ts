export interface Payment {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  groupId: string;
  createdAt: Date;
  status: 'pending' | 'completed';
} 