export interface Participant {
  id: string;
  name: string;
  email?: string;
}

export interface Group {
  id: string;
  name: string;
  participants: Participant[];
  createdAt: Date;
  updatedAt: Date;
  total: number;
}