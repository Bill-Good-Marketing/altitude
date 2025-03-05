//import 'server-only';
import {Model} from "~/db/sql/SQLBase";
import {CoreTool, tool} from "ai";
import {z} from "zod";
import {AIEnabledModels, AIModelKeys, ModelKeyArray} from "~/db/sql/keys";
import {User} from "~/db/sql/models/User";
import * as enums from "~/common/enum/enumerations";
import {AIEnumKey} from "~/common/enum/enumerations";
import {ProgrammingError} from "~/common/errors";
import {ReadAttributes} from "~/db/sql/types/select";
import {_wrappers} from "~/db/sql/decorators";
import {ReadWhere, StandardWhere, Where} from "~/db/sql/types/where";
import {IModel, ReadOrder} from "~/db/sql/types/model";
import ModelSet from "~/util/db/ModelSet";

type dtype =
    'string'
    | 'number'
    | 'boolean'
    | 'date'
    | 'id'
    | 'modelkey'
    | 'string[]'
    | AIEnumKey
    | 'context'; // 'string[]' is for array of strings, string[] is an enum

type ParamDtype = 'string'
    | 'number'
    | 'boolean'
    | 'date'
    | 'id'
    | AIModelKeys
    | AIEnumKey // For enums

type Arg = {
    name: string,
    description?: string,
    type: dtype
    optional?: boolean
};

export declare type AIContext = {
    tenetId: Buffer | null,
    user: User,
    tzOffset: number
}

const readSchema = z.object({
    model: z.enum(ModelKeyArray).describe('The database model to read. Use the schema provided by the server to determine attributes and data types.'),
    attributes: z.array(z.string()).describe('The attributes to read (must be a subset of the model\'s attributes). ' +
        'Use a "." to access nested attributes as in notes.content or contact.fullName (works for both arrays and single objects). ' +
        'Not specifying attributes will return only the ids of the objects.').optional(),
    where: z.array(z.object({
        key: z.string(),
        value: z.string(),
        operator: z.enum(['=', '!=', '>', '>=', '<', '<=', 'between']),
    }))
        .optional()
        .describe('The filters to apply to the query. Keys must be a subset of the model\'s attributes, values must be strings. ' +
            'For between operators (applicable to numbers/dates), use a comma to separate the two values. ' +
            'As with attributes, use a "." for nested attributes. So, let\'s say that I\'m reading the contact model. `activities.startDate > sometime` will work. But `startDate > sometime` will not because contacts don\'t have a startDate attribute.'),
    orderBy: z.array(z.object({
        key: z.string(),
        direction: z.enum(['asc', 'desc']),
    }))
        .describe('Does NOT support nested attributes. You can only specify attributes that belong to the model being read.')
        .optional(),
    limit: z.number(),
    offset: z.number().optional()
})

// const parseFileSchema = z.object({
//     name: z.string()
// })

type ToolDefinition = {
    description: string,
    schema: Record<string, z.ZodString | z.ZodNumber | z.ZodBoolean | z.ZodDate | z.ZodArray<z.ZodString> | z.ZodEnum<any>>,
    execute: (...params: any[]) => Promise<AIResponse>
    _args: Arg[],
}

const tools: Record<string, ToolDefinition> = {}

type AIResponse =
    Model<any>
    | Array<Model<any>>
    | string
    | number
    | boolean
    | Date
    | Buffer
    | null
    | void
    | undefined
    | string[]
    | number[]
    | boolean[]
    | Date[]
    | Buffer[];

type Property = {
    description: string | null,
    type: ParamDtype,
    isArray?: boolean
    optional?: boolean
}

export const dataKeys: Record<string, Record<string, Property>> = {};

const toolError = (message: string) => {
    return {
        error: message
    }
}


// const getModelInfoTool = tool({
//     description: 'Returns the schema for a database model as well as any related enums. Do NOT assume what properties exist on a model. Use this tool instead to ensure that you use the correct properties and have the full context.',
//     parameters: z.object({
//         model: z.enum(ModelKeyArray).describe('The database model to fetch the schema for.'),
//     }),
//     execute: async ({model}) => {
//         console.log('Get model info', model);
//         const modelInfo = await Model.getModel(model);
//         if (modelInfo == null) {
//             return toolError(`Model ${model} not found`);
//         }
//
//         let enumsToLoad = new Set<string>();
//         let paramInfo = [] as string[];
//         const properties = dataKeys[modelInfo.className()];
//         if (properties) {
//             for (const property in properties) {
//                 const prop = properties[property];
//                 if (enums.AIEnabledCommonEnums[prop.type as AIEnumKey] != null) {
//                     enumsToLoad.add(prop.type);
//                 }
//                 paramInfo.push(`\t<Property name="${property}" type="${prop.type}"${prop.isArray ? '[]' : ''}${prop.optional ? ' optional="true"' : ''}/>`)
//             }
//         } else {
//             return toolError(`Model ${model} does not exist`);
//         }
//
//         let enumInfo = '';
//         for (const enumKey of enumsToLoad) {
//             enumInfo += `<Enum name="${enumKey}"">\n\t${Object.keys(enums.AIEnabledCommonEnums[enumKey as AIEnumKey].definition).join('\n\t')}\n</Enum>\n`
//         }
//
//         return `<RelevantEnums>\n${enumInfo}</RelevantEnums>\n\n<${model}>\n${paramInfo.join('\n\t')}\n</${model}>`
//     }
// })


interface ReturnTypes extends Record<dtype, any> {
    'string': string,
    'number': number,
    'boolean': boolean,
    'date': Date,
    'id': Buffer,
    'modelkey': never,
    'string[]': string[],
    'context': never
}

type ReturnType<T extends dtype> = ReturnTypes[T];

const ai = {
    ['function']: function <T extends dtype>(description: string, args: Arg[], returns: T) {
        return function (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<ReturnType<T>>>) {
            if (descriptor.value === undefined) {
                throw new Error(`@ai.function decorator must be used on a function with a return type of AIResponse`);
            }

            const className = (target as Model<any>).className();

            const schema: Record<string, z.ZodString | z.ZodNumber | z.ZodBoolean | z.ZodDate | z.ZodArray<z.ZodString> | z.ZodEnum<any>> = {};

            for (const arg of args) {
                switch (arg.type) {
                    case 'string':
                        schema[arg.name] = z.string();
                        if (arg.description) schema[arg.name].describe(arg.description);
                        break;

                    case 'number':
                        schema[arg.name] = z.number()
                        if (arg.description) schema[arg.name].describe(arg.description);
                        break;

                    case 'boolean':
                        schema[arg.name] = z.boolean()
                        if (arg.description) schema[arg.name].describe(arg.description);
                        break;

                    case 'date':
                        schema[arg.name] = z.date()
                        if (arg.description) schema[arg.name].describe(arg.description);
                        break;

                    case 'id':
                        schema[arg.name] = z.string().regex(/^[0-9a-f]$/i);
                        if (arg.description) schema[arg.name].describe(arg.description + ' (id, must be hex string)');
                        else schema[arg.name].describe('id, must be hex string');
                        break;

                    case 'modelkey':
                        schema[arg.name] = z.enum(ModelKeyArray)
                        break;

                    case 'string[]':
                        schema[arg.name] = z.array(z.string())
                        if (arg.description) schema[arg.name].describe(arg.description);
                        break;

                    case 'context':
                        break;

                    default:
                        if (arg.type in enums.AIEnabledCommonEnums) {
                            schema[arg.name] = z.enum(Object.keys(enums.AIEnabledCommonEnums[arg.type as AIEnumKey].definition) as [string, ...string[]])
                            if (arg.description) schema[arg.name].describe(arg.description);
                        } else {
                            console.error(`Unknown arg type ${arg.type} for ${className}.${propertyKey}`);
                        }
                        break;
                }

                if (arg.optional) {
                    schema[arg.name].optional()
                }
            }

            tools[className + '_' + propertyKey] = {
                description: description + `\n\nReturns ${returns}`,
                schema: schema,
                execute: descriptor.value!,
                _args: args
            }
        }
    },
    /**
     * Property decorator to indicate that a property should be exposed to AI.
     * @param type The data type of the property (i.e. native type, enum, or model key)
     * @param description The description of the property to pass to AI
     * @param isArray Whether the property is an array (makes it optional)
     * @param optional Whether the property is optional (for non-array properties)
     */
    ['property']: function (type: ParamDtype, description: string | null, isArray: boolean, optional: boolean) {
        return function (target: any, propertyKey: string) {
            const className = (target as Model<any>).className();

            if (dataKeys[className] === undefined) {
                dataKeys[className] = {};
            }

            dataKeys[className][propertyKey] = {
                description,
                type,
                isArray,
                optional
            };
        }
    },

    // Constructs the tools for the AI based on the request context
    tools: (context: AIContext) => {
        const read = {
            description: 'Reads a model from the database',
            parameters: readSchema,
            execute: async ({model, attributes, where, orderBy, limit, offset}: z.infer<typeof readSchema>) => {
                try {
                    if (!AIEnabledModels.includes(model)) {
                        return toolError(`Model ${model} does not exist`);
                    }
                    const _model = await Model.getModel(model);

                    // Let's build the query
                    const select: ReadAttributes<Model<any>> = {};
                    type key = keyof typeof select;

                    for (const attribute of attributes ?? []) {
                        const parts = attribute.split('.');
                        if (parts.length === 1) {
                            select[attribute as key] = true;
                        } else {
                            const current = select;
                            for (let i = 0; i < parts.length; i++) {
                                const part: key = parts[i] as key;
                                if (i === parts.length - 1) {
                                    current[part] = true;
                                } else if (part in current && current[part] === true) {
                                    if (part in _wrappers[_model.className()]) {
                                        // @ts-expect-error - It's wrapped, so it's a model/model array
                                        current[part] = {};
                                    }
                                    // We'll just leave it as true otherwise
                                } else {
                                    if (part in _wrappers[_model.className()]) {
                                        // @ts-expect-error - It's wrapped, so it's a model/model array
                                        current[part] = {};
                                    } else current[part] = true; // AI made a mistake, so we'll set it to true
                                }
                            }
                        }
                    }


                    type ValueType = string | number | boolean | Date | Buffer | Model<any>

                    async function parseValue(model: IModel<any>, key: string, value: string, arrayParse = false): Promise<ValueType | ValueType[]> {
                        if (key === 'id') {
                            return Buffer.from(value, 'hex');
                        }

                        let prop: Property | undefined = undefined;

                        if (key.includes('.')) {
                            const parts = key.split('.');
                            let model = _model;

                            for (const part of parts) {
                                if (part === 'id') {
                                    return Buffer.from(value, 'hex');
                                }

                                const _prop = dataKeys[model.className()][part];
                                if (_prop == null) {
                                    throw new Error(`Property ${model.className()}.${part} not found`);
                                }

                                if (AIEnabledModels.includes(_prop.type as AIModelKeys)) {
                                    model = await Model.getModel(_prop.type as AIModelKeys);
                                } else {
                                    throw new Error(`Property ${model.className()}.${part} is not a database model which means it cannot have sub-properties`);
                                }
                            }
                        } else {
                            prop = dataKeys[_model.className()][key]

                            if (prop == null) {
                                throw new Error(`Property ${_model.className()}.${key} not found`);
                            }
                        }

                        if (prop == null) {
                            throw new Error(`Property ${_model.className()}.${key} not found`);
                        }

                        if (prop.isArray && !arrayParse) {
                            const vals = value.replaceAll(/\[]/g, '').split(',');
                            return await Promise.all(vals.map(val => parseValue(model, key, val, true) as Promise<ValueType>));
                        }

                        switch (prop.type) {
                            case "boolean":
                                return value === 'true';

                            case "number":
                                return parseFloat(value);

                            case "id":
                                return Buffer.from(value, 'hex');

                            case "date":
                                return new Date(value);

                            default:
                                if (prop.type in enums.AIEnabledCommonEnums) {
                                    return value; // Enums are technically just strings
                                } else if (prop.type in AIEnabledModels) {
                                    throw new Error(`Cannot filter directly on a database model field (${model.className()}.${key}). Use the related id field instead or filter on a sub-property.`)
                                } else {
                                    return value;
                                }
                        }
                    }

                    async function parseClause(model: IModel<any>, key: string, clause: Exclude<z.infer<typeof readSchema>['where'], undefined>[number]) {
                        let whereClause: StandardWhere<any> = {};

                        const prop = dataKeys[model.className()][key];

                        if (key === 'id') {
                            whereClause = Buffer.from(clause.value, 'hex');
                            return whereClause;
                        }

                        if (prop == null) {
                            throw new Error(`Property ${model.className()}.${key} not found`);
                        }

                        switch (clause.operator) {
                            case '=':
                                whereClause = await parseValue(model, key, clause.value, false);
                                if (prop.type === 'string') {
                                    whereClause = {equals: whereClause, mode: 'insensitive'}
                                }
                                break;
                            case '!=':
                            case '<':
                            case '>':
                            case '<=':
                            case '>=':
                                const opMap = {
                                    '!=': 'not',
                                    '<': 'lt',
                                    '>': 'gt',
                                    '<=': 'lte',
                                    '>=': 'gte'
                                }
                                whereClause = {
                                    [opMap[clause.operator]]: await parseValue(model, key, clause.value, false)
                                }

                                if (clause.operator === '!=' && prop.type === 'string') {
                                    whereClause['mode'] = 'insensitive';
                                }
                                break;

                            case 'between':
                                const values = clause.value.split(',');
                                whereClause = {
                                    gte: await parseValue(model, key, values[0], false),
                                    lte: await parseValue(model, key, values[1], false)
                                }
                        }

                        return whereClause;
                    }

                    const _where: ReadWhere<Model<any>> = {};
                    if (where) {
                        for (const clause of where) {
                            let model = _model;
                            let key = clause.key;

                            type Key = keyof Where<Model<any>>;
                            const parsedClause: Where<Model<any>>[Key] = {} as Where<Model<any>>[Key];
                            let currentClause: Where<Model<any>>[Key] = parsedClause;

                            const parts = clause.key.split('.');
                            if (clause.key.includes('.')) {
                                for (let i = 0; i < parts.length; i++) {
                                    const part: Key = parts[i] as Key;

                                    if (part === 'id') {
                                        model = await Model.getModel(model.className());
                                        // @ts-expect-error - Valid key
                                        currentClause.id = Buffer.from(clause.value, 'hex');
                                        key = 'id';
                                        break;
                                    }

                                    const _prop = dataKeys[model.className()][part];
                                    if (_prop == null) {
                                        throw new Error(`Property ${model.className()}.${part} not found`);
                                    }

                                    if (i === parts.length - 1) {
                                        currentClause[part] = await parseClause(model, key, clause) as Where<Model<any>>[Key];
                                        currentClause = currentClause[part] as Where<Model<any>>[Key];
                                        break;
                                    }

                                    if (AIEnabledModels.includes(_prop.type as AIModelKeys)) {
                                        model = await Model.getModel(_prop.type as AIModelKeys);
                                        key = part;
                                        currentClause[part] = {} as Where<Model<any>>[Key];
                                        currentClause = currentClause[part] as Where<Model<any>>[Key];
                                    } else {
                                        throw new Error(`Property ${model.className()}.${part} is not a database model which means it cannot have sub-properties`);
                                    }
                                }
                            } else {
                                parsedClause[key] = await parseClause(model, key, clause) as Where<Model<any>>[Key];
                            }

                            const _key = parts[0] as Key;
                            _where[_key] = parsedClause[_key];
                        }
                    }

                    // @ts-expect-error - All ai-enabled models should have a tenetId property
                    _where.tenetId = context.tenetId

                    const _orderBy: ReadOrder<Model<any>> = {};

                    for (const order of orderBy ?? []) {
                        _orderBy[order.key as keyof typeof _orderBy] = order.direction;
                    }

                    console.log(_where);

                    const results = ((await _model.read({
                        select,
                        where: _where,
                        orderBy: _orderBy,
                        limit: limit,
                        offset: offset,
                        aiRead: true
                    })) as ModelSet<Model<any>>).map(model => model.clientSafeJson(undefined, context.tzOffset));

                    if (results.length === 0) {
                        return 'no data';
                    }

                    return results;
                } catch (e) {
                    console.warn(e);
                    return toolError((e as Error).message);
                }
            }
        }

        const _tools: Record<string, CoreTool> = {
            read,
            // getModelInfo: getModelInfoTool
        }

        for (const toolName in tools) {
            const _tool = tools[toolName];
            _tools[toolName] = tool({
                description: _tool.description,
                parameters: z.object(_tool.schema),
                execute: async (params) => {
                    const args = _tool._args
                    const schema = _tool.schema;
                    const funcArgs: any[] = [];
                    for (const arg of args) {
                        if (arg.name === 'context') {
                            funcArgs.push(context);
                            continue;
                        }
                        funcArgs.push(schema[arg.name].parse(params[arg.name]));
                    }
                    console.log(funcArgs);
                    const result = _tool.execute(funcArgs);
                    if (Model.isInstance(result)) {
                        console.log(result.toJSON());
                    } else if (Model.isModelArray(result)) {
                        console.log(result.map(model => model.toJSON()));
                    } else if (Buffer.isBuffer(result)) {
                        console.log(result.toString('hex'));
                    } else {
                        console.log(result);
                    }
                    return 'success';
                }
            });
        }

        return _tools;
    },

    // Builds model information for the AI
    schemaContext: (): string => {
        let context: string

        let enumContext = ''

        for (const commonEnum in enums.AIEnabledCommonEnums) {
            const def = enums.AIEnabledCommonEnums[commonEnum as AIEnumKey].definition;
            enumContext += `<${commonEnum}>
\t${Object.keys(def).join('\n\t')}
</${commonEnum}>\n`
        }

        context = `<Enums>
${enumContext}</Enums>\n\n`

        let modelContext = ''

        for (const model of AIEnabledModels) {
            if (dataKeys[model] == null) {
                throw new ProgrammingError(`AI engine not initialized. Please call \`ai.initialize()\` before using the AI. It's also possible that the model ${model} is enabled for AI, but doesn't have any properties exposed to it. You shouldn't do that.`);
            }
            modelContext += `<${model}>
\t<Property name="id" type="id" description="The model object's unique identifier. This is a hexadecimal string."/>
\t${Object.keys(dataKeys[model]).map(key => `<Property name="${key}" type="${dataKeys[model][key].type}${dataKeys[model][key].isArray ? '[]' : ''}"${dataKeys[model][key].optional ? ' optional="true"' : ''}${dataKeys[model][key].description ? ` description="${dataKeys[model][key].description}"` : ''}/>`).join('\n\t')}
</${model}>\n`
        }

        context += `<Models>
${modelContext}</Models>`

        return `The following is a description of the database schema and models that are available to you. When performing actions that rely on database models, please refer back to this schema to guide you. Do not include any other properties/models/enums not listed here.

<DatabaseSchema>
    ${context}
</DatabaseSchema>`
    },

    initialize: async () => {
        // Load AI-enabled models
        for (const model of AIEnabledModels) {
            await Model.getModel(model);
        }
    },

    constructSystemPrompt: (context: {
        userId: Buffer,
        userName: string,
        tzOffset: number,
        contact: {
            id: string,
            fullName: string
        } | null
    }, prompt: string) => {
        const userTime = new Date();
        userTime.setMinutes(userTime.getMinutes() - context.tzOffset);
        return `${ai.schemaContext()}\n\n<SystemContext>
    <User id="${context.userId.toString('hex')}" name="${context.userName}"/>
    <TimeContext now="${userTime.toISOString().replace('Z', '')}"/>` + (context.contact != null ? `
    <Contact id="${context.contact!.id}" name="${context.contact!.fullName}"/>` : '') + `
</SystemContext>\n\n<Instructions>${prompt}

If the user asks for context specific information without that context provided, please let the user know. Possible contexts (which may or may not be present):
Contact: When the user is in the contact detail screen, the id and name of the contact that the user is currently viewing is provided. 
If the user is trying to use this context, please respond with something similar to "I don't know what contact you're referring to. Please open up one's details so I can help you further."
No other contexts are currently implemented.</Instructions>`;
    }
}

export default ai;