"use strict";

const uuidv4 = require("uuid/v4");
const { of, forkJoin, from, iif, throwError, Subject, interval, timer } = require("rxjs");
const { mergeMap, catchError, map, toArray, pluck, takeUntil, tap, bufferTime, filter } = require('rxjs/operators');
const crypto = require('crypto');

const Event = require("@nebulae/event-store").Event;
const { CqrsResponseHelper } = require('@nebulae/backend-node-tools').cqrs;
const { ConsoleLogger } = require('@nebulae/backend-node-tools').log;
const { CustomError, INTERNAL_SERVER_ERROR_CODE, PERMISSION_DENIED } = require("@nebulae/backend-node-tools").error;
const { brokerFactory } = require("@nebulae/backend-node-tools").broker;

const broker = brokerFactory();
const eventSourcing = require("../../tools/event-sourcing").eventSourcing;
const VehicleDA = require("./data-access/VehicleDA");

const READ_ROLES = ["GENERATOR_READ"];
const WRITE_ROLES = ["GENERATOR_WRITE"];
const REQUIRED_ATTRIBUTES = [];
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";
const MQTT_TOPIC = "fleet/vehicles/generated";

/**
 * Singleton instance
 * @type { VehicleCRUD }
 */
let instance;

class VehicleCRUD {
  constructor() {
    this.generationSubject = new Subject();
    this.stopGenerationSubject = new Subject();
    this.isGenerating = false;
    this.generationSubscription = null;
  }

  /**     
   * Generates and returns an object that defines the CQRS request handlers.
   * 
   * The map is a relationship of: AGGREGATE_TYPE VS { MESSAGE_TYPE VS  { fn: rxjsFunction, instance: invoker_instance } }
   * 
   * ## Example
   *  { "CreateUser" : { "somegateway.someprotocol.mutation.CreateUser" : {fn: createUser$, instance: classInstance } } }
   */
  generateRequestProcessorMap() {
    return {
      'Vehicle': {
        "emigateway.graphql.query.VehicleVehicleListing": { fn: instance.getVehicleVehicleListing$, instance, jwtValidation: { roles: READ_ROLES, attributes: REQUIRED_ATTRIBUTES } },
        "emigateway.graphql.query.VehicleVehicle": { fn: instance.getVehicle$, instance, jwtValidation: { roles: READ_ROLES, attributes: REQUIRED_ATTRIBUTES } },
        "emigateway.graphql.mutation.VehicleStartGeneration": { fn: instance.startGeneration$, instance, jwtValidation: { roles: WRITE_ROLES, attributes: REQUIRED_ATTRIBUTES } },
        "emigateway.graphql.mutation.VehicleStopGeneration": { fn: instance.stopGeneration$, instance, jwtValidation: { roles: WRITE_ROLES, attributes: REQUIRED_ATTRIBUTES } },
      }
    }
  };

  /**  
   * Gets the Vehicle list
   *
   * @param {*} args args
   */
  getVehicleVehicleListing$({ args }, authToken) {
    const { filterInput, paginationInput, sortInput } = args;
    const { queryTotalResultCount = false } = paginationInput || {};

    return forkJoin(
      VehicleDA.getVehicleList$(filterInput, paginationInput, sortInput).pipe(toArray()),
      queryTotalResultCount ? VehicleDA.getVehicleSize$(filterInput) : of(undefined),
    ).pipe(
      map(([listing, queryTotalResultCount]) => ({ listing, queryTotalResultCount })),
      mergeMap(rawResponse => CqrsResponseHelper.buildSuccessResponse$(rawResponse)),
      catchError(err => iif(() => err.name === 'MongoTimeoutError', throwError(err), CqrsResponseHelper.handleError$(err)))
    );
  }

  /**  
   * Gets the get Vehicle by id
   *
   * @param {*} args args
   */
  getVehicle$({ args }, authToken) {
    const { id } = args;
    return VehicleDA.getVehicle$(id).pipe(
      mergeMap(rawResponse => CqrsResponseHelper.buildSuccessResponse$(rawResponse)),
      catchError(err => iif(() => err.name === 'MongoTimeoutError', throwError(err), CqrsResponseHelper.handleError$(err)))
    );
  }

  /**
   * Start vehicle generation
   */
  startGeneration$({ root, args, jwt }, authToken) {
    if (this.isGenerating) {
      return of({ code: 400, message: "Generation is already running" }).pipe(
        mergeMap(response => CqrsResponseHelper.buildSuccessResponse$(response))
      );
    }

    this.isGenerating = true;
    const aggregateId = uuidv4();
    
    // Emit start event
    const startEvent = new Event({
      eventType: "VehicleGenerationStarted",
      eventTypeVersion: 1,
      aggregateType: "Vehicle",
      aggregateId,
      data: {
        status: "started",
        timestamp: Date.now()
      },
      user: authToken.preferred_username
    });

    return eventSourcing.emitEvent$(startEvent, { autoAcknowledgeKey: process.env.MICROBACKEND_KEY }).pipe(
      mergeMap(() => {
        // Start the generation process
        this.startGenerationProcess$();
        return CqrsResponseHelper.buildSuccessResponse$({ code: 200, message: "Generation started successfully" });
      }),
      catchError(err => CqrsResponseHelper.handleError$(err))
    );
  }

  /**
   * Stop vehicle generation
   */
  stopGeneration$({ root, args, jwt }, authToken) {
    if (!this.isGenerating) {
      return of({ code: 400, message: "Generation is not running" }).pipe(
        mergeMap(response => CqrsResponseHelper.buildSuccessResponse$(response))
      );
    }

    this.isGenerating = false;
    const aggregateId = uuidv4();
    
    // Emit stop event
    const stopEvent = new Event({
      eventType: "VehicleGenerationStopped",
      eventTypeVersion: 1,
      aggregateType: "Vehicle",
      aggregateId,
      data: {
        status: "stopped",
        timestamp: Date.now()
      },
      user: authToken.preferred_username
    });

    // Stop the generation process
    this.stopGenerationSubject.next(true);

    return eventSourcing.emitEvent$(stopEvent, { autoAcknowledgeKey: process.env.MICROBACKEND_KEY }).pipe(
      mergeMap(() => CqrsResponseHelper.buildSuccessResponse$({ code: 200, message: "Generation stopped successfully" })),
      catchError(err => CqrsResponseHelper.handleError$(err))
    );
  }

  /**
   * Start the vehicle generation process with RxJS
   */
  startGenerationProcess$() {
    // Clear any existing subscription
    if (this.generationSubscription) {
      this.generationSubscription.unsubscribe();
    }

    // Start generation with interval(50) and takeUntil
    this.generationSubscription = interval(50).pipe(
      takeUntil(this.stopGenerationSubject),
      tap(() => {
        const vehicle = this.generateRandomVehicle();
        this.publishVehicleGenerated$(vehicle);
      })
    ).subscribe({
      next: () => {
        // Vehicle generated and published
      },
      complete: () => {
        ConsoleLogger.i("Vehicle generation stopped");
        this.isGenerating = false;
      },
      error: (err) => {
        ConsoleLogger.e("Error in vehicle generation:", err);
        this.isGenerating = false;
      }
    });
  }

  /**
   * Generate a random vehicle
   */
  generateRandomVehicle() {
    const types = ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Convertible', 'Truck', 'Van'];
    const powerSources = ['Gasoline', 'Diesel', 'Electric', 'Hybrid', 'Hydrogen'];
    
    const vehicle = {
      type: types[Math.floor(Math.random() * types.length)],
      powerSource: powerSources[Math.floor(Math.random() * powerSources.length)],
      hp: Math.floor(Math.random() * 500) + 50, // 50-550 HP
      year: Math.floor(Math.random() * 25) + 2000, // 2000-2025
      topSpeed: Math.floor(Math.random() * 200) + 100 // 100-300 km/h
    };

    // Generate aid (hash) for idempotency
    const vehicleString = JSON.stringify(vehicle);
    const aid = crypto.createHash('sha256').update(vehicleString).digest('hex');

    return {
      ...vehicle,
      aid,
      timestamp: Date.now()
    };
  }

  /**
   * Publish vehicle generated event to MQTT
   */
  publishVehicleGenerated$(vehicle) {
    const event = {
      at: "Vehicle",
      et: "Generated",
      aid: vehicle.aid,
      timestamp: vehicle.timestamp,
      data: {
        type: vehicle.type,
        powerSource: vehicle.powerSource,
        hp: vehicle.hp,
        year: vehicle.year,
        topSpeed: vehicle.topSpeed
      }
    };

    // Publish to MQTT
    broker.send$(MQTT_TOPIC, "VehicleGenerated", event).subscribe({
      next: () => ConsoleLogger.i(`Vehicle published to MQTT: ${vehicle.aid}`),
      error: (err) => ConsoleLogger.e("Error publishing vehicle to MQTT:", err)
    });

    // CRITICAL: Publish to Materialized View for WebSocket notifications
    broker.send$(MATERIALIZED_VIEW_TOPIC, "VehicleVehicleGenerated", event).subscribe({
      next: () => ConsoleLogger.i(`Vehicle published to MV for WebSocket: ${vehicle.aid}`),
      error: (err) => ConsoleLogger.e("Error publishing vehicle to MV:", err)
    });

    // Emit event sourcing event
    const esEvent = new Event({
      eventType: "VehicleGenerated",
      eventTypeVersion: 1,
      aggregateType: "Vehicle",
      aggregateId: vehicle.aid,
      data: vehicle,
      user: "system"
    });

    eventSourcing.emitEvent$(esEvent, { autoAcknowledgeKey: process.env.MICROBACKEND_KEY }).subscribe({
      next: () => ConsoleLogger.i(`Vehicle event sourced: ${vehicle.aid}`),
      error: (err) => ConsoleLogger.e("Error event sourcing vehicle:", err)
    });
  }

  /**
   * Generate an Modified event 
   * @param {string} modType 'CREATE' | 'UPDATE' | 'DELETE'
   * @param {*} aggregateType 
   * @param {*} aggregateId 
   * @param {*} authToken 
   * @param {*} data 
   * @returns {Event}
   */
  buildAggregateMofifiedEvent(modType, aggregateType, aggregateId, authToken, data) {
    return new Event({
      eventType: `${aggregateType}Modified`,
      eventTypeVersion: 1,
      aggregateType: aggregateType,
      aggregateId,
      data: {
        modType,
        ...data
      },
      user: authToken.preferred_username
    })
  }
}

/**
 * @returns {VehicleCRUD}
 */
module.exports = () => {
  if (!instance) {
    instance = new VehicleCRUD();
    ConsoleLogger.i(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
