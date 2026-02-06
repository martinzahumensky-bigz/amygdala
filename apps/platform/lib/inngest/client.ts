import { Inngest } from 'inngest';

// Create the Inngest client
export const inngest = new Inngest({
  id: 'amygdala-platform',
  name: 'Amygdala Platform',
});

// Event types for type safety
export type TransformationPlanCreated = {
  name: 'transformation/plan.created';
  data: {
    planId: string;
    targetAsset: string;
    targetColumn?: string;
    transformationType: string;
    description: string;
    parameters: Record<string, unknown>;
    accuracyThreshold: number;
    maxIterations: number;
    requestedBy: string;
  };
};

export type TransformationIterationComplete = {
  name: 'transformation/iteration.complete';
  data: {
    planId: string;
    iteration: number;
    accuracy: number;
    meetsThreshold: boolean;
  };
};

export type Events = TransformationPlanCreated | TransformationIterationComplete;
