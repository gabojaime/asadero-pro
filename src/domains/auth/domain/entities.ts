export type UserRole = "admin" | "grill_master" | "waiter";

export type SessionProfile = {
  userId: string;
  email: string;
  merchantId: string | null;
  fullName: string | null;
  role: UserRole | null;
  isOnboarded: boolean;
};
