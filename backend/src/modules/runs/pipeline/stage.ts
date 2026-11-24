import { failure, reason, ReasonCode } from './reasons.js';
import { fail, ok, type Result, type Step } from './types/pipeline.types.js';

/** One step for one delivery note: takes the previous step's output, gives the next one's input. */
export interface Stage<In = any, Out = any> {
  step: Step;
  run: (input: In) => Promise<Result<Out>>;
}

/**
 * Runs `stages` in order from the one for `from`, stopping at the first
 * failure. `onCompleted` runs after each step so the caller can save its
 * output, which is what lets a retry resume at a later step.
 */
export async function runStages<Out>(
  stages: readonly Stage[],
  from: Step,
  input: unknown,
  onCompleted: (step: Step, output: unknown) => Promise<void>,
): Promise<Result<Out>> {
  const start = stages.findIndex((stage) => stage.step === from);
  if (start === -1) {
    throw new Error(`The pipeline has no ${from} stage`);
  }

  let value = input;
  for (const stage of stages.slice(start)) {
    const result: Result<unknown> = await stage
      .run(value)
      .catch((error: unknown) =>
        fail(
          failure(stage.step, reason(ReasonCode.INTERNAL_ERROR), {
            detail: {
              error: error instanceof Error ? error.message : String(error),
            },
          }),
        ),
      );
    if (!result.ok) {
      return result;
    }
    value = result.value;
    await onCompleted(stage.step, value);
  }
  return ok(value as Out);
}
