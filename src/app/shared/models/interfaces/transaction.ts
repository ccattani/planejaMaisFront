export interface TransactionPayload {
  description: string;
  value: number;
  category: string;
  date: string;
  updatedAt: string;
}

export interface Transaction {
  id?: string;
  desc: string;
  value: string;
  numeric?: number; // efeito numérico (por ex. -230)
  index?: number;
  category?: string;
}
