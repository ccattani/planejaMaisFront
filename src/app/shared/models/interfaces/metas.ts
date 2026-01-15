export interface CreateGoalPayload {
  _id?: string;   // omit when creating
  title: string;
  month: number;      // 0 anual, 1..12 mensal
  year: number;       // ex: 2026
  goal: number;       // positivo/negativo, sem "+"
  updatedAt: string;  // ISO date-time
  user?: string;     // omit when creating
}

