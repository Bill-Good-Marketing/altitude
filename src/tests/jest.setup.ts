import { test } from '@jest/globals';
import { PerformInTransaction, RollbackTransaction } from '~/db/sql/transaction';

// @ts-expect-error - Overriding the global test
global.test = (name: string, fn: () => Promise<void>, timeout?: number) => {
  return test(name, async () => {
    await PerformInTransaction(async () => {
      await fn();
      RollbackTransaction();
    });
  }, timeout);
};
