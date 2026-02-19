export class PolicyDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PolicyDeniedError";
  }
}

export class ToolExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolExecutionError";
  }
}

export class ActionPlanValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionPlanValidationError";
  }
}
