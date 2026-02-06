import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { allFunctions } from '@/lib/inngest/functions';

// Create and export the Inngest serve handler
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: allFunctions,
});
