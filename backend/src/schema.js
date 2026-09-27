export const typeDefs = `#graphql
  enum ReleaseStatus {
    planned
    ongoing
    done
  }

  type Step {
    key: String!
    label: String!
    completed: Boolean!
  }

  type Release {
    id: ID!
    name: String!
    date: String!
    additionalInfo: String
    status: ReleaseStatus!
    steps: [Step!]!
    createdAt: String!
  }

  type Query {
    releases: [Release!]!
    release(id: ID!): Release
    steps: [Step!]!
  }

  input CreateReleaseInput {
    name: String!
    date: String!
    additionalInfo: String
  }

  type Mutation {
    createRelease(input: CreateReleaseInput!): Release!
    toggleStep(id: ID!, stepKey: String!, completed: Boolean!): Release!
    updateAdditionalInfo(id: ID!, additionalInfo: String): Release!
    deleteRelease(id: ID!): Boolean!
  }
`;
