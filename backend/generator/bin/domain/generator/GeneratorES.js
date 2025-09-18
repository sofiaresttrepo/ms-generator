'use strict'

const { iif } = require("rxjs");
const { tap } = require('rxjs/operators');
const { ConsoleLogger } = require('@nebulae/backend-node-tools').log;

const GeneratorDA = require("./data-access/GeneratorDA");
/**
 * Singleton instance
 * @type { GeneratorES }
 */
let instance;

class GeneratorES {

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
            'Generator': {
                "GeneratorModified": { fn: instance.handleGeneratorModified$, instance, processOnlyOnSync: true },
            }
        }
    };

    /**
     * Using the GeneratorModified events restores the MaterializedView
     * This is just a recovery strategy
     * @param {*} GeneratorModifiedEvent Generator Modified Event
     */
    handleGeneratorModified$({ etv, aid, av, data, user, timestamp }) {
        const aggregateDataMapper = [
            /*etv=0 mapper*/ () => { throw new Error('etv 0 is not an option') },
            /*etv=1 mapper*/ (eventData) => { return { ...eventData, modType: undefined }; }
        ];
        delete aggregateDataMapper.modType;
        const aggregateData = aggregateDataMapper[etv](data);
        return iif(
            () => (data.modType === 'DELETE'),
            GeneratorDA.deleteGenerator$(aid),
            GeneratorDA.updateGeneratorFromRecovery$(aid, aggregateData, av)
        ).pipe(
            tap(() => ConsoleLogger.i(`GeneratorES.handleGeneratorModified: ${data.modType}: aid=${aid}, timestamp=${timestamp}`))
        )
    }
}


/**
 * @returns {GeneratorES}
 */
module.exports = () => {
    if (!instance) {
        instance = new GeneratorES();
        ConsoleLogger.i(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};