export class OnboardingValidationError extends Error {
  constructor(public readonly fieldErrors: Record<string, string>) {
    super("onboarding_validation_failed");
    this.name = "OnboardingValidationError";
  }
}

export class AlreadyOnboardedError extends Error {
  constructor() {
    super("already_onboarded");
    this.name = "AlreadyOnboardedError";
  }
}

export class NotAuthenticatedError extends Error {
  constructor() {
    super("not_authenticated");
    this.name = "NotAuthenticatedError";
  }
}

export class OnboardingPersistenceError extends Error {
  constructor(message = "onboarding_persistence_failed") {
    super(message);
    this.name = "OnboardingPersistenceError";
  }
}
