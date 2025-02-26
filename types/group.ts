export interface Participant {
  name: string;
}

export interface Editor {
  id: string;
  name: string;
  email?: string;
}

export interface Group {
  id: string;
  name: string;
  editors: Editor[];
  invitedEditors?: Editor[];
  participants: Participant[];
  total: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}
