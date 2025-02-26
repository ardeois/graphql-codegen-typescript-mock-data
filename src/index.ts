import { parse, TypeNode, ASTKindToNode, ListTypeNode, NamedTypeNode, ObjectTypeDefinitionNode } from 'graphql';
import * as allFakerLocales from '@faker-js/faker';
import casual from 'casual';
import { oldVisit, PluginFunction, resolveExternalModuleAndFn } from '@graphql-codegen/plugin-helpers';
import { sentenceCase } from 'sentence-case';
import a from 'indefinite';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { setupFunctionTokens, setupMockValueGenerator } from './mockValueGenerator';

type NamingConvention = 'change-case-all#pascalCase' | 'keep' | string;

type Options<T = TypeNode> = {
    typeName: string;
    fieldName: string;
    types: TypeItem[];
    typeNamesConvention: NamingConvention;
    enumValuesConvention: NamingConvention;
    terminateCircularRelationships: boolean | 'immediate';
    prefix: string | undefined;
    typesPrefix: string;
    enumsPrefix: string;
    currentType: T;
    customScalars?: ScalarMap;
    transformUnderscore: boolean;
    listElementCount: number;
    dynamicValues: boolean;
    generateLibrary: 'casual' | 'faker';
    generatorLocale: string;
    fieldGeneration?: TypeFieldMap;
    enumsAsTypes?: boolean;
    useTypeImports?: boolean;
    useImplementingTypes: boolean;
    defaultNullableToNull: boolean;
    nonNull: boolean;
    typeNamesMapping?: Record<string, string>;
};

const getTerminateCircularRelationshipsConfig = ({ terminateCircularRelationships }: TypescriptMocksPluginConfig) =>
    terminateCircularRelationships ? terminateCircularRelationships : false;

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

const renameImports = (list: string[], typeNamesMapping: Record<string, string>) => {
    return list.map((type) => {
        if (typeNamesMapping && typeNamesMapping[type]) {
            return `${type} as ${typeNamesMapping[type]}`;
        }
        return type;
    });
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

const getGeneratorDefinition = (value: GeneratorDefinition | GeneratorName): GeneratorDefinition => {
    if (typeof value === 'string') {
        return {
            generator: value,
            arguments: [],
        };
    }
    return value;
};

const getCasualCustomValue = (
    generatorDefinition: GeneratorDefinition,
    opts: Options<NamedTypeNode | ObjectTypeDefinitionNode>,
) => {
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

const getFakerGenerators = (generatorName: GeneratorName, locale: string) => {
    let embeddedGenerator: unknown = allFakerLocales[`faker${locale.toUpperCase()}`];
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

const getFakerCustomValue = (
    generatorDefinition: GeneratorDefinition,
    opts: Options<NamedTypeNode | ObjectTypeDefinitionNode>,
) => {
    // If there is a mapping to a `faker` type, then use it
    const { embeddedGenerator, dynamicGenerator } = getFakerGenerators(
        generatorDefinition.generator,
        opts.generatorLocale,
    );
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

const getCustomValue = (
    generatorDefinition: GeneratorDefinition,
    opts: Options<NamedTypeNode | ObjectTypeDefinitionNode>,
) => {
    if (opts.generateLibrary === 'casual') {
        return getCasualCustomValue(generatorDefinition, opts);
    }

    if (opts.generateLibrary === 'faker') {
        return getFakerCustomValue(generatorDefinition, opts);
    }

    throw `Unknown generator library: ${opts.generateLibrary}`;
};

const handleValueGeneration = (
    opts: Options<NamedTypeNode | ObjectTypeDefinitionNode>,
    customScalar: GeneratorDefinition,
    baseGenerator: () => void,
) => {
    if (opts.fieldGeneration) {
        // Check for a specific generation for the type & field
        if (opts.typeName in opts.fieldGeneration && opts.fieldName in opts.fieldGeneration[opts.typeName]) {
            const generatorDefinition = getGeneratorDefinition(opts.fieldGeneration[opts.typeName][opts.fieldName]);
            return getCustomValue(generatorDefinition, opts);
        }
        // Check for a general field generation definition
        if ('_all' in opts.fieldGeneration && opts.fieldName in opts.fieldGeneration['_all']) {
            const generatorDefinition = getGeneratorDefinition(opts.fieldGeneration['_all'][opts.fieldName]);
            return getCustomValue(generatorDefinition, opts);
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

const getNamedImplementType = (opts: Options<TypeItem['types']>): string | number | boolean => {
    const { currentType } = opts;

    if (!currentType || !('name' in currentType)) {
        return '';
    }

    return getNamedType({
        ...opts,
        currentType,
    });
};

const getNamedType = (opts: Options<NamedTypeNode | ObjectTypeDefinitionNode>): string | number | boolean => {
    if (!opts.currentType) {
        return '';
    }

    const mockValueGenerator = setupMockValueGenerator({
        generateLibrary: opts.generateLibrary,
        dynamicValues: opts.dynamicValues,
        generatorLocale: opts.generatorLocale,
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
                                ? opts.useTypeImports
                                    ? `('${value}' as ${typenameConverter(foundType.name, opts.enumsPrefix)})`
                                    : `'${value}'`
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
                return handleValueGeneration(opts, null, () => {
                    if (opts.typesPrefix) {
                        const typeNameConverter = createNameConverter(
                            opts.typeNamesConvention,
                            opts.transformUnderscore,
                        );
                        const renamedType = renameImports([name], opts.typeNamesMapping)[0];
                        const casedNameWithPrefix = typeNameConverter(renamedType, opts.typesPrefix);
                        return `relationshipsToOmit.has('${casedName}') ? {} as ${casedNameWithPrefix} : ${toMockName(
                            name,
                            casedName,
                            opts.prefix,
                        )}({}, relationshipsToOmit)`;
                    } else {
                        const renamedType = renameImports([name], opts.typeNamesMapping)[0];
                        const renamedCasedName = createNameConverter(
                            opts.typeNamesConvention,
                            opts.transformUnderscore,
                        )(renamedType);
                        return `relationshipsToOmit.has('${casedName}') ? {} as ${renamedCasedName} : ${toMockName(
                            name,
                            casedName,
                            opts.prefix,
                        )}({}, relationshipsToOmit)`;
                    }
                });
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
    terminateCircularRelationships: boolean | 'immediate',
    addTypename = false,
    prefix,
    typesPrefix = '',
    transformUnderscore: boolean,
    typeNamesMapping?: Record<string, string>,
    hasOneOfDirective = false,
) => {
    const typeNameConverter = createNameConverter(typeNamesConvention, transformUnderscore);
    const NewTypeName = typeNamesMapping[typeName] || typeName;
    const casedName = typeNameConverter(typeName);
    const casedNameWithPrefix = typeNameConverter(NewTypeName, typesPrefix);
    const typename = addTypename ? `\n        __typename: '${typeName}',` : '';
    const typenameReturnType = addTypename ? `{ __typename: '${typeName}' } & ` : '';

    const overridesArgumentString = !hasOneOfDirective
        ? `overrides?: Partial<${casedNameWithPrefix}>`
        : `override?: ${casedNameWithPrefix}`;

    if (terminateCircularRelationships) {
        const relationshipsToOmitInit =
            terminateCircularRelationships === 'immediate' ? '_relationshipsToOmit' : 'new Set(_relationshipsToOmit)';
        return `
export const ${toMockName(
            typeName,
            casedName,
            prefix,
        )} = (${overridesArgumentString}, _relationshipsToOmit: Set<string> = new Set()): ${typenameReturnType}${casedNameWithPrefix} => {
    const relationshipsToOmit: Set<string> = ${relationshipsToOmitInit};
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
        )} = (${overridesArgumentString}): ${typenameReturnType}${casedNameWithPrefix} => {
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
    useTypeImports,
    typeNamesMapping,
}: {
    typeNamesConvention: NamingConvention;
    definitions: any;
    types: TypeItem[];
    typesFile: string;
    typesPrefix: string;
    enumsPrefix: string;
    transformUnderscore: boolean;
    enumsAsTypes: boolean;
    useTypeImports: boolean;
    typeNamesMapping?: Record<string, string>;
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

    const renamedTypeImports = renameImports(typeImports, typeNamesMapping);

    if (!enumsAsTypes || useTypeImports) {
        renamedTypeImports.push(...enumTypes);
    }

    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }

    const importPrefix = `import ${useTypeImports ? 'type ' : ''}`;

    return typesFile
        ? `${importPrefix}{ ${renamedTypeImports.filter(onlyUnique).join(', ')} } from '${typesFile}';\n`
        : '';
};

type GeneratorName = keyof Casual.Casual | keyof Casual.functions | string;
type GeneratorDefinition = {
    generator: GeneratorName;
    arguments: unknown;
    extra?: {
        function: string;
        arguments?: unknown[] | unknown;
    };
};
type GeneratorOptions = GeneratorName | GeneratorDefinition;

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
    terminateCircularRelationships?: boolean | 'immediate';
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
    useTypeImports?: boolean;
    typeNamesMapping?: Record<string, string>;
    includedTypes?: string[];
    excludedTypes?: string[];
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
    const printedSchema = printSchemaWithDirectives(schema); // Returns a string representation of the schema

    const astNode = parse(printedSchema); // Transforms the string into ASTNode

    if ('typenames' in config) {
        throw new Error('Config `typenames` was renamed to `typeNames`. Please update your config');
    }

    const enumValuesConvention = config.enumValues || 'change-case-all#pascalCase';
    const typeNamesConvention = config.typeNames || 'change-case-all#pascalCase';
    const transformUnderscore = config.transformUnderscore ?? true;
    const listElementCount = Math.max(0, config.listElementCount ?? 1);
    const dynamicValues = !!config.dynamicValues;
    const generateLibrary = config.generateLibrary || 'faker';
    const enumsAsTypes = config.enumsAsTypes ?? false;
    const useTypeImports = config.useTypeImports ?? false;
    const useImplementingTypes = config.useImplementingTypes ?? false;
    const defaultNullableToNull = config.defaultNullableToNull ?? false;
    const generatorLocale = config.locale || 'en';
    const typeNamesMapping = config.typeNamesMapping || {};

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

    const sharedGenerateMockOpts = {
        customScalars: config.scalars,
        defaultNullableToNull,
        dynamicValues,
        enumsAsTypes,
        enumsPrefix: config.enumsPrefix,
        enumValuesConvention,
        fieldGeneration: config.fieldGeneration,
        generateLibrary,
        generatorLocale,
        listElementCount,
        nonNull: false,
        prefix: config.prefix,
        terminateCircularRelationships: getTerminateCircularRelationshipsConfig(config),
        transformUnderscore,
        typeNamesConvention,
        typeNamesMapping,
        types,
        typesPrefix: config.typesPrefix,
        useImplementingTypes,
        useTypeImports,
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
                        currentType: node.type,
                        ...sharedGenerateMockOpts,
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
                    let mockFieldsString = '';

                    const { directives } = node;
                    const hasOneOfDirective = directives.some((directive) => directive.name.value === 'oneOf');

                    if (node.fields && node.fields.length > 0 && hasOneOfDirective) {
                        const field = node.fields[0];
                        const value = generateMockValue({
                            typeName: fieldName,
                            fieldName: field.name.value,
                            currentType: field.type,
                            ...sharedGenerateMockOpts,
                        });

                        mockFieldsString = `        ...(override ? override : {${field.name.value} : ${value}}),`;
                    } else if (node.fields) {
                        mockFieldsString = node.fields
                            .map((field) => {
                                const value = generateMockValue({
                                    typeName: fieldName,
                                    fieldName: field.name.value,
                                    currentType: field.type,
                                    ...sharedGenerateMockOpts,
                                });

                                const valueWithOverride = `overrides && overrides.hasOwnProperty('${field.name.value}') ? overrides.${field.name.value}! : ${value}`;

                                return `        ${field.name.value}: ${valueWithOverride},`;
                            })
                            .join('\n');
                    }

                    return getMockString(
                        fieldName,
                        mockFieldsString,
                        typeNamesConvention,
                        getTerminateCircularRelationshipsConfig(config),
                        false,
                        config.prefix,
                        config.typesPrefix,
                        transformUnderscore,
                        typeNamesMapping,
                        hasOneOfDirective,
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
                        getTerminateCircularRelationshipsConfig(config),
                        !!config.addTypename,
                        config.prefix,
                        config.typesPrefix,
                        transformUnderscore,
                        typeNamesMapping,
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
                        getTerminateCircularRelationshipsConfig(config),
                        !!config.addTypename,
                        config.prefix,
                        config.typesPrefix,
                        transformUnderscore,
                        typeNamesMapping,
                    );
                },
            };
        },
    };

    // run on the types first
    oldVisit(astNode, { leave: typeVisitor });
    const result = oldVisit(astNode, { leave: visitor });

    const { includedTypes, excludedTypes } = config;
    const shouldGenerateMockForType = (typeName?: string) => {
        if (!typeName) {
            return true;
        }
        if (includedTypes && includedTypes.length > 0) {
            return includedTypes.includes(typeName);
        }
        if (excludedTypes && excludedTypes.length > 0) {
            return !excludedTypes.includes(typeName);
        }
        return true;
    };

    const definitions = result.definitions.filter(
        (definition: any) => !!definition && shouldGenerateMockForType(definition.typeName),
    );
    const typesFile = config.typesFile ? config.typesFile.replace(/\.[\w]+$/, '') : null;

    const typesFileImport = getImportTypes({
        typeNamesConvention,
        definitions,
        types,
        typesFile,
        typesPrefix: config.typesPrefix,
        enumsPrefix: config.enumsPrefix,
        transformUnderscore: transformUnderscore,
        useTypeImports: config.useTypeImports,
        enumsAsTypes,
        typeNamesMapping,
    });
    // Function that will generate the mocks.
    // We generate it after having visited because we need to distinct types from enums
    const mockFns = definitions
        .map(({ mockFn }: { mockFn: () => string }) => mockFn)
        .filter((mockFn: () => string) => !!mockFn)
        .map((mockFn: () => string) => mockFn())
        .join('\n');
    const functionTokens = setupFunctionTokens(generateLibrary, generatorLocale);

    let mockFile = '';
    if (dynamicValues) mockFile += `${functionTokens.import}\n`;
    mockFile += typesFileImport;
    if (dynamicValues) mockFile += `\n${functionTokens.seed}\n`;
    mockFile += mockFns;
    if (dynamicValues) mockFile += `\n\n${functionTokens.seedFunction}`;
    mockFile += '\n';
    return mockFile;
};
