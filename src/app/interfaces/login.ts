import { RegisterPayload } from "./register";

export interface LoginPayload {
  user: string,
  passwordHash: string,
  remember: boolean
}

export type LoginResponse = string;


export interface MyAccount extends RegisterPayload {
  _id: string;
}
