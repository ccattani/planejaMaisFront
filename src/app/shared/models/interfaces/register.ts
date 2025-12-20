export interface RegisterPayload {
  name: string;
  user: string;
  email: string;
  lastEmail: string;
  birthday: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
}
