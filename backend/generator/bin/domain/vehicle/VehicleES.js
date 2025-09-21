'use strict'

const { iif, of } = require("rxjs");
const { tap, catchError } = require('rxjs/operators');
const { ConsoleLogger } = require('@nebulae/backend-node-tools').log;

const VehicleDA = require("./data-access/VehicleDA");

/**
 * Singleton instance
 * @type { VehicleES }
 */
let instance;

class VehicleES {

    constructor() {
    }

    /**     
     * Generates and returns an object that defines the Event-Sourcing events handlers.
     * 
     * The map is a relationship of: AGGREGATE_TYPE VS { EVENT_TYPE VS  { fn: rxjsFunction, instance: invoker_instance } }
     * 
     * ## Example
     *  { "User" : { "UserAdded" : {fn: handleUserAdded$, instance: classInstance } } }
     */
    generateEventProcessorMap() {
        return {
            'Vehicle': {
                "VehicleGenerated": { fn: instance.handleVehicleGenerated$, instance, processOnlyOnSync: false },
                "VehicleGenerationStarted": { fn: instance.handleVehicleGenerationStarted$, instance, processOnlyOnSync: false },
                "VehicleGenerationStopped": { fn: instance.handleVehicleGenerationStopped$, instance, processOnlyOnSync: false },
            }
        }
    };

    /**
     * Using the VehicleGenerated events restores the MaterializedView
     * This is just a recovery strategy
     * @param {*} VehicleGeneratedEvent Vehicle Generated Event
     */
    handleVehicleGenerated$({ etv, aid, av, data, user, timestamp }) {
        const aggregateDataMapper = [
            /*etv=0 mapper*/ () => { throw new Error('etv 0 is not an option') },
            /*etv=1 mapper*/ (eventData) => { return { ...eventData }; }
        ];
        const aggregateData = aggregateDataMapper[etv](data);
        return VehicleDA.updateVehicleFromRecovery$(aid, aggregateData, av).pipe(
            tap(() => ConsoleLogger.i(`VehicleES.handleVehicleGenerated: aid=${aid}, timestamp=${timestamp}`))
        )
    }

    /**
     * Handle VehicleGenerationStarted event
     * @param {*} VehicleGenerationStartedEvent Vehicle Generation Started Event
     */
    handleVehicleGenerationStarted$({ etv, aid, av, data, user, timestamp }) {
        const aggregateDataMapper = [
            /*etv=0 mapper*/ () => { throw new Error('etv 0 is not an option') },
            /*etv=1 mapper*/ (eventData) => { return { ...eventData }; }
        ];
        const aggregateData = aggregateDataMapper[etv](data);
        return VehicleDA.updateVehicleFromRecovery$(aid, aggregateData, av).pipe(
            tap(() => ConsoleLogger.i(`VehicleES.handleVehicleGenerationStarted: aid=${aid}, timestamp=${timestamp}`)),
            catchError(error => {
                ConsoleLogger.w(`VehicleES.handleVehicleGenerationStarted: MongoDB not ready, skipping event aid=${aid}: ${error.message}`);
                return of(null); // Return empty result to continue processing
            })
        )
    }

    /**
     * Handle VehicleGenerationStopped event
     * @param {*} VehicleGenerationStoppedEvent Vehicle Generation Stopped Event
     */
    handleVehicleGenerationStopped$({ etv, aid, av, data, user, timestamp }) {
        const aggregateDataMapper = [
            /*etv=0 mapper*/ () => { throw new Error('etv 0 is not an option') },
            /*etv=1 mapper*/ (eventData) => { return { ...eventData }; }
        ];
        const aggregateData = aggregateDataMapper[etv](data);
        return VehicleDA.updateVehicleFromRecovery$(aid, aggregateData, av).pipe(
            tap(() => ConsoleLogger.i(`VehicleES.handleVehicleGenerationStopped: aid=${aid}, timestamp=${timestamp}`)),
            catchError(error => {
                ConsoleLogger.w(`VehicleES.handleVehicleGenerationStopped: MongoDB not ready, skipping event aid=${aid}: ${error.message}`);
                return of(null); // Return empty result to continue processing
            })
        )
    }
}

/**
 * @returns {VehicleES}
 */
module.exports = () => {
    if (!instance) {
        instance = new VehicleES();
        ConsoleLogger.i(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};
