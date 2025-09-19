const withFilter = require("graphql-subscriptions").withFilter;
const PubSub = require("graphql-subscriptions").PubSub;
const pubsub = new PubSub();
const { of } = require("rxjs");
const { tap, map, mergeMap, catchError } = require('rxjs/operators');
let broker = require("../../broker/BrokerFactory")();
broker = broker.secondaryBroker ? broker.secondaryBroker : broker;
const RoleValidator = require('../../tools/RoleValidator');
const { handleError$ } = require('../../tools/GraphqlResponseTools');

const INTERNAL_SERVER_ERROR_CODE = 1;
const PERMISSION_DENIED_ERROR_CODE = 2;
const CONTEXT_NAME = "generator";

const READ_ROLES = ["GENERATOR_READ"];
const WRITE_ROLES = ["GENERATOR_WRITE"];

function getResponseFromBackEnd$(response) {
    return of(response)
        .pipe(
            map(resp => {
                if (resp.result.code != 200) {
                    const err = new Error();
                    err.name = 'Error';
                    err.message = resp.result.error;
                    // this[Symbol()] = resp.result.error;
                    Error.captureStackTrace(err, 'Error');
                    throw err;
                }
                return resp.data;
            })
        );
}

/**
 * Validate user roles and send request to backend handler
 * @param {object} root root of GraphQl
 * @param {object} OperationArguments arguments for query or mutation
 * @param {object} context graphQl context
 * @param { Array } requiredRoles Roles required to use the query or mutation
 * @param {string} operationType  sample: query || mutation
 * @param {string} aggregateName sample: Vehicle, Client, FixedFile 
 * @param {string} methodName method name
 * @param {number} timeout timeout for query or mutation in milliseconds
 */
function sendToBackEndHandler$(root, OperationArguments, context, requiredRoles, operationType, aggregateName, methodName, timeout = 2000) {
    return RoleValidator.checkPermissions$(
        context.authToken.realm_access.roles,
        CONTEXT_NAME,
        methodName,
        PERMISSION_DENIED_ERROR_CODE,
        "Permission denied",
        requiredRoles
    )
        .pipe(
            mergeMap(() =>
                broker.forwardAndGetReply$(
                    aggregateName,
                    `emigateway.graphql.${operationType}.${methodName}`,
                    { root, args: OperationArguments, jwt: context.encodedToken },
                    timeout
                )
            ),
            catchError(err => handleError$(err, methodName)),
            mergeMap(response => getResponseFromBackEnd$(response))
        )
}


module.exports = {

    //// QUERY ///////
    Query: {
        GeneratorGeneratorListing(root, args, context) {
            return sendToBackEndHandler$(root, args, context, READ_ROLES, 'query', 'Generator', 'GeneratorGeneratorListing').toPromise();
        },
        GeneratorGenerator(root, args, context) {
            return sendToBackEndHandler$(root, args, context, READ_ROLES, 'query', 'Generator', 'GeneratorGenerator').toPromise();
        },
        VehicleVehicleListing(root, args, context) {
            return sendToBackEndHandler$(root, args, context, READ_ROLES, 'query', 'Vehicle', 'VehicleVehicleListing').toPromise();
        },
        VehicleVehicle(root, args, context) {
            return sendToBackEndHandler$(root, args, context, READ_ROLES, 'query', 'Vehicle', 'VehicleVehicle').toPromise();
        }
    },

    //// MUTATIONS ///////
    Mutation: {
        GeneratorCreateGenerator(root, args, context) {
            return sendToBackEndHandler$(root, args, context, WRITE_ROLES, 'mutation', 'Generator', 'GeneratorCreateGenerator').toPromise();
        },
        GeneratorUpdateGenerator(root, args, context) {
            return sendToBackEndHandler$(root, args, context, WRITE_ROLES, 'mutation', 'Generator', 'GeneratorUpdateGenerator').toPromise();
        },
        GeneratorDeleteGenerators(root, args, context) {
            return sendToBackEndHandler$(root, args, context, WRITE_ROLES, 'mutation', 'Generator', 'GeneratorDeleteGenerators').toPromise();
        },
        VehicleStartGeneration(root, args, context) {
            return sendToBackEndHandler$(root, args, context, WRITE_ROLES, 'mutation', 'Vehicle', 'VehicleStartGeneration', 5000).toPromise();
        },
        VehicleStopGeneration(root, args, context) {
            return sendToBackEndHandler$(root, args, context, WRITE_ROLES, 'mutation', 'Vehicle', 'VehicleStopGeneration', 5000).toPromise();
        },
    },

    //// SUBSCRIPTIONS ///////
    Subscription: {
        GeneratorGeneratorModified: {
            subscribe: withFilter(
                (payload, variables, context, info) => {
                    //Checks the roles of the user, if the user does not have at least one of the required roles, an error will be thrown
                    RoleValidator.checkAndThrowError(
                        context.authToken.realm_access.roles,
                        READ_ROLES,
                        "Generator",
                        "GeneratorGeneratorModified",
                        PERMISSION_DENIED_ERROR_CODE,
                        "Permission denied"
                    );
                    return pubsub.asyncIterator("GeneratorGeneratorModified");
                },
                (payload, variables, context, info) => {
                    return payload
                        ? (payload.GeneratorGeneratorModified.id === variables.id) || (variables.id === "ANY")
                        : false;
                }
            )
        },
        VehicleVehicleGenerated: {
            subscribe: withFilter(
                (payload, variables, context, info) => {
                    //Checks the roles of the user, if the user does not have at least one of the required roles, an error will be thrown
                    RoleValidator.checkAndThrowError(
                        context.authToken.realm_access.roles,
                        READ_ROLES,
                        "Vehicle",
                        "VehicleVehicleGenerated",
                        PERMISSION_DENIED_ERROR_CODE,
                        "Permission denied"
                    );
                    return pubsub.asyncIterator("VehicleVehicleGenerated");
                },
                (payload, variables, context, info) => {
                    return payload ? true : false;
                }
            )
        }
    }
};


//// SUBSCRIPTIONS SOURCES ////

const eventDescriptors = [
    {
        backendEventName: "GeneratorGeneratorModified",
        gqlSubscriptionName: "GeneratorGeneratorModified",
        dataExtractor: evt => evt.data, // OPTIONAL, only use if needed
        onError: (error, descriptor) =>
            console.log(`Error processing ${descriptor.backendEventName}`), // OPTIONAL, only use if needed
        onEvent: (evt, descriptor) =>
            console.log(`Event of type  ${descriptor.backendEventName} arrived`) // OPTIONAL, only use if needed
    },
    {
        backendEventName: "VehicleVehicleGenerated",
        gqlSubscriptionName: "VehicleVehicleGenerated",
        dataExtractor: evt => evt.data, // OPTIONAL, only use if needed
        onError: (error, descriptor) =>
            console.log(`Error processing ${descriptor.backendEventName}`), // OPTIONAL, only use if needed
        onEvent: (evt, descriptor) =>
            console.log(`Event of type  ${descriptor.backendEventName} arrived`) // OPTIONAL, only use if needed
    }
];

/**
 * Connects every backend event to the right GQL subscription
 */
eventDescriptors.forEach(descriptor => {
    broker.getMaterializedViewsUpdates$([descriptor.backendEventName]).subscribe(
        evt => {
            if (descriptor.onEvent) {
                descriptor.onEvent(evt, descriptor);
            }
            const payload = {};
            payload[descriptor.gqlSubscriptionName] = descriptor.dataExtractor
                ? descriptor.dataExtractor(evt)
                : evt.data;
            pubsub.publish(descriptor.gqlSubscriptionName, payload);
        },

        error => {
            if (descriptor.onError) {
                descriptor.onError(error, descriptor);
            }
            console.error(`Error listening ${descriptor.gqlSubscriptionName}`, error);
        },

        () => console.log(`${descriptor.gqlSubscriptionName} listener STOPED.`)
    );
});
