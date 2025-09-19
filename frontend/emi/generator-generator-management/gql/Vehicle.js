import { gql } from "apollo-boost";

export const VehicleStartGeneration = () => ({
    mutation: gql`
        mutation VehicleStartGeneration {
            VehicleStartGeneration {
                code
                message
            }
        }
    `,
    fetchPolicy: "no-cache"
});

export const VehicleStopGeneration = () => ({
    mutation: gql`
        mutation VehicleStopGeneration {
            VehicleStopGeneration {
                code
                message
            }
        }
    `,
    fetchPolicy: "no-cache"
});

export const VehicleVehicleListing = () => ({
    query: gql`
        query VehicleVehicleListing($filterInput: VehicleVehicleFilterInput, $paginationInput: VehicleVehiclePaginationInput, $sortInput: VehicleVehicleSortInput) {
            VehicleVehicleListing(filterInput: $filterInput, paginationInput: $paginationInput, sortInput: $sortInput) {
                listing {
                    id
                    type
                    powerSource
                    hp
                    year
                    topSpeed
                    timestamp
                }
                queryTotalResultCount
            }
        }
    `,
    fetchPolicy: "cache-and-network"
});

export const VehicleVehicle = (id) => ({
    query: gql`
        query VehicleVehicle($id: ID!) {
            VehicleVehicle(id: $id) {
                id
                type
                powerSource
                hp
                year
                topSpeed
                timestamp
            }
        }
    `,
    fetchPolicy: "cache-and-network",
    variables: { id }
});

export const onVehicleVehicleGenerated = () => ({
    query: gql`
        subscription VehicleVehicleGenerated {
            VehicleVehicleGenerated {
                id
                type
                powerSource
                hp
                year
                topSpeed
                timestamp
            }
        }
    `,
    fetchPolicy: "no-cache"
});
