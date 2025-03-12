// Takes a prisma schema and generates the appropriate wrapper models

import * as fs from "fs";
import path from "node:path";
import {computeFullName} from "./src/db/sql/computeFunctions";
import {isEmptyString, pluralize} from "./src/util/strings";

const schema = fs.readFileSync("./prisma/schema.prisma", "utf8");

const modelRegex = /model ([A-Za-z0-9_]+) \{(.*?)\}/gms;
const enumRegex = /enum ([A-Za-z0-9_]+) \{(.*?)\}/gms;

const enums: Record<string, string> = {};
const models: Record<string, string> = {};

let match;
while ((match = modelRegex.exec(schema)) !== null) {
    const [, modelName, modelContents] = match;
    models[modelName as string] = modelContents as string;
}

while ((match = enumRegex.exec(schema)) !== null) {
    const [, enumName, enumContents] = match;
    enums[enumName as string] = enumContents as string;
}

type Column = {
    name: string;
    type: string;
    isNullable: boolean;
    defaultValue?: string;
    encrypted: boolean;
    uniqueEncrypted: boolean; // Encrypted with guid added to key

    foreignKey?: string; // Foreign key's name
    relationName?: string; // Name of the relationship
    compute?: 'fullName'
    jointable?: { targetModel: string, joinField: string, type: string } // For jointables
    graph?: boolean
    ignore?: boolean

    aiField?: boolean
    aiFieldDescription?: string

    joinedFields?: Array<{
        // Property to create in this model
        targetProperty: string,
        // Property of joining model
        joinPropertyName: string,
    }>

    // The name the id property of the intermediate model should be on the original model
    joinid?: string
}

type Model = {
    columns: Record<string, Column>,
    name: string,
    ignore: boolean
    softDelete: boolean,
    compoundPrimaryKey?: string // If the name is not manually specified, the key name is the concatenation of the component keys
}

const modelDefinitions: Record<string, Model> = {};
const modelsValidForAI: string[] = [];

const enumDefinitions: Record<string, {
    name: string,
    entries: string[],
    serverOnly: boolean,
    aiDisabled: boolean,
    aiDescription: string | null,
}> = {};

// Parse models into columns
for (const model in models) {
    let extraDecorators: string[] = [];

    const _model: Model = {
        columns: {},
        name: lowerFirst(model),
        ignore: false,
        softDelete: false
    }

    for (const line of models[model].split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('///')) {
            if (trimmed === '/// @@wrapper-ignore') {
                _model.ignore = true;
            } else if (trimmed === '/// @@ai-enabled') {
                modelsValidForAI.push(model);
            } else if (trimmed === '/// @@soft-delete') {
                _model.softDelete = true;
            }
            extraDecorators.push(line.replace('///', '').trim());
        } else if (trimmed.startsWith('@@id')) {
            const parser = /@@id\s*\(([\[\]a-zA-Z0-9_",\s:]+)\)/g;
            const match = parser.exec(trimmed);
            if (match) {
                const [, key] = match as string[];
                // check for name
                if (key.includes("name:")) {
                    const parser = /name:\s*"([a-zA-Z0-9_]+)"/g;
                    const match = parser.exec(key);
                    if (match) {
                        const [, name] = match as string[];
                        _model.compoundPrimaryKey = name;
                    }
                } else {
                    const parser = /\[([a-zA-Z0-9_,\s]+)\]/g;
                    const match = parser.exec(key);
                    if (match) {
                        const [, keys] = match as string[];
                        _model.compoundPrimaryKey = keys.split(',').map(key => key.trim()).join('_');
                    }
                }
            }
        } else if (trimmed === '' || trimmed.startsWith('id') || trimmed.startsWith('//') || trimmed.startsWith('@@')) {
            // Skip
        } else {
            const parser = /([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_\[\]]+\??)(?:\s+(.+))?/g;
            const match = parser.exec(trimmed);
            if (match) {
                const [, name, _type, _decorators] = match as string[];
                const __type = _type.trim();
                let nullable = __type.endsWith('?');
                const type = __type.replaceAll('?', '');
                const encrypted = extraDecorators.includes('@encrypted');
                const uniqueEncrypted = extraDecorators.includes('@uniqueEncrypted');

                if (name === 'createdAt' || name === 'updatedAt') {
                    nullable = true;
                }

                const column: Column = {
                    name: name.trim(),
                    type,
                    isNullable: nullable,
                    encrypted,
                    uniqueEncrypted,
                };

                for (const decorator of extraDecorators) {
                    if (decorator.startsWith('@computed')) {
                        column.compute = decorator.replace('@computed', '').replace('(\'', '').replace('\')', '').trim() as Column['compute'];
                    } else if (decorator.startsWith('@jointable')) {
                        let [type, joinField] = decorator.replace('@jointable', '').replace('(', '').replace(')', '').trim().split(',');
                        type = type.trim();
                        const targetModel = lowerFirst(type);
                        joinField = joinField.trim();
                        column.jointable = {type, targetModel, joinField};
                    } else if (decorator.startsWith('@graph')) {
                        column.graph = true;
                    } else if (decorator.startsWith('@wrapper-ignore')) {
                        column.ignore = true;
                    } else if (decorator.startsWith('@ai-field')) {
                        column.aiField = true;
                        if (decorator.includes('(')) {
                            const [, description] = decorator.split('(');
                            column.aiFieldDescription = description.replace(')', '').trim();
                        }
                    } else if (decorator.startsWith('@joinid')) {
                        let idPropertyName = decorator.replace('@joinid', '').replace('(', '').replace(')', '').trim();
                        column.joinid = idPropertyName;
                        column.joinedFields ??= [];
                        column.joinedFields.push({
                            targetProperty: idPropertyName,
                            joinPropertyName: 'id',
                        })
                    } else if (decorator.startsWith('@join')) {
                        let [joinObjectProperty, targetPropertyName] = decorator.replace('@join', '').replace('(', '').replace(')', '').trim().split(',');
                        joinObjectProperty = joinObjectProperty.trim();
                        targetPropertyName = targetPropertyName.trim();
                        column.joinedFields ??= [];

                        column.joinedFields.push({
                            targetProperty: targetPropertyName,
                            joinPropertyName: joinObjectProperty,
                        });
                    }
                }

                if (_decorators) {
                    const decoratorsParser = /@([^@]*)/g;
                    let match1;
                    const decorators: Record<string, string> = {}; // Key is decorator name, value is the parameters or empty string
                    while ((match1 = decoratorsParser.exec(_decorators)) !== null) {
                        const [, decorator] = match1 as string[];
                        const decoratorParser = /([a-zA-Z0-9]+)\(([^\)]*)\)/g;
                        const match2 = decoratorParser.exec(decorator);
                        if (match2) {
                            const [, decoratorName, paramValue] = match2 as string[];
                            decorators[decoratorName] = paramValue;
                        }
                    }

                    for (const decorator in decorators) {
                        const decoratorValue = decorators[decorator];
                        switch (decorator) {
                            case 'relation': {
                                const items = decoratorValue.split(',');
                                for (const item of items) {
                                    let [key, value] = item.trim().split(':');
                                    key = key.trim();
                                    value = value.trim();
                                    if (key === 'fields') {
                                        const parser = /\[([^\]]+)\]/g;
                                        const match = parser.exec(value);
                                        if (match) {
                                            const [, fieldName] = match as string[];
                                            column.foreignKey = fieldName.trim();
                                        }
                                    } else if (key === 'name') {
                                        column.relationName = value;
                                    }
                                }
                                break;
                            }
                            case 'default': {
                                if (decoratorValue === 'now(') { // Regex cuts off the last parenthesis
                                    // Handled by Prisma or db or whatever (I'm not quite sure lol)
                                } else {
                                    column.defaultValue = decoratorValue.trim();
                                }
                            }
                        }
                    }
                }

                _model.columns[column.name] = column;
                extraDecorators = [];
            }
        }
    }

    modelDefinitions[model] = _model;
}

// Parse enums into definitions
for (const enumName in enums) {
    enumDefinitions[enumName] = {
        name: enumName,
        entries: [],
        serverOnly: false,
        aiDisabled: false,
        aiDescription: null,
    };

    for (const line of enums[enumName].split('\n')) {
        const trimmed = line.trim();
        if (trimmed === '/// @@server') {
            enumDefinitions[enumName].serverOnly = true;
        } else if (trimmed.startsWith('/// @@ai-disabled')) {
            enumDefinitions[enumName].aiDisabled = true;
        } else if (trimmed.startsWith('/// @@ai-enum-description(')) {
            const [, description] = trimmed.split('(');
            const descriptionEnd = description.indexOf(')');
            enumDefinitions[enumName].aiDescription = description.substring(description.indexOf('(') + 1, descriptionEnd);
        } else if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('@@')) {
            // Skip
        } else {
            const parser = /([a-zA-Z0-9_]+)/g;
            const match = parser.exec(trimmed);
            if (match) {
                const [, entry] = match as string[];
                enumDefinitions[enumName].entries.push(entry);
            }
        }
    }
}

type TSEnum = {
    declaration: string, // Enum declaration. e.g. enum XXX
    values: string[], // Full definitions of values
}

const tsEnums: Record<string, TSEnum> = {};
const serverOnlyEnums: Record<string, string> = {};
const commonEnums: Record<string, {
    description: string | null,
    aiDisabled: boolean,
}> = {};

for (const enumName in enumDefinitions) {
    const enumDef = enumDefinitions[enumName];
    const tsEnum: TSEnum = {
        declaration: `export enum ${enumDef.name} {`,
        values: [],
    };

    for (const entry of enumDef.entries) {
        tsEnum.values.push(`\t${entry} = '${entry}'`);
    }

    if (enumDef.serverOnly) {
        serverOnlyEnums[enumDef.name] = enumDef.name;
    } else {
        commonEnums[enumDef.name] = {
            description: enumDef.aiDescription,
            aiDisabled: enumDef.aiDisabled
        };
    }

    tsEnums[enumDef.name] = tsEnum;
}

type TSModel = {
    name: string,

    // UPDATED WHENEVER A MODEL IS UPDATED
    imports: string[],
    properties: string[], // Full definitions of properties
    constructorExtraDataType: Record<string, string>, // Key to data type

    // Function templates will only be added if the model file doesn't exist
    readFunction: string, // Full function definition
    readUniqueFunction: string, // Full function definition
    countFunction: string, // Full function definition
    existsFunction: string, // Full function definition
    getByIdFunction: string, // Full function definition
    searchFunction: string, // Just the header of the function because the body actually has to be implemented
    className: string // Class name function
}

const readFunctionTemplate = `static async read<Attrs extends ReadAttributes<{{className}}>>(options: ReadOptions<{{className}}, Attrs>): Promise<ModelSet<ReadResult<{{className}}, Attrs>>> {
		return Model._read(this, options);
    }`

const readUniqueFunctionTemplate = `static async readUnique<Attrs extends ReadAttributes<{{className}}>>(options: ReadUniqueOptions<{{className}}, Attrs>): Promise<ReadResult<{{className}}, Attrs> | null> {
        return await Model._readUnique(this, options);
    }`

const countFunctionTemplate = `static async count(where?: ReadWhere<{{className}}>): Promise<number> {
        return Model._count(this, where);
    }`

const existsFunctionTemplate = `static async exists(where: ReadWhere<{{className}}>): Promise<boolean> {
        return Model._exists(this, where);
    }`

const getByIdFunctionTemplate = `static async getById<Attrs extends ReadAttributes<{{className}}>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<{{className}}, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }`

const searchFunctionTemplate = `static async search<Attrs extends ReadAttributes<{{className}}>>(searchString: string, select: Attrs, count: number, offset: number, tenetId?: Buffer): Promise<SearchResult<{{className}}, Attrs>> {
        /* TODO: Implement search function */
    }`

const classNameTemplate = `static className = (): ModelKeys => '{{className}}';`

function lowerFirst(str: string) {
    const char1 = str.charAt(0).toLowerCase();

    return char1 + str.slice(1);
}

type Import = {
    defaultImport?: boolean,
    name: string,
}

class ImportSet {
    private readonly _set: Record<string, Import> = {};

    constructor(items: Import[]) {
        for (const item of items) {
            this._set[item.name] = item;
        }
    }

    add(item: Import) {
        this._set[item.name] = item;
    }

    get(key: string) {
        return this._set[key];
    }

    values() {
        return Object.values(this._set);
    }

    [Symbol.iterator]() {
        return this.values()[Symbol.iterator]();
    }
}

for (const modelName in modelDefinitions) {
    const modelDef = modelDefinitions[modelName];

    if (modelDef.ignore) {
        continue;
    }

    const imports: Record<string, ImportSet> = {
        '~/db/sql/SQLBase': new ImportSet([{name: 'Model'}, {name: 'models'}]),
        '~/util/db/ModelSet': new ImportSet([{name: 'ModelSet', defaultImport: true}]),
        '~/db/sql/types/model': new ImportSet([{name: 'ReadOptions'}, {name: 'ReadUniqueOptions'}, {name: 'SearchResult'}, {name: 'ReadResult'}]),
        '~/db/sql/types/where': new ImportSet([{name: 'ReadWhere'}]),
        '~/db/sql/types/select': new ImportSet([{name: 'ReadAttributes'}]),
        '~/db/sql/keys': new ImportSet([{name: 'ModelKeys'}]),
    }; // File name to import names

    function importType(file: string, name: string, defaultImport?: boolean) {
        if (imports[file] === undefined) {
            imports[file] = new ImportSet([{name, defaultImport}]);
        } else {
            imports[file].add({name, defaultImport});
        }
    }

    const tsModel: TSModel = {
        name: modelName,
        imports: [],
        properties: [],
        constructorExtraDataType: {},
        readFunction: readFunctionTemplate.replaceAll('{{className}}', modelName),
        readUniqueFunction: readUniqueFunctionTemplate.replaceAll('{{className}}', modelName),
        countFunction: countFunctionTemplate.replaceAll('{{className}}', modelName),
        existsFunction: existsFunctionTemplate.replaceAll('{{className}}', modelName),
        getByIdFunction: getByIdFunctionTemplate.replaceAll('{{className}}', modelName),
        searchFunction: searchFunctionTemplate.replaceAll('{{className}}', modelName),
        className: classNameTemplate.replaceAll('{{className}}', lowerFirst(modelName)),
    };

    type Property = {
        name: string,
        decorators: string[],
        type: string,
        computeDecorator?: string,
        graph?: boolean,
        aiField?: {
            type: string,
            description: string | null,
            isArray?: boolean,
            optional?: boolean
        },
        joinedFields?: Array<JoinedProperty>
        joinReverseField?: string
        intermediateCompositeKey?: string
        intermediateOtherId?: string
        intermediateThisId?: string
    };

    type JoinedProperty = {
        name: string,
        type: string,
        aiField?: {
            type: string,
            description: string | null,
            isArray?: boolean,
            optional?: boolean
        },
        fromProperty: string,
        joinField: string
        nullable: boolean
    }

    if (modelDef.softDelete) {
        if (modelDef.columns.deleted == null || modelDef.columns.deleted.type !== 'Boolean' || modelDef.columns.deleted.isNullable === true) {
            throw new Error(`Soft delete model ${modelDef.name} must have a \`deleted\` non-null boolean column`);
        } else if (modelDef.columns.deleted.defaultValue !== 'false') {
            throw new Error(`Dude, you shouldn't have ${pluralize(modelName)} be deleted by default`);
        } else if (modelDef.columns.deletedAt == null || modelDef.columns.deletedAt.type !== 'DateTime' || modelDef.columns.deletedAt.isNullable === false) {
            throw new Error(`Soft delete model ${modelDef.name} must have a \`deletedAt\` nullable datetime column`);
        }
    }

    const selfReferencedJoinedKeys = new Set<string>();
    for (const columnKey in modelDef.columns) {
        const column = modelDef.columns[columnKey];

        if (column.ignore) {
            continue;
        }

        const prop = {
            name: column.name,
            decorators: [],
            type: column.type,
        } as Property;

        function getType(column: Column) {
            let type = '';

            switch (column.type) {
                case 'String':
                    type = 'string';
                    break;
                case 'String[]':
                    type = 'string[]';
                    break;
                case 'Int':
                case 'Float':
                    type = 'number';
                    break;
                case 'Int[]':
                case 'Float[]':
                    type = 'number[]';
                    break;
                case 'Boolean':
                    type = 'boolean';
                    break;
                case 'DateTime':
                    type = 'Date';
                    break;
                case 'Bytes':
                    type = 'Buffer';
                    break;
                default:
                    type = column.type; // Another model or enum
                    break;
            }

            return type;
        }

        const type = getType(column);
        prop.type = type
        const validEncryptionTypes = ['string', 'string[]', 'number', 'number[]', 'boolean', 'date'];

        const nonArrayType = type.replaceAll('[]', '');
        const isPrimitiveColumn = !column.foreignKey && !column.compute && !(nonArrayType in modelDefinitions) && !column.jointable;

        if ((column.isNullable || column.defaultValue) && isPrimitiveColumn) {
            prop.decorators.push('@persisted')

            importType('~/db/sql/decorators', 'persisted');
        } else if (isPrimitiveColumn && !column.defaultValue) {
            prop.decorators.push('@required')

            importType('~/db/sql/decorators', 'required');
        }

        if (column.uniqueEncrypted) {
            if (!validEncryptionTypes.includes(type)) {
                throw new Error(`Unique encrypted property ${column.name} is not a valid encryption type. Instead it is ${type}`);
            }
            if (type !== 'string') {
                prop.decorators.push(`@uniqueEncrypted(${type})`)
            } else prop.decorators.push('@uniqueEncrypted()')

            importType('~/db/sql/decorators', 'uniqueEncrypted');
        } else if (column.encrypted) {
            if (!validEncryptionTypes.includes(type)) {
                throw new Error(`Unique encrypted property ${column.name} is not a valid encryption type. Instead it is ${type}`);
            }
            if (type !== 'string') {
                prop.decorators.push(`@encrypted(${type})`)
            } else prop.decorators.push('@encrypted()')

            importType('~/db/sql/decorators', 'encrypted');
        }

        function parseAiField(column: Column) {
            let type = getType(column);

            if (column.jointable != null) {
                type = column.jointable.type;
            }

            const _dtype = type.replace('[]', '').replace('?', '');
            const dtype = _dtype.toLowerCase();
            let paramDtype = null as string | null;

            const isArray = type.endsWith('[]');
            // Created at and updated at have special handlings internally
            const optional = (column.isNullable && !isArray) && !(column.name === 'createdAt' || column.name === 'updatedAt');

            const dtypeMapping: { [key: string]: string } = {
                'string': 'string',
                'number': 'number',
                'boolean': 'boolean',
                'date': 'date',
                'buffer': 'id',
            }

            if (dtype in dtypeMapping) {
                paramDtype = `'${dtypeMapping[dtype]}'`;
            } else if (models[_dtype] != null) {
                paramDtype = `'${lowerFirst(_dtype)}'`; // Model key
            } else if (_dtype in enums) {
                paramDtype = `'${_dtype}'`; // Enum
            }

            if (paramDtype == null) {
                throw new Error(`Unknown type ${dtype} for ${modelName}.${prop.name}`);
            }

            return {
                type: paramDtype,
                description: column.aiFieldDescription ?? null,
                isArray,
                optional
            };
        }

        if (!column.jointable) {
            if (column.foreignKey) {
                const relatedModel = modelDefinitions[nonArrayType];
                let oppositeColumn: string | null = null;

                for (const relatedColumnKey in relatedModel.columns) {
                    const relatedColumn = relatedModel.columns[relatedColumnKey];

                    if (nonArrayType === modelName && relatedColumn.name === column.name) {
                        // do nothing
                    } else if (relatedColumn.relationName === column.relationName && column.relationName != null) {
                        oppositeColumn = relatedColumn.name;
                        break;
                    } else if (relatedColumn.type.replaceAll('[]', '').replaceAll('?', '') === modelName && column.relationName == relatedColumn.relationName) {
                        oppositeColumn = relatedColumn.name;
                        break;
                    }
                }

                if (oppositeColumn == null) {
                    throw new Error(`Could not find opposite column for ${modelName}.${column.name}`);
                }

                const isArray = column.type.trim().endsWith('[]');
                prop.decorators.push(`@wrap('${lowerFirst(nonArrayType)}', '${oppositeColumn}', '${column.foreignKey}', true, ${isArray})`)

                if (modelName !== nonArrayType) {
                    importType(`~/db/sql/models/${nonArrayType}`, nonArrayType);
                }
                importType('~/db/sql/decorators', 'wrap');
            } else if (nonArrayType in modelDefinitions) {
                const relatedModel = modelDefinitions[nonArrayType];
                let oppositeColumn: string | null = null;
                let fKey: string | null = null;

                for (const relatedColumnKey in relatedModel.columns) {
                    const relatedColumn = relatedModel.columns[relatedColumnKey];

                    if (nonArrayType === modelName && relatedColumn.name === column.name) {
                        // do nothing
                    } else if (relatedColumn.relationName === column.relationName && column.relationName != null) {
                        oppositeColumn = relatedColumn.name;
                        fKey = relatedColumn.foreignKey!;
                        break;
                    } else if (relatedColumn.type.replaceAll('[]', '').replaceAll('?', '') === modelName && column.relationName == relatedColumn.relationName) {
                        oppositeColumn = relatedColumn.name;
                        fKey = relatedColumn.foreignKey!;
                        break;
                    }
                }

                if (oppositeColumn == null) {
                    throw new Error(`Could not find opposite column for ${modelName}.${column.name}`);
                } else if (fKey == null) {
                    throw new Error(`Could not find foreign key for ${nonArrayType}.${oppositeColumn} (Looking for reverse relationship of ${modelName}.${column.name})`);
                }

                prop.decorators.push(`@wrap('${lowerFirst(nonArrayType)}', '${oppositeColumn}', '${fKey}', false, ${column.type.trim().endsWith('[]')})`)

                if (modelName !== nonArrayType) {
                    importType(`~/db/sql/models/${nonArrayType}`, nonArrayType);
                }
                importType('~/db/sql/decorators', 'wrap');
            } else if (nonArrayType in enums) {
                if (nonArrayType in commonEnums) {
                    importType('~/common/enum/enumerations', nonArrayType);
                } else if (nonArrayType in serverOnlyEnums) {
                    importType('~/common/enum/serverenums', nonArrayType);
                }
            }
        } else {
            if (!(column.jointable.type in modelDefinitions)) {
                throw new Error(`Jointable target model ${column.jointable.type} not found`);
            }

            prop.type = column.jointable.type + '[]';

            if (column.jointable.type !== nonArrayType && column.jointable.type !== modelName) {
                // Don't need to import if it's a self-referential jointable
                importType(`~/db/sql/models/${column.jointable.type}`, column.jointable.type);
            }
            importType('~/db/sql/decorators', 'jointable');

            const intermediateModel = modelDefinitions[nonArrayType];

            if (!column.joinid) {
                if (!intermediateModel.compoundPrimaryKey) {
                    throw new Error(`No joinid is specified for ${modelName}.${column.name} but the intermediate model ${nonArrayType} does not have a compound primary key. Please specify a joinid for this join.`);
                }
                prop.intermediateCompositeKey = intermediateModel.compoundPrimaryKey;
            }

            const joinedModel = modelDefinitions[column.jointable.type];

            if (joinedModel == null) {
                throw new Error(`Jointable target model ${column.jointable.type} not found`);
            }

            if (intermediateModel.columns[column.jointable.joinField] == null) {
                throw new Error(`Jointable join field ${column.jointable.joinField} not found in the intermediate model ${nonArrayType}.`);
            }

            if (intermediateModel.columns[column.jointable.joinField].foreignKey == null) {
                throw new Error(`Jointable join field ${column.jointable.joinField} does not have an associated id column in the intermediate model ${nonArrayType}.`);
            } else {
                prop.intermediateOtherId = intermediateModel.columns[column.jointable.joinField].foreignKey;
            }

            let reverseJoinField = '';

            for (const columnKey in joinedModel.columns) {
                const _column = joinedModel.columns[columnKey];
                if (_column.jointable != null && _column.jointable.type === modelName && _column.type === column.type && columnKey !== column.name) {
                    if (reverseJoinField !== '' && _column.jointable.type !== column.jointable.type) {
                        // Self-referential jointables have looser checks because I don't want to implement checks for join fields that reference the same model 3+ times (for whatever reason)
                        // However, in self-referential case, 2 jointable fields is fine
                        throw new Error(`Multiple jointable fields found linking ${modelName} to ${_column.jointable.type} through ${nonArrayType}`);
                    }
                    reverseJoinField = _column.name;

                    const intermediateId = intermediateModel.columns[_column.jointable.joinField].foreignKey;
                    if (intermediateId != null) {
                        prop.intermediateThisId = intermediateId;
                    }
                }
            }

            if (reverseJoinField == '') {
                throw new Error(`Jointable reverse join field not specified for ${modelName}.${column.name}. ${column.jointable.type} must have a jointable field linking it to ${modelName}`);
            }

            prop.joinReverseField = reverseJoinField;
            if (column.joinedFields != null && column.joinedFields.length > 0) {
                for (const field of column.joinedFields) {
                    if (field.joinPropertyName === 'id') {
                        prop.joinedFields ??= [];
                        prop.joinedFields.push({
                            name: field.targetProperty,
                            type: 'Buffer',
                            fromProperty: 'id',
                            joinField: reverseJoinField,
                            nullable: false
                        })
                    } else if (intermediateModel.columns[field.joinPropertyName] == null) {
                        throw new Error(`Jointable target property ${field.joinPropertyName} not found in ${nonArrayType}`);
                    } else {
                        const col = intermediateModel.columns[field.joinPropertyName];
                        const _prop: JoinedProperty = {
                            name: field.targetProperty,
                            type: getType(col),
                            aiField: col.aiField ? parseAiField(col) : undefined,
                            fromProperty: field.joinPropertyName,
                            joinField: reverseJoinField,
                            nullable: col.isNullable
                        }

                        if (_prop.type in enums) {
                            if (_prop.type in commonEnums) {
                                importType('~/common/enum/enumerations', _prop.type);
                            } else if (_prop.type in serverOnlyEnums) {
                                importType('~/common/enum/serverenums', _prop.type);
                            }
                        } else if (_prop.type in models) {
                            throw new Error(`As of now, joined fields do not support models. I will add support if it becomes necessary.`);
                        }

                        if (prop.joinedFields == null) {
                            prop.joinedFields = [];
                        }

                        prop.joinedFields.push(_prop);

                    }
                    importType('~/db/sql/decorators', 'join');

                }
            }
        }

        if (column.compute) {
            switch (column.compute) {
                case 'fullName':
                    const computeFunction = computeFullName;
                    for (const dependency of computeFunction.dependencies) {
                        if (Object.keys(!modelDef.columns).includes(dependency)) {
                            throw new Error(`Compute function ${column.compute} depends on ${dependency}, but ${dependency} is not a column in ${modelName}`);
                        }
                    }
                    prop.computeDecorator = computeFunction.functionDefinition.replaceAll('{{className}}', modelName).replaceAll('{{classNameLower}}', lowerFirst(modelName));

                    importType('~/db/sql/decorators', 'computed');
                    break;

                default:
                    throw new Error(`Invalid compute function ${column.compute}`);
            }
        }

        if (column.defaultValue) {
            let defaultValue = column.defaultValue;

            if (nonArrayType in enums) {
                defaultValue = `${nonArrayType}.${defaultValue}`
            }

            prop.decorators.push(`@Default(${defaultValue})`)
            importType('~/db/sql/decorators', 'Default');
        }

        // if (column.graph) {
        //     prop.graph = true;
        //     importType('~/db/sql/decorators', 'graphProp');
        // }

        if (column.aiField) {
            prop.aiField = parseAiField(column);
            importType('~/ai/AI', 'ai', true);
        }

        const computeDecorator = prop.computeDecorator ? prop.computeDecorator + '\n\t' : '';
        const aiFieldDecorator = prop.aiField != null ? `@ai.property(${prop.aiField.type}, ${prop.aiField.description == null ? 'null' : `"${prop.aiField.description}"`}, ${prop.aiField.isArray}, ${prop.aiField.optional})\n\t` : '';
        const decorators = prop.computeDecorator || prop.decorators.length === 0 ? '' : prop.decorators.join(' ') + ' ';
        // const graphProp = prop.graph ? '@graphProp ' : '';
        const graphProp = '';
        const nullable = column.isNullable && column.name !== 'createdAt' && column.name !== 'updatedAt' ? ' | null' : '';
        const jointableDecorator = column.jointable ? `@jointable('${column.jointable.targetModel}', '${column.jointable.joinField}', '${prop.intermediateThisId}', '${prop.intermediateOtherId}', ${column.joinid ? 'true' : `'${prop.intermediateCompositeKey}'`}${prop.joinReverseField != null ? `, '${prop.joinReverseField}'` : ''})\n\t` : '';

        const idx = tsModel.properties.length;
        let isBlock = false;

        if (idx > 0 && (!isEmptyString(computeDecorator) || !isEmptyString(aiFieldDecorator) || !isEmptyString(jointableDecorator))) {
            isBlock = true;
            if (tsModel.properties[idx - 1] !== '') {
                tsModel.properties.push('')
            }
        }

        tsModel.properties.push(`${computeDecorator}${aiFieldDecorator}${jointableDecorator}${decorators}${graphProp}declare public ${prop.name}?: ${prop.type}${nullable};`);

        const priorIsBlock = isBlock;

        for (const joinedField of prop.joinedFields ?? []) {
            if (idx > 0) {
                isBlock = true;
            }
            const _field = joinedField as JoinedProperty;
            const aiFieldDecorator = _field.aiField != null ? `@ai.property(${_field.aiField.type}, ${_field.aiField.description == null ? 'null' : `"${_field.aiField.description}"`}, ${_field.aiField.isArray}, ${_field.aiField.optional})\n\t` : '';
            const nullable = _field.nullable && column.name !== 'createdAt' && column.name !== 'updatedAt' ? ' | null' : '';

            const selfReferential = column.jointable != null && column.jointable.type === modelName
            const selfReferenceKey = `${nonArrayType}.${_field.fromProperty}`

            if (selfReferential && selfReferencedJoinedKeys.has(selfReferenceKey)) {
                continue; // Don't add join key as it's already added
            }

            // If self referential, the "reverse" fields are both the related jointables, otherwise just the reverse field;
            const reverses = selfReferential ? `['${_field.joinField}', '${column.name}']` : `'${_field.joinField}'`

            if (selfReferential) {
                selfReferencedJoinedKeys.add(selfReferenceKey);
            }

            tsModel.properties.push(`\n\t@join('${_field.fromProperty}', ${reverses}, '${column.jointable!.targetModel}')\n\t${aiFieldDecorator}declare public ${_field.name}?: ${_field.type}${nullable};`);

            tsModel.constructorExtraDataType[_field.name] = `${_field.type}${nullable}`;
        }

        if (isBlock) {
            tsModel.properties.push('');
            if (!priorIsBlock && tsModel.properties[idx - 1] !== '') {
                tsModel.properties.splice(idx, 0, '');
            }
        }

        tsModel.constructorExtraDataType[prop.name] = prop.type + (column.isNullable ? ' | null' : '');
    }

    if (tsModel.properties[tsModel.properties.length - 1] === '') {
        tsModel.properties.pop();
    }

    // Write to file
    if (!fs.existsSync(path.join(process.cwd(), 'src/db/sql/models'))) {
        fs.mkdirSync(path.join(process.cwd(), 'src/db/sql/models'));
    }

    const beginImport = '/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */'
    const endImport = '/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */'

    const beginGeneratedTypes = '/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */'
    const endGeneratedTypes = '/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */'

    const beginGeneratedProperties = '/* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */'
    const endGeneratedProperties = '/* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */'

    const finalizeImports = () => {
        for (const importFile in imports) {
            const importValue = Array.from(imports[importFile]);
            const defaultImport = importValue.find(i => i.defaultImport);

            if (!defaultImport) {
                tsModel.imports.push(`import {${importValue.map(i => i.name).join(', ')}} from '${importFile}';`);
            } else {
                const filtered = importValue.filter(i => !i.defaultImport);
                if (filtered.length > 0) {
                    tsModel.imports.push(`import ${defaultImport.name}, {${filtered.map(i => i.name).join(', ')}} from '${importFile}';`);
                } else {
                    tsModel.imports.push(`import ${defaultImport.name} from '${importFile}';`);
                }
            }
        }
    }

    if (!fs.existsSync(path.join(process.cwd(), 'src/db/sql/models', modelName + '.ts'))) {
        finalizeImports();
        fs.writeFileSync(path.join(process.cwd(), 'src/db/sql/models', modelName + '.ts'), `${beginImport}
${tsModel.imports.join('\n')}
${endImport}

${beginGeneratedTypes}
type ${modelName}DefaultData = {
${Object.keys(tsModel.constructorExtraDataType).map(key => `\t${key}?: ${tsModel.constructorExtraDataType[key]}`).join(';\n')}
}
${endGeneratedTypes}
    
    
/* Automatically generated type for \`data\` field in constructor. Can be modified */
type ${modelName}Data = ${modelName}DefaultData & {
}
/* End automatically generated type for \`data\` field in constructor */
        
export class ${modelName} extends Model<${modelName}> {
    ${beginGeneratedProperties}
    ${tsModel.properties.join('\n\t')}
    ${endGeneratedProperties}
    
    constructor(id?: Buffer | string | Uint8Array, data?: ${modelName}Data) {
        super(id, data);
    }
    
    ${tsModel.readFunction}
    
    ${tsModel.readUniqueFunction}
    
    ${tsModel.countFunction}
    
    ${tsModel.existsFunction}
    
    ${tsModel.getByIdFunction}
    
    ${tsModel.searchFunction}
    
    ${tsModel.className}
}

models.${lowerFirst(modelName)} = ${modelName};
        `);
    } else {
        // Check for existing imports
        const baseFile = ['dbClient']
        const decorators = ['@calculated'/*, '@relationship'*/, '@on', '@computed']
        const types: Record<string, string> = {
            'ReadOrder': 'model',
            'ModelQueryable': 'model',
            'ModelAttributes': 'model',
            'ReadSubResult': 'model',
        }

        // File exists already, so we'll just merge using the defined comments
        let fileContents = fs.readFileSync(path.join(process.cwd(), 'src/db/sql/models', modelName + '.ts'), 'utf8');

        function containsWholeWord(str: string, word: string) {
            const regex = new RegExp(`\\b${word}\\b`, 'g');
            return regex.test(str);
        }

        if (containsWholeWord(fileContents, `AIContext`)) {
            importType(`~/ai/AI`, 'AIContext', false);
        }

        for (const base of baseFile) {
            if (containsWholeWord(fileContents, base)) {
                importType(`~/db/sql/SQLBase`, base, false);
            }
        }

        for (const decorator of decorators) {
            if (fileContents.includes(decorator)) {
                importType(`~/db/sql/decorators`, decorator.replace('@', ''), false);
            }
        }

        for (const type in types) {
            if (containsWholeWord(fileContents, type)) {
                importType(`~/db/sql/types/${types[type]}`, type, false);
            }
        }

        const _commonEnums = ['ContactRelationshipType', 'ClassNameMapping'].concat(Object.keys(commonEnums)).concat(Object.keys(commonEnums).map(key => `${key}NameMapping`))

        for (const type of _commonEnums) {
            if (containsWholeWord(fileContents, type)) {
                importType(`~/common/enum/enumerations`, type, false);
            }
        }

        const _serverOnlyEnums = ['AccessGroupHierarchy'].concat(Object.keys(serverOnlyEnums))

        for (const type of _serverOnlyEnums) {
            if (containsWholeWord(fileContents, type)) {
                importType(`~/common/enum/serverenums`, type, false);
            }
        }

        for (const model of Object.keys(models)) {
            if (containsWholeWord(fileContents, model) && model !== modelName) {
                importType(`~/db/sql/models/${model}`, model);
            }
        }

        finalizeImports();

        const importStart = fileContents.indexOf(beginImport);
        const importEnd = fileContents.indexOf(endImport);

        if (importStart === -1 || importEnd === -1) {
            throw new Error('Could not find import comments in file');
        }

        const substr = fileContents.substring(importStart, importEnd + endImport.length);

        fileContents = fileContents.replace(substr, `${beginImport}
${tsModel.imports.join('\n')}
${endImport}`);

        const typeStart = fileContents.indexOf(beginGeneratedTypes);
        const typeEnd = fileContents.indexOf(endGeneratedTypes);

        if (typeStart === -1 || typeEnd === -1) {
            throw new Error('Could not find type comments in file');
        }

        const typeSubstr = fileContents.substring(typeStart, typeEnd + endGeneratedTypes.length);

        fileContents = fileContents.replace(typeSubstr, `${beginGeneratedTypes}
type ${modelName}DefaultData = {
${Object.keys(tsModel.constructorExtraDataType).map(key => `\t${key}?: ${tsModel.constructorExtraDataType[key]}`).join(';\n')}
}
${endGeneratedTypes}`);

        const propertyStart = fileContents.indexOf(beginGeneratedProperties);
        const propertyEnd = fileContents.indexOf(endGeneratedProperties);

        if (propertyStart === -1 || propertyEnd === -1) {
            throw new Error('Could not find property comments in file');
        }

        const propertySubstr = fileContents.substring(propertyStart, propertyEnd + endGeneratedProperties.length);

        fileContents = fileContents.replace(propertySubstr, `${beginGeneratedProperties}
    ${tsModel.properties.join('\n\t')}
    ${endGeneratedProperties}`);

        fs.writeFileSync(path.join(process.cwd(), 'src/db/sql/models', modelName + '.ts'), fileContents);
    }
}

if (!fs.existsSync(path.join(process.cwd(), 'src/common/enum'))) {
    fs.mkdirSync(path.join(process.cwd(), 'src/common/enum'));
}

if (!fs.existsSync(path.join(process.cwd(), 'src/common/enum/serverenums.ts'))) {
    let content = `//import 'server-only'\n\n`;
    // Write enums to file

    for (const serverOnlyEnum in serverOnlyEnums) {
        const enumDef = tsEnums[serverOnlyEnum];

        content += `/* BEGIN GENERATED ENUM ${serverOnlyEnum}: DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum ${serverOnlyEnum} {
    ${enumDef.values.join(',\n\t')}
}
/* END GENERATED ENUM ${serverOnlyEnum}: DO NOT MODIFY OR REMOVE THIS COMMENT */\n\n`;
    }

    fs.writeFileSync(path.join(process.cwd(), 'src/common/enum/serverenums.ts'), content.trim());
} else {
    // Update enums
    let fileContents = fs.readFileSync(path.join(process.cwd(), 'src/common/enum/serverenums.ts'), 'utf8');

    const enumStartTemplate = `/* BEGIN GENERATED ENUM {{serverOnlyEnum}} DO NOT MODIFY OR REMOVE THIS COMMENT */`
    const enumEndTemplate = `/* END GENERATED ENUM {{serverOnlyEnum}} DO NOT MODIFY OR REMOVE THIS COMMENT */`

    for (const serverOnlyEnum in serverOnlyEnums) {
        const enumDef = tsEnums[serverOnlyEnum];

        const start = enumStartTemplate.replace('{{serverOnlyEnum}}', serverOnlyEnum);
        const end = enumEndTemplate.replace('{{serverOnlyEnum}}', serverOnlyEnum);

        const enumStart = fileContents.indexOf(start);
        const enumEnd = fileContents.indexOf(end);

        if (enumStart === -1 && enumEnd === -1) {
            // Add enum
            fileContents += `\n\n${start}
export enum ${serverOnlyEnum} {
    ${enumDef.values.join(',\n\t')}
}
${end}`;

            continue;
        } else if (enumStart === -1 || enumEnd === -1) {
            throw new Error('Could not find enum comments in file');
        }

        const enumSubstr = fileContents.substring(enumStart, enumEnd + end.length);

        fileContents = fileContents.replace(enumSubstr, `${start}
export enum ${serverOnlyEnum} {
    ${enumDef.values.join(',\n\t')}
}
${end}`);
    }

    fs.writeFileSync(path.join(process.cwd(), 'src/common/enum/serverenums.ts'), fileContents);
}

const aiEnabledEnums = Object.keys(commonEnums).filter(key => !commonEnums[key].aiDisabled);

if (!fs.existsSync(path.join(process.cwd(), 'src/common/enum/enumerations.ts'))) {
    let content = ``;
    // Write enums to file

    for (const commonEnum in commonEnums) {
        const enumDef = tsEnums[commonEnum];

        content += `/* BEGIN GENERATED ENUM ${commonEnum}: DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum ${commonEnum} {
    ${enumDef.values.join(',\n\t')}
}
/* END GENERATED ENUM ${commonEnum}: DO NOT MODIFY OR REMOVE THIS COMMENT */\n\n`;
    }

    content += `/* BEGIN GENERATED ENUM LIST DO NOT MODIFY OR REMOVE THIS COMMENT */
export declare type AIEnumKey = ${aiEnabledEnums.map(commonEnum => `'${commonEnum}'`).join(' | ')};
// Key is the enum name
export const AIEnabledCommonEnums: Record<AIEnumKey, {
    definition: Record<string, string>,
    description: string | null,
    nameMapping: string,
}> = {
    ${aiEnabledEnums.map(commonEnum => (
        `${commonEnum}: { definition: ${commonEnum}, description: ${commonEnums[commonEnum].description ? `'${commonEnums[commonEnum].description}'` : null}, nameMapping: '${commonEnum}NameMapping' }`
    )).filter(Boolean).join(',\n\t')}
}
/* END GENERATED ENUM LIST DO NOT MODIFY OR REMOVE THIS COMMENT */\n\n`;

    fs.writeFileSync(path.join(process.cwd(), 'src/common/enum/enumerations.ts'), content.trim());
} else {
    // Update enums
    let fileContents = fs.readFileSync(path.join(process.cwd(), 'src/common/enum/enumerations.ts'), 'utf8');

    const enumStartTemplate = `/* BEGIN GENERATED ENUM {{commonEnum}} DO NOT MODIFY OR REMOVE THIS COMMENT */`
    const enumEndTemplate = `/* END GENERATED ENUM {{commonEnum}} DO NOT MODIFY OR REMOVE THIS COMMENT */`

    for (const commonEnum in commonEnums) {
        const enumDef = tsEnums[commonEnum];

        const start = enumStartTemplate.replace('{{commonEnum}}', commonEnum);
        const end = enumEndTemplate.replace('{{commonEnum}}', commonEnum);

        const enumStart = fileContents.indexOf(start);
        const enumEnd = fileContents.indexOf(end);

        if (enumStart === -1 && enumEnd === -1) {
            // Add enum
            fileContents += `\n\n${start}
export enum ${commonEnum} {
    ${enumDef.values.join(',\n\t')}
}
${end}`;
            continue;
        } else if (enumStart === -1 || enumEnd === -1) {
            throw new Error(`Could not find enum comments for enum ${commonEnum} in file enumerations.ts`);
        }

        const enumSubstr = fileContents.substring(enumStart, enumEnd + end.length);

        fileContents = fileContents.replace(enumSubstr, `${start}
export enum ${commonEnum} {
    ${enumDef.values.join(',\n\t')}
}
${end}`);
    }

    const enumListTemplate = `/* BEGIN GENERATED ENUM LIST DO NOT MODIFY OR REMOVE THIS COMMENT */`
    const enumListEndTemplate = `/* END GENERATED ENUM LIST DO NOT MODIFY OR REMOVE THIS COMMENT */`

    const enumListStart = fileContents.indexOf(enumListTemplate);
    const enumListEnd = fileContents.indexOf(enumListEndTemplate);

    if (enumListStart === -1) {
        // Just add it at the end
        fileContents += `/* BEGIN GENERATED ENUM LIST DO NOT MODIFY OR REMOVE THIS COMMENT */
export declare type AIEnumKey = ${aiEnabledEnums.map(commonEnum => `'${commonEnum}'`).join(' | ')};
// Key is the enum name
export const AIEnabledCommonEnums: Record<AIEnumKey, {
    definition: Record<string, string>,
    description: string | null,
    nameMapping: string,
}> = {
    ${aiEnabledEnums.map(commonEnum => (
            `${commonEnum}: { definition: ${commonEnum}, description: ${commonEnums[commonEnum].description ? `'${commonEnums[commonEnum].description}'` : null}, nameMapping: '${commonEnum}NameMapping' }`
        )).filter(Boolean).join(',\n\t')}
}
/* END GENERATED ENUM LIST DO NOT MODIFY OR REMOVE THIS COMMENT */\n\n`;
    } else {
        // Update enum list
        const enumListSubstr = fileContents.substring(enumListStart, enumListEnd + enumListEndTemplate.length);

        fileContents = fileContents.replace(enumListSubstr, '');
        fileContents += `\n\n${enumListTemplate}
export declare type AIEnumKey = ${aiEnabledEnums.map(commonEnum => `'${commonEnum}'`).join(' | ')};
// Key is the enum name
export const AIEnabledCommonEnums: Record<AIEnumKey, {
    definition: Record<string, string>,
    description: string | null,
    nameMapping: string,
}> = {
    ${aiEnabledEnums.map(commonEnum => (
            `${commonEnum}: { definition: ${commonEnum}, description: ${commonEnums[commonEnum].description ? `'${commonEnums[commonEnum].description}'` : null}, nameMapping: '${commonEnum}NameMapping' }`
        )).filter(Boolean).join(',\n\t')}
}
${enumListEndTemplate}`
    }

    fs.writeFileSync(path.join(process.cwd(), 'src/common/enum/enumerations.ts'), fileContents);
}

fs.writeFileSync(path.join(process.cwd(), 'src/db/sql/keys.ts'), `export declare type ModelKeys = ${Object.keys(modelDefinitions).filter(key => !modelDefinitions[key].ignore).map(key => `'${lowerFirst(key)}'`).join(' | ')};
export declare type AIModelKeys = ${modelsValidForAI.map(key => `'${lowerFirst(key)}'`).join(' | ')};
export const ModelKeyArray: [AIModelKeys, ...AIModelKeys[]] = [${modelsValidForAI.map(key => `'${lowerFirst(key)}'`).join(', ')}];
export const AIEnabledModels: AIModelKeys[] = [${modelsValidForAI.map(key => `'${lowerFirst(key)}'`).join(', ')}];
export const SoftDeleteModels: ModelKeys[] = [${Object.keys(modelDefinitions).filter(key => modelDefinitions[key].softDelete).map(key => `'${lowerFirst(key)}'`).join(', ')}]`);

let sqlBaseFileContent = fs.readFileSync(path.join(process.cwd(), 'src/db/sql/SQLBase.ts'), 'utf8');

const beginGeneratedModels = '/* BEGIN GENERATED MODELS: DO NOT MODIFY OR REMOVE THIS COMMENT */'
const endGeneratedModels = '/* END GENERATED MODELS: DO NOT MODIFY OR REMOVE THIS COMMENT */'

const template = `                case '{{lowerClassName}}':
                    await import('~/db/sql/models/{{className}}');
                    _model = models[model];
                    break;`

let newContent = '';
for (const modelName in modelDefinitions) {
    if (modelDefinitions[modelName].ignore) {
        continue;
    }
    newContent += template.replaceAll('{{className}}', modelName).replaceAll('{{lowerClassName}}', lowerFirst(modelName)) + '\n';
}

const substr = sqlBaseFileContent.substring(sqlBaseFileContent.indexOf(beginGeneratedModels), sqlBaseFileContent.indexOf(endGeneratedModels) + endGeneratedModels.length);
sqlBaseFileContent = sqlBaseFileContent.replace(substr, `${beginGeneratedModels}
${newContent.trimEnd()}
                ${endGeneratedModels}`);

fs.writeFileSync(path.join(process.cwd(), 'src/db/sql/SQLBase.ts'), sqlBaseFileContent);
