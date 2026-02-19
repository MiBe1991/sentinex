export type ActionPlanRequest = {
  prompt: string;
};

export interface ActionPlanProvider {
  readonly name: string;
  generate(request: ActionPlanRequest): Promise<unknown>;
}
