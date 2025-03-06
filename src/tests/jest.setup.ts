import {test} from "@jest/globals";
import {PerformInTransaction, RollbackTransaction} from "~/db/sql/transaction";
import './utils' // extend expect

// @ts-expect-error - We're redefining the test function
global.test = (name: string, fn: () => Promise<void>, timeout: number) => {
    test(name, async () => {
        await PerformInTransaction(async () => {
            await fn()
            RollbackTransaction()
        })
    }, timeout)
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        interface It {
            (title: string, fn: (client: any) => Promise<void>, timeout?: number): void;
        }

        interface Test {
            (title: string, fn: (client: any) => Promise<void>, timeout?: number): void;
        }
    }
}
