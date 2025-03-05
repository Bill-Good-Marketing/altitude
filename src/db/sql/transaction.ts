import ModelSet from "~/util/db/ModelSet";
import {dbClient, Model} from "./SQLBase";
// import {ongdb} from "~/db/graph/ONgDB";
import {quickTrace} from "~/util/tracing";
import {PrismaClient} from "@prisma/client";
// import {neo4j} from "~/db/neo4j/Neo4J";

export declare type Transaction =
    PrismaClient
    | Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

// Small data object to store the objects that have been committed in a transaction
// So that in case of a rollback, we can delete the graph objects as well.
export class TransactionContext {
    private commitedObjects: ModelSet<Model<any>> = new ModelSet();

    constructor(public transaction: Transaction, public parent: TransactionContext | null = null) {
    }

    addCommitedObject(object: Model<any>) {
        this.commitedObjects.add(object);
    }

    removeCommitedObject(object: Model<any>) {
        this.commitedObjects.remove(object);
    }

    async onRollback() {
        // const queries: Array<{
        //     query: string,
        //     params: object
        // }> = this.commitedObjects.map(object => {
        //     if (object.isGraphObject()) {
        //         return {
        //             query: `MATCH (n:${object.className()}) WHERE n.guid = $guid DETACH DELETE n`,
        //             params: {
        //                 guid: object.guid.toString('hex')
        //             }
        //         }
        //     }
        // }).filter(query => query != undefined) as Array<{
        //     query: string,
        //     params: object
        // }>;
        //
        // await ongdb.batch(queries);
    }
}

export let currentTsx: TransactionContext | null = null;

export async function PerformInTransaction<T>(func: (tsx: Transaction) => Promise<T>, timeout?: number) {
    return quickTrace('Transactioned Execution', async (span) => {
        try {
            return (await dbClient.$transaction(async (tsx) => {
                currentTsx = new TransactionContext(tsx, currentTsx);
                try {
                    const result = await func(tsx);
                    currentTsx = currentTsx.parent;
                    return result;
                } catch (e) {
                    if (currentTsx != null) {
                        await currentTsx.onRollback();
                        currentTsx = currentTsx.parent;
                    }
                    throw e;
                }
            }, {
                timeout: timeout,
            }) as Promise<T>);
        } catch (e) {
            if (e instanceof Error && e.message === 'Transaction rolled back') {
                if (currentTsx != null) {
                    span.setAttribute('wrapper.rollback', true);
                    span.setAttribute('wrapper.error', false);
                    await currentTsx.onRollback();
                }
                return;
            }
            span.setAttribute('wrapper.rollback', true);
            span.setAttribute('wrapper.error', true);
            throw e;
        }
    })
}

export function RollbackTransaction() {
    throw new Error('Transaction rolled back');
}
