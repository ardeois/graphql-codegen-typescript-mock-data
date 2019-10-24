import { printSchema, parse, visit, ASTKindToNode, NamedTypeNode, TypeNode, VisitFn } from 'graphql';
import faker from 'faker';
import { toPascalCase, PluginFunction } from '@graphql-codegen/plugin-helpers';

const mockBuilderHelper = `
function lowerFirst(value: string) {
    return value.replace(/^\\w/, c => c.toLowerCase());
}

/**
 * Creates a new mock object for use on mock providers, or unit tests.
 * @param {T} obj Initial object from which mock will be created
 * @returns {T} Object with auto-generated methods \`withPropertyName\`
 * for each property \`propertyName\` of the initial object.
 * @note Will failed to create accessors for optional TypeScript properties
 * like \`propertyName?: boolean\` that will result in no property created in JavaScript.
 */
export function mockBuilder<T extends Object>(obj: T): T & any {
    let proxy = new Proxy(obj, {
        get: (target: T, key: keyof T) => {
            if (typeof key === 'string' && key.startsWith('with') && !(key in target)) {
                // It's a builder property \`withXxxx\` we dynamically create the setter function
                let property = key.substring(4);
                property = property in target ? property : lowerFirst(property);
                if (property in target) {
                    return function(value: any) {
                        // Property is a simple value
                        // @ts-ignore
                        target[property] = value;
                        return proxy;
                    };
                } else {
                    throw \`Property '\${property}' doesn't exist for object \${target.constructor.name ||
    typeof target}\`;
                }
            }
            return target[key];
        }
    });

    return proxy;
}`;

const toMockName = (name: string) => {
    const isVowel = name.match(/^[AEIO]/);
    return isVowel ? `an${name}` : `a${name}`;
};

const capitalize = (s: unknown) => {
    if (typeof s !== 'string') {
        return '';
    }
    return s.charAt(0).toUpperCase() + s.slice(1);
};

const hashedString = (value: string) => {
    let hash = 0;
    if (value.length === 0) {
        return hash;
    }
    for (let i = 0; i < value.length; i++) {
        let char = value.charCodeAt(i);
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
    namedType?: NamedTypeNode,
): string | number | boolean => {
    if (!namedType) {
        return '';
    }

    faker.seed(hashedString(typeName + fieldName));
    const name = namedType.name.value;
    switch (name) {
        case 'String':
            return `'${faker.lorem.word()}'`;
        case 'Float':
            return faker.random.number({ min: 0, max: 10, precision: 0.01 });
        case 'ID':
            return `'${faker.random.uuid()}'`;
        case 'Boolean':
            return faker.random.boolean();
        case 'Int':
            return faker.random.number({ min: 0, max: 9999 });
        case 'Date':
            return `'${faker.date.past().toISOString()}'`;
        default:
            const foundType = types.find(enumType => enumType.name === name);
            if (foundType) {
                switch (foundType.type) {
                    case 'enum':
                        // It's an enum
                        const value = foundType.values ? foundType.values[0] : '';
                        return `${foundType.name}.${toPascalCase(value)}`;
                    case 'union':
                        // Return the first union type node.
                        return getNamedType(typeName, fieldName, types, foundType.types && foundType.types[0]);
                    default:
                        throw `foundType is unknown: ${foundType.name}: ${foundType.type}`;
                }
            }
            return `${toMockName(name)}()`;
    }
};

const generateMockValue = (
    typeName: string,
    fieldName: string,
    types: TypeItem[],
    currentType: TypeNode,
): string | number | boolean => {
    switch (currentType.kind) {
        case 'NamedType':
            return getNamedType(typeName, fieldName, types, currentType as NamedTypeNode);
        case 'NonNullType':
            return generateMockValue(typeName, fieldName, types, currentType.type);
        case 'ListType':
            const value = generateMockValue(typeName, fieldName, types, currentType.type);
            return `[${value}]`;
    }
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TypescriptMocksPluginConfig {
    typesFile: string;
}

interface TypeItem {
    name: string;
    type: string;
    values?: string[];
    types?: ReadonlyArray<NamedTypeNode>;
}

type VisitorType = { [K in keyof ASTKindToNode]?: VisitFn<ASTKindToNode[keyof ASTKindToNode], ASTKindToNode[K]> };

// This plugin was generated with the help of ast explorer.
// https://astexplorer.net
// Paste your graphql schema in it, and you'll be able to see what the `astNode` will look like
export const plugin: PluginFunction<TypescriptMocksPluginConfig> = (schema, documents, config) => {
    const printedSchema = printSchema(schema); // Returns a string representation of the schema
    const astNode = parse(printedSchema); // Transforms the string into ASTNode
    // List of types that are enums
    const types: TypeItem[] = [];
    const visitor: VisitorType = {
        EnumTypeDefinition: node => {
            const name = node.name.value;
            if (!types.find((enumType: TypeItem) => enumType.name === name)) {
                types.push({
                    name,
                    type: 'enum',
                    values: node.values ? node.values.map(node => node.name.value) : [],
                });
            }
        },
        UnionTypeDefinition: node => {
            const name = node.name.value;
            if (!types.find(enumType => enumType.name === name)) {
                types.push({
                    name,
                    type: 'union',
                    types: node.types,
                });
            }
        },
        FieldDefinition: node => {
            const fieldName = node.name.value;

            return {
                name: fieldName,
                mockFn: (typeName: string) => {
                    const value = generateMockValue(typeName, fieldName, types, node.type);

                    return `        ${fieldName}: ${value},`;
                },
            };
        },
        ObjectTypeDefinition: node => {
            // This function triggered per each type
            const typeName = node.name.value;

            if (typeName === 'Query') {
                return null;
            }

            const { fields } = node;
            return {
                typeName,
                mockFn: () => {
                    const mockFields = fields ? fields.map(({ mockFn }: any) => mockFn(typeName)).join('\n') : '';
                    const fieldNames = fields ? fields.map(({ name }) => name) : [];

                    const mockInterface = `interface ${typeName}Mock extends ${typeName} {
    ${fieldNames
        .map(name => `with${capitalize(name)}: (value: ${typeName}['${name}']) => ${typeName}Mock;`)
        .join('\n    ')}
}`;

                    return `
${mockInterface}

export const ${toMockName(typeName)} = (): ${typeName}Mock => {
    return mockBuilder<${typeName}>({
${mockFields}
    });
};`;
                },
            };
        },
    };

    const result: any = visit(astNode, { leave: visitor });
    const definitions = result.definitions.filter((definition: any) => !!definition);
    const typesFile = config.typesFile.replace(/\.[\w]+$/, '');
    const typeImports = definitions
        .map(({ typeName }: { typeName: string }) => typeName)
        .filter((typeName: string) => !!typeName);
    typeImports.push(...types.map(({ name }) => name));
    // List of function that will generate the mock.
    // We generate it after having visited because we need to distinct types from enums
    const mockFns = definitions.map(({ mockFn }: any) => mockFn).filter((mockFn: Function) => !!mockFn);
    const typesFileImport = typesFile
        ? `/* eslint-disable @typescript-eslint/no-use-before-define,@typescript-eslint/no-unused-vars */
import { ${typeImports.join(', ')} } from '${typesFile}';\n`
        : '';

    return `${typesFileImport}
${mockBuilderHelper}
${mockFns.map((mockFn: Function) => mockFn()).join('\n')}
`;
};
