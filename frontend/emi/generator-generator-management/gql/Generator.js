import { gql } from 'apollo-boost';

export const GeneratorGeneratorListing = (variables) => ({
    query: gql`
            query GeneratorGeneratorListing($filterInput:GeneratorGeneratorFilterInput ,$paginationInput:GeneratorGeneratorPaginationInput,$sortInput:GeneratorGeneratorSortInput){
                GeneratorGeneratorListing(filterInput:$filterInput,paginationInput:$paginationInput,sortInput:$sortInput){
                    listing{
                       id,name,active,
                    },
                    queryTotalResultCount
                }
            }`,
    variables,
    fetchPolicy: 'network-only',
})

export const GeneratorGenerator = (variables) => ({
    query: gql`
            query GeneratorGenerator($id: ID!, $organizationId: String!){
                GeneratorGenerator(id:$id, organizationId:$organizationId){
                    id,name,description,active,organizationId,
                    metadata{ createdBy, createdAt, updatedBy, updatedAt }
                }
            }`,
    variables,
    fetchPolicy: 'network-only',
})


export const GeneratorCreateGenerator = (variables) => ({
    mutation: gql`
            mutation  GeneratorCreateGenerator($input: GeneratorGeneratorInput!){
                GeneratorCreateGenerator(input: $input){
                    id,name,description,active,organizationId,
                    metadata{ createdBy, createdAt, updatedBy, updatedAt }
                }
            }`,
    variables
})

export const GeneratorDeleteGenerator = (variables) => ({
    mutation: gql`
            mutation GeneratorGeneratorListing($ids: [ID]!){
                GeneratorDeleteGenerators(ids: $ids){
                    code,message
                }
            }`,
    variables
})

export const GeneratorUpdateGenerator = (variables) => ({
    mutation: gql`
            ,mutation  GeneratorUpdateGenerator($id: ID!,$input: GeneratorGeneratorInput!, $merge: Boolean!){
                GeneratorUpdateGenerator(id:$id, input: $input, merge:$merge ){
                    id,organizationId,name,description,active
                }
            }`,
    variables
})

export const onGeneratorGeneratorModified = (variables) => ([
    gql`subscription onGeneratorGeneratorModified($id:ID!){
            GeneratorGeneratorModified(id:$id){    
                id,organizationId,name,description,active,
                metadata{ createdBy, createdAt, updatedBy, updatedAt }
            }
    }`,
    { variables }
])