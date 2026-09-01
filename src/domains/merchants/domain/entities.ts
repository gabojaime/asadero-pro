export type Merchant = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  createdAt: string;
};

export type OnboardingInput = {
  merchantName: string;
  ownerFullName: string;
  address?: string | null;
  phone?: string | null;
};

export type NormalizedOnboardingInput = {
  merchantName: string;
  ownerFullName: string;
  address: string | null;
  phone: string | null;
};

export type OnboardingResult = {
  merchantId: string;
};
