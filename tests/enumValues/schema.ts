import { buildSchema } from 'graphql';

export default buildSchema(/* GraphQL */ `
    enum UnderscoreEnum {
        _id
    }

    enum PascalCaseEnum {
        PascalCase
    }

    enum CamelCaseEnum {
        camelCase
    }

    enum SnakeCaseEnum {
        snake_case
    }

    enum ScreamingSnakeCaseEnum {
        SCREAMING_SNAKE_CASE
    }

    type MyType {
        underscoreEnum: UnderscoreEnum!
        pascalCaseEnum: PascalCaseEnum!
        camelCaseEnum: CamelCaseEnum!
        snakeCaseEnum: SnakeCaseEnum!
        screamingSnakeCaseEnum: ScreamingSnakeCaseEnum!
    }
`);
