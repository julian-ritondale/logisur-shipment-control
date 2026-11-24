import { failure, reason } from './reasons.js';
import { runStages, type Stage } from './stage.js';
import { fail, ok } from './types/pipeline.types.js';
import { Cause, Step } from '../../../common/types/pipeline.types.js';

const stage = (step: Stage['step'], run: Stage['run']): Stage => ({
  step,
  run,
});

describe('runStages', () => {
  const double = stage(Step.VALIDATE, async (n: number) => ok(n * 2));
  const addOne = stage(Step.MAP, async (n: number) => ok(n + 1));
  const toText = stage(Step.DELIVER, async (n: number) => ok(`#${n}`));
  const stages = [double, addOne, toText];

  describe('Scenario: every stage succeeds', () => {
    it('Given three stages, when run from the first, then each output feeds the next and the last one is the result', async () => {
      await expect(
        runStages(stages, Step.VALIDATE, 5, async () => {}),
      ).resolves.toEqual(ok('#11'));
    });

    it('Given three stages, when run, then onCompleted is called after each one with its output, in order', async () => {
      const completed: unknown[] = [];
      await runStages(stages, Step.VALIDATE, 5, async (step, output) => {
        completed.push([step, output]);
      });
      expect(completed).toEqual([
        [Step.VALIDATE, 10],
        [Step.MAP, 11],
        [Step.DELIVER, '#11'],
      ]);
    });

    it('Given a later starting step, when run, then the earlier stages are skipped (that is how a retry resumes)', async () => {
      const spy = vi.fn(double.run);
      const result = await runStages(
        [{ ...double, run: spy }, addOne, toText],
        Step.DELIVER,
        41,
        async () => {},
      );
      expect(result).toEqual(ok('#41'));
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: a stage fails', () => {
    it('Given a stage that fails, when run, then it stops there with that failure and later stages do not run', async () => {
      const why = failure(Step.MAP, reason(Cause.MISSING_WEIGHT));
      const later = vi.fn(toText.run);
      const onCompleted = vi.fn(async () => {});
      const result = await runStages(
        [
          double,
          stage(Step.MAP, async () => fail(why)),
          { ...toText, run: later },
        ],
        Step.VALIDATE,
        1,
        onCompleted,
      );
      expect(result).toEqual(fail(why));
      expect(later).not.toHaveBeenCalled();
      expect(onCompleted).toHaveBeenCalledTimes(1);
    });

    it('Given a stage that throws, when run, then it fails as INTERNAL_ERROR at that step with the error as detail', async () => {
      const result = await runStages(
        [stage(Step.VALIDATE, () => Promise.reject(new Error('boom')))],
        Step.VALIDATE,
        1,
        async () => {},
      );
      expect(result).toEqual({
        ok: false,
        failure: expect.objectContaining({
          step: Step.VALIDATE,
          cause: 'INTERNAL_ERROR',
          detail: { error: 'boom' },
        }),
      });
    });

    it('Given a starting step with no stage, when run, then it throws (a wiring bug, not a remito problem)', async () => {
      await expect(
        runStages([double], Step.DELIVER, 1, async () => {}),
      ).rejects.toThrow('The pipeline has no DELIVER stage');
    });
  });
});
