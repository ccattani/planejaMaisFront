export interface CreateGoalPayload {
  month: number;      // 0 anual, 1..12 mensal
  year: number;       // ex: 2026
  goal: number;       // positivo/negativo, sem "+"
  updatedAt: string;  // ISO date-time
}
