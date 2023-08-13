import {
    parse,
    printSchema,
    TypeNode,
    ASTKindToNode,
    ListTypeNode,
    NamedTypeNode,
    ObjectTypeDefinitionNode,
} from 'graphql';
import { faker } from '@faker-js/faker';
import casual from 'casual';
import { oldVisit, PluginFunction, resolveExternalModuleAndFn } from '@graphql-codegen/plugin-helpers';
import { sentenceCase } from 'sentence-case';
import a from 'indefinite';
import { setupFunctionTokens, setupMockValueGenerator } from './mockValueGenerator';

type NamingConvention = 'change-case-all#pascalCase' | 'keep' | string;

type Options<T = TypeNode> = {
    typeName: string;
    fieldName: string;
    types: TypeItem[];
    typeNamesConvention: NamingConvention;
    enumValuesConvention: NamingConvention;
    terminateCircularRelationships: boolean;
    prefix: string | undefined;
    typesPrefix: string;
    enumsPrefix: string;
    currentType: T;
    customScalars?: ScalarMap;
    transformUnderscore: boolean;
    listElementCount: number;
    dynamicValues: boolean;
    generateLibrary: 'casual' | 'faker';
    fieldGeneration?: TypeFieldMap;
    enumsAsTypes?: boolean;
    useImplementingTypes: boolean;
    defaultNullableToNull: boolean;
    nonNull: boolean;
};

const convertName = (value: string, fn: (v: string) => string, transformUnderscore: boolean): string => {
    if (transformUnderscore) {
        return fn(value);
    }

    return value
        .split('_')
        .map((s) => fn(s))
        .join('_');
};

const createNameConverter =
    (convention: NamingConvention, transformUnderscore: boolean) =>
    (value: string, prefix = '') => {
        if (convention === 'keep') {
            return `${prefix}${value}`;
        }
        return `${prefix}${convertName(value, resolveExternalModuleAndFn(convention), transformUnderscore)}`;
    };

const toMockName = (typedName: string, casedName: string, prefix?: string) => {
    if (prefix) {
        return `${prefix}${casedName}`;
    }
    const firstWord = sentenceCase(typedName).split(' ')[0];
    return `${a(firstWord, { articleOnly: true })}${casedName}`;
};

const hashedString = (value: string) => {
    let hash = 0;
    if (value.length === 0) {
        return hash;
    }
    for (let i = 0; i < value.length; i++) {
        const char = value.charCodeAt(i);
        // eslint-disable-next-line no-bitwise
        hash = (hash << 5) - hash + char;
        // eslint-disable-next-line no-bitwise
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

const getGeneratorDefinition = (value: GeneratorOptions): GeneratorDefinition[] | undefined => {
    if (value === undefined) {
        return undefined;
    }
    return (Array.isArray(value) ? value : [value]).map((v) => {
        if (typeof v === 'string') {
            return {
                generator: v,
                arguments: [],
            };
        }
        return v;
    });
};

const getCasualCustomValue = (generatorDefinition: GeneratorDefinition, opts: Options<NamedTypeNode>) => {
    // If there is a mapping to a `casual` type, then use it and make sure
    // to call it if it's a function
    const embeddedGenerator = casual[generatorDefinition.generator];
    if (!embeddedGenerator && generatorDefinition.generator) {
        return generatorDefinition.generator;
    }

    const generatorArgs: unknown[] = Array.isArray(generatorDefinition.arguments)
        ? generatorDefinition.arguments
        : [generatorDefinition.arguments];

    let extraArguments = [];
    const hasExtra = generatorDefinition.extra;
    if (hasExtra && generatorDefinition.extra.arguments) {
        extraArguments = Array.isArray(generatorDefinition.extra.arguments)
            ? generatorDefinition.extra.arguments
            : [generatorDefinition.extra.arguments];
    }

    if (opts.dynamicValues) {
        const extraCall: string = generatorDefinition.extra
            ? extraArguments.length
                ? `.${generatorDefinition.extra.function}(...${JSON.stringify(extraArguments)})`
                : `.${generatorDefinition.extra.function}()`
            : '';

        let functionCall = '';
        if (typeof embeddedGenerator === 'function') {
            functionCall = generatorArgs.length ? `(...${JSON.stringify(generatorArgs)})` : '()';
        }
        return `casual['${generatorDefinition.generator}']${functionCall}${extraCall}`;
    }
    let value = typeof embeddedGenerator === 'function' ? embeddedGenerator(...generatorArgs) : embeddedGenerator;
    if (hasExtra) {
        value = value[generatorDefinition.extra.function](...(extraArguments ? extraArguments : []));
    }

    if (typeof value === 'string') {
        return `'${value}'`;
    }
    if (typeof value === 'object') {
        return `${JSON.stringify(value)}`;
    }
    return value;
};

const getFakerGenerators = (generatorName: GeneratorName) => {
    let embeddedGenerator: unknown = faker;
    let dynamicGenerator = 'faker';

    if (typeof generatorName === 'string') {
        const generatorPath = generatorName.split('.');
        for (const key of generatorPath) {
            if (typeof embeddedGenerator === 'object' && key in embeddedGenerator) {
                embeddedGenerator = embeddedGenerator[key];
                dynamicGenerator = `${dynamicGenerator}['${key}']`;
            }
        }
    }

    // If the faker generator is not a function, we can assume the path is wrong
    if (typeof embeddedGenerator === 'function') {
        return { embeddedGenerator, dynamicGenerator };
    }

    return { embeddedGenerator: null, dynamicGenerator: null };
};

const getFakerCustomValue = (generatorDefinition: GeneratorDefinition, opts: Options<NamedTypeNode>) => {
    // If there is a mapping to a `faker` type, then use it
    const { embeddedGenerator, dynamicGenerator } = getFakerGenerators(generatorDefinition.generator);
    if (!embeddedGenerator && generatorDefinition.generator) {
        return generatorDefinition.generator;
    }

    const generatorArgs: unknown[] = Array.isArray(generatorDefinition.arguments)
        ? generatorDefinition.arguments
        : [generatorDefinition.arguments];

    let extraArguments = [];
    const hasExtra = generatorDefinition.extra;
    if (hasExtra && generatorDefinition.extra.arguments) {
        extraArguments = Array.isArray(generatorDefinition.extra.arguments)
            ? generatorDefinition.extra.arguments
            : [generatorDefinition.extra.arguments];
    }

    if (opts.dynamicValues) {
        const extraCall: string = hasExtra
            ? extraArguments.length
                ? `.${generatorDefinition.extra.function}(...${JSON.stringify(extraArguments)})`
                : `.${generatorDefinition.extra.function}()`
            : '';

        return `${dynamicGenerator}${
            generatorArgs.length ? `(...${JSON.stringify(generatorArgs)})${extraCall}` : `()${extraCall}`
        }`;
    }
    const value = hasExtra
        ? embeddedGenerator(...generatorArgs)[generatorDefinition.extra.function](
              ...(extraArguments ? extraArguments : []),
          )
        : embeddedGenerator(...generatorArgs);

    if (typeof value === 'string') {
        return `'${value}'`;
    }
    if (typeof value === 'object') {
        return `${JSON.stringify(value)}`;
    }
    return value;
};

const weightedChoice = (weights: number[], random: () => number) => {
    const totalWeight = weights.reduce((acc, weight) => acc + weight, 0);
    let randomNum = random() * totalWeight;

    for (let i = 0; i < weights.length; i++) {
        if (randomNum <= weights[i]) {
            return i;
        }
        randomNum -= weights[i];
    }

    throw new Error('Something went wrong in weightedChoice.');
};

const getRandomFunctionDynamic = (opts: Options<NamedTypeNode>) => {
    switch (opts.generateLibrary) {
        case 'casual':
            return 'casual.double(0, 1.0)';
        case 'faker':
            return 'faker.datatype.float({ max: 1.0 })';
        default:
            throw `Unknown generator library: ${opts.generateLibrary}`;
    }
};

const getRandomFunction = (opts: Options<NamedTypeNode>) => {
    switch (opts.generateLibrary) {
        case 'casual':
            return () => casual.double(0, 1.0);
        case 'faker':
            return () => faker.datatype.float({ max: 1.0 });
        default:
            throw `Unknown generator library: ${opts.generateLibrary}`;
    }
};

const getCustomValue = (generatorDefinitions: GeneratorDefinition[], opts: Options<NamedTypeNode>) => {
    const weights = generatorDefinitions.map((generatorDefinition) => generatorDefinition.weight ?? 1);
    const count = generatorDefinitions.length;
    const getLibraryCustomValue = (generatorDefinition) => {
        if (opts.generateLibrary === 'casual') {
            return getCasualCustomValue(generatorDefinition, opts);
        }

        if (opts.generateLibrary === 'faker') {
            return getFakerCustomValue(generatorDefinition, opts);
        }

        throw `Unknown generator library: ${opts.generateLibrary}`;
    };

    if (!opts.dynamicValues) {
        // Not dynamic, so just pick one generator and call it.
        const index = count === 1 ? 0 : weightedChoice(weights, getRandomFunction(opts));
        const generatorDefinition = generatorDefinitions[index];
        return getLibraryCustomValue(generatorDefinition);
    }

    const values = generatorDefinitions.map(getLibraryCustomValue);
    if (count === 1) {
        // The default (single generator) case.
        return values[0];
    }

    // Generate call strings for each generator and choose one at runtime.
    const choices = values.map((value) => `() => ${value}`);
    const randomCall = `() => ${getRandomFunctionDynamic(opts)}`;
    const weightedChoiceCall = `weightedChoice(${JSON.stringify(weights)}, ${randomCall})`;
    return `[${choices.join(', ')}][${weightedChoiceCall}]()`;
};

const handleValueGeneration = (
    opts: Options<NamedTypeNode>,
    customScalar: GeneratorDefinition[],
    baseGenerator: () => void,
) => {
    if (opts.fieldGeneration) {
        // Check for a specific generation for the type & field
        if (opts.typeName in opts.fieldGeneration && opts.fieldName in opts.fieldGeneration[opts.typeName]) {
            const generatorDefinitions = getGeneratorDefinition(opts.fieldGeneration[opts.typeName][opts.fieldName]);
            return getCustomValue(generatorDefinitions, opts);
        }
        // Check for a general field generation definition
        if ('_all' in opts.fieldGeneration && opts.fieldName in opts.fieldGeneration['_all']) {
            const generatorDefinitions = getGeneratorDefinition(opts.fieldGeneration['_all'][opts.fieldName]);
            return getCustomValue(generatorDefinitions, opts);
        }
    }
    if (customScalar) {
        return getCustomValue(customScalar, opts);
    }
    if (opts.defaultNullableToNull && !opts.nonNull) {
        return null;
    }
    return baseGenerator();
};

const getNamedImplementType = (opts: Options<TypeItem['types']>): string => {
    if (!opts.currentType || !('name' in opts.currentType)) {
        return '';
    }

    const name = opts.currentType.name.value;
    const casedName = createNameConverter(opts.typeNamesConvention, opts.transformUnderscore)(name);

    return `${toMockName(name, casedName, opts.prefix)}()`;
};

const getNamedType = (opts: Options<NamedTypeNode>): string | number | boolean => {
    if (!opts.currentType) {
        return '';
    }

    const mockValueGenerator = setupMockValueGenerator({
        generateLibrary: opts.generateLibrary,
        dynamicValues: opts.dynamicValues,
    });
    if (!opts.dynamicValues) mockValueGenerator.seed(hashedString(opts.typeName + opts.fieldName));
    const name = opts.currentType.name.value;
    const casedName = createNameConverter(opts.typeNamesConvention, opts.transformUnderscore)(name);
    switch (name) {
        case 'String': {
            const customScalar = opts.customScalars ? getGeneratorDefinition(opts.customScalars['String']) : null;
            return handleValueGeneration(opts, customScalar, mockValueGenerator.word);
        }
        case 'Float': {
            const customScalar = opts.customScalars ? getGeneratorDefinition(opts.customScalars['Float']) : null;
            return handleValueGeneration(opts, customScalar, mockValueGenerator.float);
        }
        case 'ID': {
            const customScalar = opts.customScalars ? getGeneratorDefinition(opts.customScalars['ID']) : null;
            return handleValueGeneration(opts, customScalar, mockValueGenerator.uuid);
        }
        case 'Boolean': {
            const customScalar = opts.customScalars ? getGeneratorDefinition(opts.customScalars['Boolean']) : null;
            return handleValueGeneration(opts, customScalar, mockValueGenerator.boolean);
        }
        case 'Int': {
            const customScalar = opts.customScalars ? getGeneratorDefinition(opts.customScalars['Int']) : null;
            return handleValueGeneration(opts, customScalar, mockValueGenerator.integer);
        }
        default: {
            const foundTypes = opts.types.filter((foundType: TypeItem) => {
                if (foundType.types && 'interfaces' in foundType.types)
                    return foundType.types.interfaces.some((item) => item.name.value === name);
                return foundType.name === name;
            });

            if (foundTypes.length) {
                const foundType = foundTypes[0];
                switch (foundType.type) {
                    case 'enum': {
                        // It's an enum
                        const typenameConverter = createNameConverter(
                            opts.typeNamesConvention,
                            opts.transformUnderscore,
                        );
                        const enumConverter = createNameConverter(opts.enumValuesConvention, !opts.enumsAsTypes);
                        const value = foundType.values ? foundType.values[0] : '';
                        return handleValueGeneration(opts, undefined, () =>
                            opts.enumsAsTypes
                                ? `'${value}'`
                                : `${typenameConverter(foundType.name, opts.enumsPrefix)}.${enumConverter(value)}`,
                        );
                    }
                    case 'union':
                        // Return the first union type node.
                        return getNamedType({
                            ...opts,
                            currentType: foundType.types && foundType.types[0],
                        });
                    case 'scalar': {
                        const customScalar = opts.customScalars
                            ? getGeneratorDefinition(opts.customScalars[foundType.name])
                            : null;

                        // it's a scalar, let's use a string as a value if there is no custom
                        // mapping for this particular scalar
                        return handleValueGeneration(
                            opts,
                            customScalar,
                            foundType.name === 'Date' ? mockValueGenerator.date : mockValueGenerator.word,
                        );
                    }
                    case 'implement':
                        if (
                            opts.fieldGeneration &&
                            opts.fieldGeneration[opts.typeName] &&
                            opts.fieldGeneration[opts.typeName][opts.fieldName]
                        )
                            break;

                        return foundTypes
                            .map((implementType: TypeItem) =>
                                getNamedImplementType({
                                    ...opts,
                                    currentType: implementType.types,
                                }),
                            )
                            .join(' || ');
                    default:
                        throw `foundType is unknown: ${foundType.name}: ${foundType.type}`;
                }
            }
            if (opts.terminateCircularRelationships) {
                return handleValueGeneration(
                    opts,
                    null,
                    () =>
                        `relationshipsToOmit.has('${casedName}') ? {} as ${casedName} : ${toMockName(
                            name,
                            casedName,
                            opts.prefix,
                        )}({}, relationshipsToOmit)`,
                );
            } else {
                return handleValueGeneration(opts, null, () => `${toMockName(name, casedName, opts.prefix)}()`);
            }
        }
    }
};

const generateMockValue = (opts: Options): string | number | boolean => {
    switch (opts.currentType.kind) {
        case 'NamedType':
            return getNamedType({
                ...opts,
                currentType: opts.currentType as NamedTypeNode,
            });
        case 'NonNullType':
            return generateMockValue({
                ...opts,
                currentType: opts.currentType.type,
                nonNull: true,
            });
        case 'ListType': {
            const hasOverride = opts.fieldGeneration?.[opts.typeName]?.[opts.fieldName];
            if (!hasOverride && opts.defaultNullableToNull && !opts.nonNull) {
                return null;
            }

            const listElements = Array.from({ length: opts.listElementCount }, (_, index) =>
                generateMockValue({
                    ...opts,
                    fieldName: opts.listElementCount === 1 ? opts.fieldName : `${opts.fieldName}${index}`,
                    currentType: (opts.currentType as ListTypeNode).type,
                }),
            );
            return `[${listElements.join(', ')}]`;
        }
        default:
            throw new Error('unreached');
    }
};

const getMockString = (
    typeName: string,
    fields: string,
    typeNamesConvention: NamingConvention,
    terminateCircularRelationships: boolean,
    addTypename = false,
    prefix,
    typesPrefix = '',
    transformUnderscore: boolean,
) => {
    const typeNameConverter = createNameConverter(typeNamesConvention, transformUnderscore);
    const casedName = typeNameConverter(typeName);
    const casedNameWithPrefix = typeNameConverter(typeName, typesPrefix);
    const typename = addTypename ? `\n        __typename: '${typeName}',` : '';
    const typenameReturnType = addTypename ? `{ __typename: '${typeName}' } & ` : '';

    if (terminateCircularRelationships) {
        return `
export const ${toMockName(
            typeName,
            casedName,
            prefix,
        )} = (overrides?: Partial<${casedNameWithPrefix}>, _relationshipsToOmit: Set<string> = new Set()): ${typenameReturnType}${casedNameWithPrefix} => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('${casedName}');
    return {${typename}
${fields}
    };
};`;
    } else {
        return `
export const ${toMockName(
            typeName,
            casedName,
            prefix,
        )} = (overrides?: Partial<${casedNameWithPrefix}>): ${typenameReturnType}${casedNameWithPrefix} => {
    return {${typename}
${fields}
    };
};`;
    }
};

const getImportTypes = ({
    typeNamesConvention,
    definitions,
    types,
    typesFile,
    typesPrefix,
    enumsPrefix,
    transformUnderscore,
    enumsAsTypes,
}: {
    typeNamesConvention: NamingConvention;
    definitions: any;
    types: TypeItem[];
    typesFile: string;
    typesPrefix: string;
    enumsPrefix: string;
    transformUnderscore: boolean;
    enumsAsTypes: boolean;
}) => {
    const typenameConverter = createNameConverter(typeNamesConvention, transformUnderscore);
    const typeImports = typesPrefix?.endsWith('.')
        ? [typesPrefix.slice(0, -1)]
        : definitions
              .filter(({ typeName }: { typeName: string }) => !!typeName)
              .map(({ typeName }: { typeName: string }) => typenameConverter(typeName, typesPrefix));
    const enumTypes = enumsPrefix?.endsWith('.')
        ? [enumsPrefix.slice(0, -1)]
        : types.filter(({ type }) => type === 'enum').map(({ name }) => typenameConverter(name, enumsPrefix));

    if (!enumsAsTypes) {
        typeImports.push(...enumTypes);
    }

    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }

    return typesFile ? `import { ${typeImports.filter(onlyUnique).join(', ')} } from '${typesFile}';\n` : '';
};

type GeneratorName = keyof Casual.Casual | keyof Casual.functions | string;
type GeneratorDefinition = {
    generator: GeneratorName;
    arguments: unknown;
    extra?: {
        function: string;
        arguments?: unknown[] | unknown;
    };
    weight?: number;
};
type GeneratorOptions = GeneratorName | GeneratorDefinition | GeneratorName[] | GeneratorDefinition[];

type ScalarMap = {
    [name: string]: GeneratorOptions;
};

type TypeFieldMap = {
    [typeName: string]: {
        [fieldName: string]: GeneratorOptions;
    };
};

export interface TypescriptMocksPluginConfig {
    typesFile?: string;
    enumValues?: NamingConvention;
    typeNames?: NamingConvention;
    addTypename?: boolean;
    prefix?: string;
    scalars?: ScalarMap;
    terminateCircularRelationships?: boolean;
    typesPrefix?: string;
    enumsPrefix?: string;
    transformUnderscore?: boolean;
    listElementCount?: number;
    dynamicValues?: boolean;
    generateLibrary?: 'casual' | 'faker';
    fieldGeneration?: TypeFieldMap;
    locale?: string;
    enumsAsTypes?: boolean;
    useImplementingTypes?: boolean;
    defaultNullableToNull?: boolean;
    defineWeightedChoice?: boolean;
}

interface TypeItem {
    name: string;
    type: 'enum' | 'scalar' | 'union' | 'implement';
    values?: string[];
    types?: readonly NamedTypeNode[] | ObjectTypeDefinitionNode;
}

type VisitFn<TAnyNode, TVisitedNode = TAnyNode> = (
    /** The current node being visiting. */
    node: TVisitedNode,
    /** The index or key to this node from the parent node or Array. */
    key: string | number | undefined,
    /** The parent immediately above this node, which may be an Array. */
    parent: TAnyNode | ReadonlyArray<TAnyNode> | undefined,
    /** The key path to get to this node from the root node. */
    path: ReadonlyArray<string | number>,
    /**
     * All nodes and Arrays visited before reaching parent of this node.
     * These correspond to array indices in `path`.
     * Note: ancestors includes arrays which contain the parent of visited node.
     */
    ancestors: ReadonlyArray<TAnyNode | ReadonlyArray<TAnyNode>>,
) => any;

type VisitorType = { [K in keyof ASTKindToNode]?: VisitFn<ASTKindToNode[keyof ASTKindToNode], ASTKindToNode[K]> };

// This plugin was generated with the help of ast explorer.
// https://astexplorer.net
// Paste your graphql schema in it, and you'll be able to see what the `astNode` will look like
export const plugin: PluginFunction<TypescriptMocksPluginConfig> = (schema, documents, config) => {
    const printedSchema = printSchema(schema); // Returns a string representation of the schema
    const astNode = parse(printedSchema); // Transforms the string into ASTNode

    if ('typenames' in config) {
        throw new Error('Config `typenames` was renamed to `typeNames`. Please update your config');
    }

    const enumValuesConvention = config.enumValues || 'change-case-all#pascalCase';
    const typeNamesConvention = config.typeNames || 'change-case-all#pascalCase';
    const transformUnderscore = config.transformUnderscore ?? true;
    const listElementCount = Math.max(0, config.listElementCount ?? 1);
    const dynamicValues = !!config.dynamicValues;
    const generateLibrary = config.generateLibrary || 'casual';
    const enumsAsTypes = config.enumsAsTypes ?? false;
    const useImplementingTypes = config.useImplementingTypes ?? false;
    const defaultNullableToNull = config.defaultNullableToNull ?? false;

    if (generateLibrary === 'faker' && config.locale) {
        faker.setLocale(config.locale);
    }

    // List of types that are enums
    const types: TypeItem[] = [];
    const typeVisitor: VisitorType = {
        EnumTypeDefinition: (node) => {
            const name = node.name.value;
            if (!types.find((enumType: TypeItem) => enumType.name === name)) {
                types.push({
                    name,
                    type: 'enum',
                    values: node.values ? node.values.map((node) => node.name.value) : [],
                });
            }
        },
        UnionTypeDefinition: (node) => {
            const name = node.name.value;
            if (!types.find((enumType) => enumType.name === name)) {
                types.push({
                    name,
                    type: 'union',
                    types: node.types,
                });
            }
        },
        ObjectTypeDefinition: (node) => {
            // This function triggered per each type
            const typeName = node.name.value;

            if (config.useImplementingTypes) {
                if (!types.find((objectType) => objectType.name === typeName)) {
                    node.interfaces.length &&
                        types.push({
                            name: typeName,
                            type: 'implement',
                            types: node,
                        });
                }
            }
        },
        ScalarTypeDefinition: (node) => {
            const name = node.name.value;
            if (!types.find((scalarType) => scalarType.name === name)) {
                types.push({
                    name,
                    type: 'scalar',
                });
            }
        },
    };
    const visitor: VisitorType = {
        FieldDefinition: (node) => {
            const fieldName = node.name.value;

            return {
                name: fieldName,
                mockFn: (typeName: string) => {
                    const value = generateMockValue({
                        typeName,
                        fieldName,
                        types,
                        typeNamesConvention,
                        enumValuesConvention,
                        terminateCircularRelationships: !!config.terminateCircularRelationships,
                        prefix: config.prefix,
                        typesPrefix: config.typesPrefix,
                        enumsPrefix: config.enumsPrefix,
                        currentType: node.type,
                        customScalars: config.scalars,
                        transformUnderscore,
                        listElementCount,
                        dynamicValues,
                        generateLibrary,
                        fieldGeneration: config.fieldGeneration,
                        enumsAsTypes,
                        useImplementingTypes,
                        defaultNullableToNull,
                        nonNull: false,
                    });

                    return `        ${fieldName}: overrides && overrides.hasOwnProperty('${fieldName}') ? overrides.${fieldName}! : ${value},`;
                },
            };
        },
        InputObjectTypeDefinition: (node) => {
            const fieldName = node.name.value;

            return {
                typeName: fieldName,
                mockFn: () => {
                    const mockFields = node.fields
                        ? node.fields
                              .map((field) => {
                                  const value = generateMockValue({
                                      typeName: fieldName,
                                      fieldName: field.name.value,
                                      types,
                                      typeNamesConvention,
                                      enumValuesConvention,
                                      terminateCircularRelationships: !!config.terminateCircularRelationships,
                                      prefix: config.prefix,
                                      typesPrefix: config.typesPrefix,
                                      enumsPrefix: config.enumsPrefix,
                                      currentType: field.type,
                                      customScalars: config.scalars,
                                      transformUnderscore,
                                      listElementCount,
                                      dynamicValues,
                                      generateLibrary,
                                      fieldGeneration: config.fieldGeneration,
                                      enumsAsTypes,
                                      useImplementingTypes,
                                      defaultNullableToNull,
                                      nonNull: false,
                                  });

                                  return `        ${field.name.value}: overrides && overrides.hasOwnProperty('${field.name.value}') ? overrides.${field.name.value}! : ${value},`;
                              })
                              .join('\n')
                        : '';

                    return getMockString(
                        fieldName,
                        mockFields,
                        typeNamesConvention,
                        !!config.terminateCircularRelationships,
                        false,
                        config.prefix,
                        config.typesPrefix,
                        transformUnderscore,
                    );
                },
            };
        },
        ObjectTypeDefinition: (node) => {
            // This function triggered per each type
            const typeName = node.name.value;

            const { fields } = node;
            return {
                typeName,
                mockFn: () => {
                    const mockFields = fields ? fields.map(({ mockFn }: any) => mockFn(typeName)).join('\n') : '';

                    return getMockString(
                        typeName,
                        mockFields,
                        typeNamesConvention,
                        !!config.terminateCircularRelationships,
                        !!config.addTypename,
                        config.prefix,
                        config.typesPrefix,
                        transformUnderscore,
                    );
                },
            };
        },
        InterfaceTypeDefinition: (node) => {
            const typeName = node.name.value;
            const { fields } = node;
            return {
                typeName,
                mockFn: () => {
                    const mockFields = fields ? fields.map(({ mockFn }: any) => mockFn(typeName)).join('\n') : '';

                    return getMockString(
                        typeName,
                        mockFields,
                        typeNamesConvention,
                        !!config.terminateCircularRelationships,
                        !!config.addTypename,
                        config.prefix,
                        config.typesPrefix,
                        transformUnderscore,
                    );
                },
            };
        },
    };

    // run on the types first
    oldVisit(astNode, { leave: typeVisitor });
    const result = oldVisit(astNode, { leave: visitor });
    const definitions = result.definitions.filter((definition: any) => !!definition);
    const typesFile = config.typesFile ? config.typesFile.replace(/\.[\w]+$/, '') : null;

    const typesFileImport = getImportTypes({
        typeNamesConvention,
        definitions,
        types,
        typesFile,
        typesPrefix: config.typesPrefix,
        enumsPrefix: config.enumsPrefix,
        transformUnderscore: transformUnderscore,
        enumsAsTypes,
    });
    // Function that will generate the mocks.
    // We generate it after having visited because we need to distinct types from enums
    const mockFns = definitions
        .map(({ mockFn }: { mockFn: () => string }) => mockFn)
        .filter((mockFn: () => string) => !!mockFn)
        .map((mockFn: () => string) => mockFn())
        .join('\n');
    const functionTokens = setupFunctionTokens(generateLibrary);

    let mockFile = '';
    if (dynamicValues) mockFile += `${functionTokens.import}\n`;
    mockFile += typesFileImport;
    if (dynamicValues) mockFile += `\n${functionTokens.seed}\n`;
    if (dynamicValues && config.defineWeightedChoice) {
        mockFile += `\nconst weightedChoice = ${weightedChoice.toString()}\n`;
    }
    mockFile += mockFns;
    if (dynamicValues) mockFile += `\n\n${functionTokens.seedFunction}`;
    mockFile += '\n';
    return mockFile;
};
