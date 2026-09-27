import { gql } from "@apollo/client";

export const RELEASE_FIELDS = gql`
  fragment ReleaseFields on Release {
    id
    name
    date
    additionalInfo
    status
    createdAt
    steps {
      key
      label
      completed
    }
  }
`;

export const GET_RELEASES = gql`
  ${RELEASE_FIELDS}
  query GetReleases {
    releases {
      ...ReleaseFields
    }
  }
`;

export const CREATE_RELEASE = gql`
  ${RELEASE_FIELDS}
  mutation CreateRelease($input: CreateReleaseInput!) {
    createRelease(input: $input) {
      ...ReleaseFields
    }
  }
`;

export const TOGGLE_STEP = gql`
  ${RELEASE_FIELDS}
  mutation ToggleStep($id: ID!, $stepKey: String!, $completed: Boolean!) {
    toggleStep(id: $id, stepKey: $stepKey, completed: $completed) {
      ...ReleaseFields
    }
  }
`;

export const UPDATE_ADDITIONAL_INFO = gql`
  ${RELEASE_FIELDS}
  mutation UpdateAdditionalInfo($id: ID!, $additionalInfo: String) {
    updateAdditionalInfo(id: $id, additionalInfo: $additionalInfo) {
      ...ReleaseFields
    }
  }
`;

export const DELETE_RELEASE = gql`
  mutation DeleteRelease($id: ID!) {
    deleteRelease(id: $id)
  }
`;
