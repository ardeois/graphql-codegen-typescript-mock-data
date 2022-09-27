import { ASTKindToNode, ListTypeNode, NamedTypeNode, parse, printSchema, TypeNode } from 'graphql';
import casual from 'casual';
import { PluginFunction, oldVisit } from '@graphql-codegen/plugin-helpers';
import { pascalCase } from 'pascal-case';
import { upperCase } from 'upper-case';
import { sentenceCase } from 'sentence-case';
import a from 'indefinite';
import { CasualMockValueGenerator } from './mockValueGenerator';

type NamingConvention = 'upper-case#upperCase' | 'pascal-case#pascalCase' | 'keep';

type Options<T = TypeNode> = {
    typeName: string;
    fieldName: string;
    types: TypeItem[];
    typenamesConvention: NamingConvention;
    enumValuesConvention: NamingConvention;
    terminateCircularRelationships: boolean;
    prefix: string | undefined;
    typesPrefix: string;
    enumsPrefix: string;
    currentType: T;
    customScalars?: ScalarMap;
    transformUnderscore: boolean;
    listElementCount?: number;
    dynamicValues?: boolean;
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
        switch (convention) {
            case 'upper-case#upperCase': {
                return `${prefix}${convertName(value, (s) => upperCase(s || ''), transformUnderscore)}`;
            }
            case 'keep':
                return `${prefix}${value}`;
            case 'pascal-case#pascalCase':
            // fallthrough
            default:
                // default to pascal case in case of unknown values
                return `${prefix}${convertName(value, (s) => pascalCase(s || ''), transformUnderscore)}`;
        }
    };

const toMockName = (typedName: string, casedName: string, prefix?: string) => {
    if (prefix) {
        return `${prefix}${casedName}`;
    }
    const firstWord = sentenceCase(typedName).split(' ')[0];
    return `${a(firstWord, { articleOnly: true })}${casedName}`;
};

const updateTextCase = (str: string, enumValuesConvention: NamingConvention, transformUnderscore: boolean) => {
    const convert = createNameConverter(enumValuesConvention, transformUnderscore);

    if (str.charAt(0) === '_') {
        return str.replace(
            /^(_*)(.*)/,
            (_match, underscorePrefix, typeName) => `${underscorePrefix}${convert(typeName)}`,
        );
    }

    return convert(str);
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

const getScalarDefinition = (value: ScalarDefinition | ScalarGeneratorName): ScalarDefinition => {
    if (typeof value === 'string') {
        return {
            generator: value,
            arguments: [],
        };
    }
    return value;
};

const getNamedType = (opts: Options<NamedTypeNode>): string | number | boolean => {
    if (!opts.currentType) {
        return '';
    }

    if (!opts.dynamicValues) casual.seed(hashedString(opts.typeName + opts.fieldName));
    const name = opts.currentType.name.value;
    const casedName = createNameConverter(opts.typenamesConvention, opts.transformUnderscore)(name);
    const mockValueGenerator = new CasualMockValueGenerator({ dynamicValues: opts.dynamicValues });
    switch (name) {
        case 'String':
            return mockValueGenerator.word();
        case 'Float':
            return mockValueGenerator.float();
        case 'ID':
            return mockValueGenerator.uuid();
        case 'Boolean':
            return mockValueGenerator.boolean();
        case 'Int':
            return mockValueGenerator.integer();
        default: {
            const foundType = opts.types.find((enumType: TypeItem) => enumType.name === name);
            if (foundType) {
                switch (foundType.type) {
                    case 'enum': {
                        // It's an enum
                        const typenameConverter = createNameConverter(
                            opts.typenamesConvention,
                            opts.transformUnderscore,
                        );
                        const value = foundType.values ? foundType.values[0] : '';
                        return `${typenameConverter(foundType.name, opts.enumsPrefix)}.${updateTextCase(
                            value,
                            opts.enumValuesConvention,
                            true,
                        )}`;
                    }
                    case 'union':
                        // Return the first union type node.
                        return getNamedType({
                            ...opts,
                            currentType: foundType.types && foundType.types[0],
                        });
                    case 'scalar': {
                        const customScalar = opts.customScalars
                            ? getScalarDefinition(opts.customScalars[foundType.name])
                            : null;
                        // it's a scalar, let's use a string as a value if there is no custom
                        // mapping for this particular scalar
                        if (!customScalar || !customScalar.generator) {
                            if (foundType.name === 'Date') {
                                return mockValueGenerator.date();
                            }
                            return mockValueGenerator.word();
                        }

                        // If there is a mapping to a `casual` type, then use it and make sure
                        // to call it if it's a function
                        const embeddedGenerator = casual[customScalar.generator];

                        if (!embeddedGenerator && customScalar.generator) {
                            return customScalar.generator;
                        }

                        const generatorArgs: unknown[] = Array.isArray(customScalar.arguments)
                            ? customScalar.arguments
                            : [customScalar.arguments];
                        if (opts.dynamicValues) {
                            return `casual['${customScalar.generator}']${
                                typeof embeddedGenerator === 'function' ? `(...${JSON.stringify(generatorArgs)})` : ''
                            }`;
                        }
                        const value =
                            typeof embeddedGenerator === 'function'
                                ? embeddedGenerator(...generatorArgs)
                                : embeddedGenerator;

                        if (typeof value === 'string') {
                            return `'${value}'`;
                        }
                        if (typeof value === 'object') {
                            return `${JSON.stringify(value)}`;
                        }
                        return value;
                    }
                    default:
                        throw `foundType is unknown: ${foundType.name}: ${foundType.type}`;
                }
            }
            if (opts.terminateCircularRelationships) {
                return `relationshipsToOmit.includes('${casedName}') ? {} as ${casedName} : ${toMockName(
                    name,
                    casedName,
                    opts.prefix,
                )}({}, relationshipsToOmit)`;
            } else {
                return `${toMockName(name, casedName, opts.prefix)}()`;
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
            });
        case 'ListType': {
            const listElements = Array.from({ length: opts.listElementCount }, (_, index) =>
                generateMockValue({
                    ...opts,
                    fieldName: opts.fieldName + index,
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
    typenamesConvention: NamingConvention,
    terminateCircularRelationships: boolean,
    addTypename = false,
    prefix,
    typesPrefix = '',
    transformUnderscore: boolean,
) => {
    const typenameConverter = createNameConverter(typenamesConvention, transformUnderscore);
    const casedName = typenameConverter(typeName);
    const casedNameWithPrefix = typenameConverter(typeName, typesPrefix);
    const typename = addTypename ? `\n        __typename: '${typeName}',` : '';
    const typenameReturnType = addTypename ? `{ __typename: '${typeName}' } & ` : '';

    if (terminateCircularRelationships) {
        return `
export const ${toMockName(
            typeName,
            casedName,
            prefix,
        )} = (overrides?: Partial<${casedNameWithPrefix}>, _relationshipsToOmit: Array<string> = []): ${typenameReturnType}${casedNameWithPrefix} => {
    const relationshipsToOmit = ([..._relationshipsToOmit, '${casedName}']);
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
    typenamesConvention,
    definitions,
    types,
    typesFile,
    typesPrefix,
    enumsPrefix,
    transformUnderscore,
}: {
    typenamesConvention: NamingConvention;
    definitions: any;
    types: TypeItem[];
    typesFile: string;
    typesPrefix: string;
    enumsPrefix: string;
    transformUnderscore: boolean;
}) => {
    const typenameConverter = createNameConverter(typenamesConvention, transformUnderscore);
    const typeImports = typesPrefix?.endsWith('.')
        ? [typesPrefix.slice(0, -1)]
        : definitions
              .filter(({ typeName }: { typeName: string }) => !!typeName)
              .map(({ typeName }: { typeName: string }) => typenameConverter(typeName, typesPrefix));
    const enumTypes = enumsPrefix?.endsWith('.')
        ? [enumsPrefix.slice(0, -1)]
        : types.filter(({ type }) => type === 'enum').map(({ name }) => typenameConverter(name, enumsPrefix));

    typeImports.push(...enumTypes);

    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }

    return typesFile ? `import { ${typeImports.filter(onlyUnique).join(', ')} } from '${typesFile}';\n` : '';
};

type ScalarGeneratorName = keyof Casual.Casual | keyof Casual.functions | string;
type ScalarDefinition = {
    generator: ScalarGeneratorName;
    arguments: unknown;
};

type ScalarMap = {
    [name: string]: ScalarGeneratorName | ScalarDefinition;
};

export interface TypescriptMocksPluginConfig {
    typesFile?: string;
    enumValues?: NamingConvention;
    typenames?: NamingConvention;
    addTypename?: boolean;
    prefix?: string;
    scalars?: ScalarMap;
    terminateCircularRelationships?: boolean;
    typesPrefix?: string;
    enumsPrefix?: string;
    transformUnderscore?: boolean;
    listElementCount?: number;
    dynamicValues?: boolean;
}

interface TypeItem {
    name: string;
    type: 'enum' | 'scalar' | 'union';
    values?: string[];
    types?: readonly NamedTypeNode[];
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

    const enumValuesConvention = config.enumValues || 'pascal-case#pascalCase';
    const typenamesConvention = config.typenames || 'pascal-case#pascalCase';
    const transformUnderscore = config.transformUnderscore ?? true;
    const listElementCount = config.listElementCount > 0 ? config.listElementCount : 1;
    // List of types that are enums
    const types: TypeItem[] = [];
    const visitor: VisitorType = {
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
        FieldDefinition: (node) => {
            const fieldName = node.name.value;

            return {
                name: fieldName,
                mockFn: (typeName: string) => {
                    const value = generateMockValue({
                        typeName,
                        fieldName,
                        types,
                        typenamesConvention,
                        enumValuesConvention,
                        terminateCircularRelationships: !!config.terminateCircularRelationships,
                        prefix: config.prefix,
                        typesPrefix: config.typesPrefix,
                        enumsPrefix: config.enumsPrefix,
                        currentType: node.type,
                        customScalars: config.scalars,
                        transformUnderscore,
                        listElementCount,
                        dynamicValues: config.dynamicValues,
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
                                      typenamesConvention,
                                      enumValuesConvention,
                                      terminateCircularRelationships: !!config.terminateCircularRelationships,
                                      prefix: config.prefix,
                                      typesPrefix: config.typesPrefix,
                                      enumsPrefix: config.enumsPrefix,
                                      currentType: field.type,
                                      customScalars: config.scalars,
                                      transformUnderscore,
                                      dynamicValues: config.dynamicValues,
                                  });

                                  return `        ${field.name.value}: overrides && overrides.hasOwnProperty('${field.name.value}') ? overrides.${field.name.value}! : ${value},`;
                              })
                              .join('\n')
                        : '';

                    return getMockString(
                        fieldName,
                        mockFields,
                        typenamesConvention,
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
                        typenamesConvention,
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
                        typenamesConvention,
                        !!config.terminateCircularRelationships,
                        !!config.addTypename,
                        config.prefix,
                        config.typesPrefix,
                        transformUnderscore,
                    );
                },
            };
        },
        ScalarTypeDefinition: (node) => {
            const name = node.name.value;
            if (!types.find((enumType) => enumType.name === name)) {
                types.push({
                    name,
                    type: 'scalar',
                });
            }
        },
    };

    const result = oldVisit(astNode, { leave: visitor });
    const definitions = result.definitions.filter((definition: any) => !!definition);
    const typesFile = config.typesFile ? config.typesFile.replace(/\.[\w]+$/, '') : null;

    const typesFileImport = getImportTypes({
        typenamesConvention,
        definitions,
        types,
        typesFile,
        typesPrefix: config.typesPrefix,
        enumsPrefix: config.enumsPrefix,
        transformUnderscore: transformUnderscore,
    });
    // Function that will generate the mocks.
    // We generate it after having visited because we need to distinct types from enums
    const mockFns = definitions
        .map(({ mockFn }: { mockFn: () => string }) => mockFn)
        .filter((mockFn: () => string) => !!mockFn)
        .map((mockFn: () => string) => mockFn())
        .join('\n');

    let mockFile = '';
    if (config.dynamicValues) mockFile += "import casual from 'casual';\n";
    mockFile += typesFileImport;
    if (config.dynamicValues) mockFile += '\ncasual.seed(0);\n';
    mockFile += mockFns;
    if (config.dynamicValues) mockFile += '\n\nexport const seedMocks = (seed: number) => casual.seed(seed);';
    mockFile += '\n';
    return mockFile;
};
