export type UserRole = "admin" | "grill_master" | "waiter";

export type SessionProfile = {
  userId: string;
  email: string;
  merchantId: string | null;
  merchantName: string | null;
  fullName: string | null;
  role: UserRole | null;
  isOnboarded: boolean;
};

export type SignInCredentials = {
  email: string;
  password: string;
};

export type SignInResult = {
  userId: string;
  email: string;
};

export type CreateStaffUserInput = {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
};

export type CreateStaffUserResult = {
  userId: string;
  email: string;
  role: UserRole;
};
