import { printSchema, parse, visit, ASTKindToNode, NamedTypeNode, TypeNode, VisitFn } from 'graphql';
import casual from 'casual';
import { PluginFunction } from '@graphql-codegen/plugin-helpers';
import { pascalCase } from 'pascal-case';
import { upperCase } from 'upper-case';

type NamingConvention = 'upper-case#upperCase' | 'pascal-case#pascalCase' | 'keep';

const createNameConverter = (convention: NamingConvention) => (value: string) => {
    switch (convention) {
        case 'upper-case#upperCase':
            return upperCase(value || '');
        case 'keep':
            return value;
        case 'pascal-case#pascalCase':
        // fallthrough
        default:
            // default to pascal case in case of unknown values
            return pascalCase(value || '');
    }
};

const toMockName = (name: string, prefix?: string) => {
    if (prefix) {
        return `${prefix}${name}`;
    }
    const isVowel = name.match(/^[AEIO]/);
    return isVowel ? `an${name}` : `a${name}`;
};

const updateTextCase = (str: string, enumValuesConvention: NamingConvention) => {
    const convert = createNameConverter(enumValuesConvention);

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

const getNamedType = (
    typeName: string,
    fieldName: string,
    types: TypeItem[],
    typenamesConvention: NamingConvention,
    enumValuesConvention: NamingConvention,
    prefix?: string,
    namedType?: NamedTypeNode,
    customScalars?: ScalarMap,
): string | number | boolean => {
    if (!namedType) {
        return '';
    }

    casual.seed(hashedString(typeName + fieldName));
    const name = namedType.name.value;
    switch (name) {
        case 'String':
            return `'${casual.word}'`;
        case 'Float':
            return Math.round(casual.double(0, 10) * 100) / 100;
        case 'ID':
            return `'${casual.uuid}'`;
        case 'Boolean':
            return casual.boolean;
        case 'Int':
            return casual.integer(0, 9999);
        case 'Date':
            return `'${new Date(casual.unix_time).toISOString()}'`;
        default: {
            const foundType = types.find((enumType: TypeItem) => enumType.name === name);
            if (foundType) {
                switch (foundType.type) {
                    case 'enum': {
                        // It's an enum
                        const typenameConverter = createNameConverter(typenamesConvention);
                        const value = foundType.values ? foundType.values[0] : '';
                        return `${typenameConverter(foundType.name)}.${updateTextCase(value, enumValuesConvention)}`;
                    }
                    case 'union':
                        // Return the first union type node.
                        return getNamedType(
                            typeName,
                            fieldName,
                            types,
                            typenamesConvention,
                            enumValuesConvention,
                            prefix,
                            foundType.types && foundType.types[0],
                        );
                    case 'scalar':
                        // it's a scalar, let's use a string as a value if there is no custom
                        // mapping for this particular scalar
                        if (!customScalars || !customScalars[foundType.name]) {
                            return `'${casual.word}'`;
                        }

                        // If there is a mapping to a `casual` type, then use this
                        const value = casual[customScalars[foundType.name]];
                        return typeof value === 'function' ? value() : value;
                    default:
                        throw `foundType is unknown: ${foundType.name}: ${foundType.type}`;
                }
            }
            return `${toMockName(name, prefix)}()`;
        }
    }
};

const generateMockValue = (
    typeName: string,
    fieldName: string,
    types: TypeItem[],
    typenamesConvention: NamingConvention,
    enumValuesConvention: NamingConvention,
    prefix: string | undefined,
    currentType: TypeNode,
    customScalars: ScalarMap,
): string | number | boolean => {
    switch (currentType.kind) {
        case 'NamedType':
            return getNamedType(
                typeName,
                fieldName,
                types,
                typenamesConvention,
                enumValuesConvention,
                prefix,
                currentType as NamedTypeNode,
                customScalars,
            );
        case 'NonNullType':
            return generateMockValue(
                typeName,
                fieldName,
                types,
                typenamesConvention,
                enumValuesConvention,
                prefix,
                currentType.type,
                customScalars,
            );
        case 'ListType': {
            const value = generateMockValue(
                typeName,
                fieldName,
                types,
                typenamesConvention,
                enumValuesConvention,
                prefix,
                currentType.type,
                customScalars,
            );
            return `[${value}]`;
        }
    }
};

const getMockString = (
    typeName: string,
    fields: string,
    typenamesConvention: NamingConvention,
    addTypename = false,
    prefix,
) => {
    const casedName = createNameConverter(typenamesConvention)(typeName);
    const typename = addTypename ? `\n        __typename: '${casedName}',` : '';
    return `
export const ${toMockName(casedName, prefix)} = (overrides?: Partial<${casedName}>): ${casedName} => {
    return {${typename}
${fields}
    };
};`;
};

type ScalarMap = { [name: string]: keyof (Casual.Casual | Casual.functions) };

export interface TypescriptMocksPluginConfig {
    typesFile?: string;
    enumValues?: NamingConvention;
    typenames?: NamingConvention;
    addTypename?: boolean;
    prefix?: string;
    scalars?: ScalarMap;
}

interface TypeItem {
    name: string;
    type: 'enum' | 'scalar' | 'union';
    values?: string[];
    types?: readonly NamedTypeNode[];
}

type VisitorType = { [K in keyof ASTKindToNode]?: VisitFn<ASTKindToNode[keyof ASTKindToNode], ASTKindToNode[K]> };

// This plugin was generated with the help of ast explorer.
// https://astexplorer.net
// Paste your graphql schema in it, and you'll be able to see what the `astNode` will look like
export const plugin: PluginFunction<TypescriptMocksPluginConfig> = (schema, documents, config) => {
    const printedSchema = printSchema(schema); // Returns a string representation of the schema
    const astNode = parse(printedSchema); // Transforms the string into ASTNode

    const enumValuesConvention = config.enumValues || 'pascal-case#pascalCase';
    const typenamesConvention = config.typenames || 'pascal-case#pascalCase';
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
                    const value = generateMockValue(
                        typeName,
                        fieldName,
                        types,
                        typenamesConvention,
                        enumValuesConvention,
                        config.prefix,
                        node.type,
                        config.scalars,
                    );

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
                                  const value = generateMockValue(
                                      fieldName,
                                      field.name.value,
                                      types,
                                      typenamesConvention,
                                      enumValuesConvention,
                                      config.prefix,
                                      field.type,
                                      config.scalars,
                                  );

                                  return `        ${field.name.value}: overrides && overrides.hasOwnProperty('${field.name.value}') ? overrides.${field.name.value}! : ${value},`;
                              })
                              .join('\n')
                        : '';

                    return getMockString(fieldName, mockFields, typenamesConvention, false, config.prefix);
                },
            };
        },
        ObjectTypeDefinition: (node) => {
            // This function triggered per each type
            const typeName = node.name.value;

            if (typeName === 'Query' || typeName === 'Mutation') {
                return null;
            }

            const { fields } = node;
            return {
                typeName,
                mockFn: () => {
                    const mockFields = fields ? fields.map(({ mockFn }: any) => mockFn(typeName)).join('\n') : '';

                    return getMockString(
                        typeName,
                        mockFields,
                        typenamesConvention,
                        !!config.addTypename,
                        config.prefix,
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

    const result: any = visit(astNode, { leave: visitor });
    const definitions = result.definitions.filter((definition: any) => !!definition);
    const typesFile = config.typesFile ? config.typesFile.replace(/\.[\w]+$/, '') : null;
    const typeImports = definitions
        .map(({ typeName }: { typeName: string }) => typeName)
        .filter((typeName: string) => !!typeName);
    typeImports.push(...types.filter(({ type }) => type !== 'scalar').map(({ name }) => name));
    // List of function that will generate the mock.
    // We generate it after having visited because we need to distinct types from enums
    const mockFns = definitions.map(({ mockFn }: any) => mockFn).filter((mockFn: Function) => !!mockFn);
    const typesFileImport = typesFile
        ? `/* eslint-disable @typescript-eslint/no-use-before-define,@typescript-eslint/no-unused-vars,no-prototype-builtins */
import { ${typeImports.join(', ')} } from '${typesFile}';\n`
        : '';

    return `${typesFileImport}${mockFns.map((mockFn: Function) => mockFn()).join('\n')}
`;
};
