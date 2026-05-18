// src/operationFactories.ts
import {
    GraphQLSchema,
    OperationDefinitionNode,
    Kind,
    SelectionSetNode,
    GraphQLObjectType,
    GraphQLOutputType,
    GraphQLNamedType,
    isScalarType,
    isEnumType,
    getNamedType,
    FieldNode,
    isListType,
    isNonNullType,
    isObjectType,
    isInterfaceType,
    isUnionType,
    TypeNode,
    NamedTypeNode,
    ListTypeNode,
    FragmentDefinitionNode,
} from 'graphql';
import { Types } from '@graphql-codegen/plugin-helpers';
import { pascalCase } from 'change-case-all';
import { sentenceCase } from 'sentence-case';
import a from 'indefinite';
import { RUNTIME_HELPERS } from './operationRuntime';
import { generateMockValue } from './index';

export interface BuildOperationFactoriesArgs {
    schema: GraphQLSchema;
    documents: Types.DocumentFile[];
    typesFile: string;
    listElementCount: number;
    prefix: string | undefined;
    sharedGenerateMockOpts: any;
}

export interface BuildOperationFactoriesResult {
    output: string;
    operationTypeImports: string[];
}

const operationLocation = (op: OperationDefinitionNode): string => {
    const src = op.loc?.source.name ?? '<unknown source>';
    const line = op.loc?.startToken.line ?? '?';
    return `${src}:${line}`;
};

const operationTypeSuffix = (op: OperationDefinitionNode): string => {
    switch (op.operation) {
        case 'query':
            return 'Query';
        case 'mutation':
            return 'Mutation';
        case 'subscription':
            return 'Subscription';
        default:
            throw new Error(`Unknown operation type: ${op.operation}`);
    }
};

const operationTypeName = (op: OperationDefinitionNode): string =>
    `${pascalCase(op.name!.value)}${operationTypeSuffix(op)}`;

const factoryName = (op: OperationDefinitionNode, prefix: string | undefined): string => {
    const tn = operationTypeName(op);
    const article = prefix !== undefined ? prefix : a(sentenceCase(tn).split(' ')[0], { articleOnly: true });
    return `${article}${tn}Response`;
};

const collectOperations = (documents: Types.DocumentFile[]): OperationDefinitionNode[] => {
    const seen = new Map<string, OperationDefinitionNode>();
    const ops: OperationDefinitionNode[] = [];
    for (const file of documents) {
        for (const def of file.document.definitions) {
            if (def.kind !== Kind.OPERATION_DEFINITION) continue;
            if (!def.name) continue;
            const name = def.name.value;
            const prior = seen.get(name);
            if (prior) {
                throw new Error(
                    `Plugin "typescript-mock-data" found two operations named "${name}":\n` +
                        `  - ${operationLocation(prior)}\n` +
                        `  - ${operationLocation(def)}\n` +
                        `Each named operation must have a unique name.`,
                );
            }
            seen.set(name, def);
            ops.push(def);
        }
    }
    return ops;
};

const collectFragments = (documents: Types.DocumentFile[]): Map<string, FragmentDefinitionNode> => {
    const map = new Map<string, FragmentDefinitionNode>();
    for (const file of documents) {
        for (const def of file.document.definitions) {
            if (def.kind === Kind.FRAGMENT_DEFINITION) {
                map.set(def.name.value, def);
            }
        }
    }
    return map;
};

type LeafGenerator = (typeName: string, fieldName: string, gqlType: GraphQLOutputType) => string;

interface WalkContext {
    schema: GraphQLSchema;
    listElementCount: number;
    closures: string[];
    closureIdSeq: { n: number };
    generateLeaf: LeafGenerator;
    fragments: Map<string, FragmentDefinitionNode>;
}

const unwrap = (t: GraphQLOutputType): GraphQLNamedType => getNamedType(t) as GraphQLNamedType;

const pickBranch = (
    schema: GraphQLSchema,
    parentType: GraphQLNamedType,
    selectionSet: SelectionSetNode,
): GraphQLObjectType | null => {
    if (isObjectType(parentType)) return parentType;

    const candidateNames = new Set<string>();
    for (const sel of selectionSet.selections) {
        if (sel.kind === Kind.INLINE_FRAGMENT && sel.typeCondition) {
            candidateNames.add(sel.typeCondition.name.value);
        }
    }

    if (candidateNames.size === 0) {
        // No inline fragments. Pick from possible types.
        if (isUnionType(parentType)) {
            const types = parentType
                .getTypes()
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name));
            return types[0] ?? null;
        }
        if (isInterfaceType(parentType)) {
            const types = schema
                .getImplementations(parentType)
                .objects.slice()
                .sort((a, b) => a.name.localeCompare(b.name));
            return types[0] ?? null;
        }
        return null;
    }

    const sorted = Array.from(candidateNames).sort((a, b) => a.localeCompare(b));
    const chosen = schema.getType(sorted[0]);
    if (isObjectType(chosen)) return chosen;
    if (isInterfaceType(chosen)) {
        const types = schema
            .getImplementations(chosen)
            .objects.slice()
            .sort((a, b) => a.name.localeCompare(b.name));
        return types[0] ?? null;
    }
    if (isUnionType(chosen)) {
        const types = chosen
            .getTypes()
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name));
        return types[0] ?? null;
    }
    return null;
};

const toTypeNode = (t: GraphQLOutputType): TypeNode => {
    if (isNonNullType(t)) {
        return { kind: Kind.NON_NULL_TYPE, type: toTypeNode(t.ofType) as NamedTypeNode | ListTypeNode };
    }
    if (isListType(t)) {
        return { kind: Kind.LIST_TYPE, type: toTypeNode(t.ofType) };
    }
    return {
        kind: Kind.NAMED_TYPE,
        name: { kind: Kind.NAME, value: (t as any).name },
    };
};

const nextClosureName = (ctx: WalkContext, hint: string): string => {
    const id = ++ctx.closureIdSeq.n;
    return `make${pascalCase(hint)}_${id}`;
};

const selectsTypename = (
    selectionSet: SelectionSetNode,
    fragments: Map<string, FragmentDefinitionNode>,
    seen: Set<string> = new Set(),
): boolean => {
    for (const sel of selectionSet.selections) {
        if (sel.kind === Kind.FIELD && sel.name.value === '__typename') return true;
        if (sel.kind === Kind.INLINE_FRAGMENT && selectsTypename(sel.selectionSet, fragments, seen)) return true;
        if (sel.kind === Kind.FRAGMENT_SPREAD) {
            if (seen.has(sel.name.value)) continue;
            const frag = fragments.get(sel.name.value);
            if (!frag) continue;
            seen.add(sel.name.value);
            if (selectsTypename(frag.selectionSet, fragments, seen)) return true;
        }
    }
    return false;
};

const collectInlineFragmentTypeNames = (
    schema: GraphQLSchema,
    selectionSet: SelectionSetNode,
    fragments: Map<string, FragmentDefinitionNode>,
    names: Set<string>,
    seen: Set<string>,
): void => {
    for (const sel of selectionSet.selections) {
        if (sel.kind === Kind.INLINE_FRAGMENT && sel.typeCondition) {
            const t = schema.getType(sel.typeCondition.name.value);
            if (isObjectType(t)) {
                names.add(t.name);
            } else if (isInterfaceType(t)) {
                for (const impl of schema.getImplementations(t).objects) names.add(impl.name);
            } else if (isUnionType(t)) {
                for (const member of t.getTypes()) names.add(member.name);
            }
        } else if (sel.kind === Kind.FRAGMENT_SPREAD) {
            if (seen.has(sel.name.value)) continue;
            const frag = fragments.get(sel.name.value);
            if (!frag) continue;
            seen.add(sel.name.value);
            collectInlineFragmentTypeNames(schema, frag.selectionSet, fragments, names, seen);
        }
    }
};

const selectedBranches = (
    schema: GraphQLSchema,
    parentType: GraphQLNamedType,
    selectionSet: SelectionSetNode,
    fragments: Map<string, FragmentDefinitionNode>,
): GraphQLObjectType[] => {
    const names = new Set<string>();
    collectInlineFragmentTypeNames(schema, selectionSet, fragments, names, new Set());
    return Array.from(names)
        .sort((a, b) => a.localeCompare(b))
        .map((n) => schema.getType(n))
        .filter(isObjectType) as GraphQLObjectType[];
};

const emitCallbackDispatch = (
    selectionSet: SelectionSetNode,
    parentType: GraphQLNamedType,
    ctx: WalkContext,
    overrideAccess: string,
): string => {
    const branches = selectedBranches(ctx.schema, parentType, selectionSet, ctx.fragments);
    const branchEntries: string[] = [];
    for (const branch of branches) {
        const literal = walkSelectionSet(selectionSet, branch, ctx, '_o');
        const closureName = nextClosureName(ctx, branch.name);
        ctx.closures.push(`
    const ${closureName} = (_o?: any): any => {
        const _defaults = ${literal};
        return mergeOverrides(_defaults, _o);
    };`);
        branchEntries.push(`'${branch.name}': ${closureName}`);
    }
    return `pickByCallback({ ${branchEntries.join(', ')} }, '${branches[0].name}', ${overrideAccess})`;
};

const walkField = (
    field: FieldNode,
    parentType: GraphQLObjectType,
    ctx: WalkContext,
    overrideAccess: string,
): string => {
    const fieldName = field.name.value;
    const aliasOrName = field.alias?.value ?? fieldName;
    if (fieldName === '__typename') {
        return `${aliasOrName}: '${parentType.name}' as const`;
    }
    const fieldDef = parentType.getFields()[fieldName];
    if (!fieldDef) return `${aliasOrName}: null`;

    const childOverride = `${overrideAccess}?.${aliasOrName}`;

    let t = fieldDef.type;
    if (isNonNullType(t)) t = t.ofType;
    const fieldIsList = isListType(t);

    if (fieldIsList) {
        let inner = isListType(t) ? t.ofType : t;
        if (isNonNullType(inner)) inner = inner.ofType;
        const innerNamed = getNamedType(inner);
        const makeName = nextClosureName(ctx, aliasOrName);

        const isAbstract = isInterfaceType(innerNamed) || isUnionType(innerNamed);
        if (isAbstract && field.selectionSet && selectsTypename(field.selectionSet, ctx.fragments)) {
            const branches = selectedBranches(ctx.schema, innerNamed, field.selectionSet, ctx.fragments);
            if (branches.length >= 2) {
                const branchEntries: string[] = [];
                for (const branch of branches) {
                    const literal = walkSelectionSet(field.selectionSet, branch, ctx, '_o');
                    const closureName = nextClosureName(ctx, branch.name);
                    ctx.closures.push(`
    const ${closureName} = (_o?: any): any => {
        const _defaults = ${literal};
        return mergeOverrides(_defaults, _o);
    };`);
                    branchEntries.push(`'${branch.name}': ${closureName}`);
                }
                return `${aliasOrName}: applyBranchedArrayOverride({ ${branchEntries.join(', ')} }, '${
                    branches[0].name
                }', ${childOverride}, ${ctx.listElementCount})`;
            }
        }

        let elemBody: string;
        if (isScalarType(innerNamed) || isEnumType(innerNamed)) {
            elemBody = ctx.generateLeaf(parentType.name, field.name.value, inner);
        } else if (isObjectType(innerNamed) && field.selectionSet) {
            elemBody = walkSelectionSet(field.selectionSet, innerNamed, ctx, '_o');
        } else if (isAbstract && field.selectionSet) {
            elemBody = walkSelectionSet(field.selectionSet, innerNamed, ctx, '_o');
        } else {
            elemBody = 'null';
        }

        ctx.closures.push(`
    const ${makeName} = (_o?: any): any => {
        const _defaults = ${elemBody};
        return mergeOverrides(_defaults, _o);
    };`);

        return `${aliasOrName}: applyArrayOverride(${makeName}, ${childOverride}, ${ctx.listElementCount})`;
    }

    const named = unwrap(fieldDef.type);
    if (isScalarType(named) || isEnumType(named)) {
        return `${aliasOrName}: ${ctx.generateLeaf(parentType.name, fieldName, fieldDef.type)}`;
    }
    if (isObjectType(named) && field.selectionSet) {
        return `${aliasOrName}: ${walkSelectionSet(field.selectionSet, named, ctx, childOverride)}`;
    }
    if ((isInterfaceType(named) || isUnionType(named)) && field.selectionSet) {
        if (selectsTypename(field.selectionSet, ctx.fragments)) {
            const branches = selectedBranches(ctx.schema, named, field.selectionSet, ctx.fragments);
            if (branches.length >= 2) {
                return `${aliasOrName}: ${emitCallbackDispatch(field.selectionSet, named, ctx, childOverride)}`;
            }
        }
        // Cast the override to any when descending into a single concrete branch of an
        // interface/union. typescript-operations emits the full implementer list as the
        // static type, but we only walk one branch, so descendants need to reach
        // branch-specific fields without TS narrowing.
        return `${aliasOrName}: ${walkSelectionSet(field.selectionSet, named, ctx, `(${childOverride} as any)`)}`;
    }
    return `${aliasOrName}: null`;
};

const walkSelectionSet = (
    selectionSet: SelectionSetNode,
    parentType: GraphQLNamedType,
    ctx: WalkContext,
    overrideAccess: string,
): string => {
    let concrete: GraphQLObjectType;
    if (isObjectType(parentType)) {
        concrete = parentType;
    } else {
        const picked = pickBranch(ctx.schema, parentType, selectionSet);
        if (!picked) return '{}';
        concrete = picked;
    }

    const entries: string[] = [];
    const seenFragments = new Set<string>();
    const seenFields = new Set<string>();
    collectFieldSelections(selectionSet, concrete, ctx, overrideAccess, entries, seenFragments, seenFields);
    return `{\n            ${entries.join(',\n            ')},\n        }`;
};

const collectFieldSelections = (
    selectionSet: SelectionSetNode,
    concrete: GraphQLObjectType,
    ctx: WalkContext,
    overrideAccess: string,
    entries: string[],
    seenFragments: Set<string>,
    seenFields: Set<string>,
): void => {
    for (const sel of selectionSet.selections) {
        if (sel.kind === Kind.FIELD) {
            const key = sel.alias?.value ?? sel.name.value;
            if (seenFields.has(key)) continue;
            seenFields.add(key);
            entries.push(walkField(sel, concrete, ctx, overrideAccess));
        } else if (sel.kind === Kind.INLINE_FRAGMENT) {
            const cond = sel.typeCondition?.name.value;
            if (cond && !typeConditionMatches(ctx.schema, concrete, cond)) continue;
            collectFieldSelections(sel.selectionSet, concrete, ctx, overrideAccess, entries, seenFragments, seenFields);
        } else if (sel.kind === Kind.FRAGMENT_SPREAD) {
            if (seenFragments.has(sel.name.value)) continue;
            const frag = ctx.fragments.get(sel.name.value);
            if (!frag) continue;
            const fragCond = frag.typeCondition.name.value;
            if (!typeConditionMatches(ctx.schema, concrete, fragCond)) continue;
            seenFragments.add(sel.name.value);
            collectFieldSelections(
                frag.selectionSet,
                concrete,
                ctx,
                overrideAccess,
                entries,
                seenFragments,
                seenFields,
            );
        }
    }
};

const typeConditionMatches = (schema: GraphQLSchema, concrete: GraphQLObjectType, conditionName: string): boolean => {
    if (concrete.name === conditionName) return true;
    const conditionType = schema.getType(conditionName);
    if (!conditionType) return false;
    if (isInterfaceType(conditionType)) {
        return concrete.getInterfaces().some((i) => i.name === conditionType.name);
    }
    if (isUnionType(conditionType)) {
        return conditionType.getTypes().some((t) => t.name === concrete.name);
    }
    return false;
};

const buildFactory = (
    op: OperationDefinitionNode,
    schema: GraphQLSchema,
    listElementCount: number,
    prefix: string | undefined,
    generateLeaf: LeafGenerator,
    fragments: Map<string, FragmentDefinitionNode>,
): string => {
    const opType = schema.getRootType(op.operation);
    if (!opType) return '';
    const typeName = operationTypeName(op);
    const fnName = factoryName(op, prefix);
    const ctx: WalkContext = {
        schema,
        listElementCount,
        closures: [],
        closureIdSeq: { n: 0 },
        generateLeaf,
        fragments,
    };
    const literal = walkSelectionSet(op.selectionSet, opType, ctx, 'overrides');
    const closures = ctx.closures.join('\n');
    return `
export const ${fnName} = (
    overrides?: DeepPartial<${typeName}>,
): ${typeName} => {${closures}
    const defaults: ${typeName} = ${literal};
    return mergeOverrides(defaults, overrides);
};
`;
};

export const buildOperationFactories = (args: BuildOperationFactoriesArgs): BuildOperationFactoriesResult => {
    const ops = collectOperations(args.documents);
    if (ops.length === 0) return { output: '', operationTypeImports: [] };

    const fragments = collectFragments(args.documents);

    const generateLeaf: LeafGenerator = (typeName, fieldName, gqlType) => {
        const typeNode = toTypeNode(gqlType);
        return String(
            generateMockValue({
                typeName,
                fieldName,
                generatorMode: 'output',
                currentType: typeNode,
                ...args.sharedGenerateMockOpts,
            }),
        );
    };

    const factories = ops
        .map((op) => buildFactory(op, args.schema, args.listElementCount, args.prefix, generateLeaf, fragments))
        .join('\n');
    const imports = ops.map((op) => operationTypeName(op));
    return {
        output: `\n${RUNTIME_HELPERS}\n${factories}`,
        operationTypeImports: imports,
    };
};
