"use strict";

let mongoDB = undefined;
const { map, mapTo, catchError } = require("rxjs/operators");
const { of, Observable, defer, throwError } = require("rxjs");

const { CustomError } = require("@nebulae/backend-node-tools").error;

const CollectionName = 'Vehicle';

class VehicleDA {
  static start$(mongoDbInstance) {
    return Observable.create(observer => {
      if (mongoDbInstance) {
        mongoDB = mongoDbInstance;
        observer.next(`${this.name} using given mongo instance`);
      } else {
        mongoDB = require("../../../tools/mongo-db/MongoDB").singleton();
        observer.next(`${this.name} using singleton system-wide mongo instance`);
      }
      
      // Verificar que la conexión esté establecida inmediatamente
      if (mongoDB && mongoDB.db) {
        observer.next(`${this.name} MongoDB connection verified`);
        observer.next(`${this.name} started`);
        observer.complete();
      } else {
        // Si no está listo, esperar un poco
        setTimeout(() => {
          if (mongoDB && mongoDB.db) {
            observer.next(`${this.name} MongoDB connection verified`);
            observer.next(`${this.name} started`);
            observer.complete();
          } else {
            observer.error(new Error(`${this.name} MongoDB connection not established`));
          }
        }, 1000);
      }
    });
  }

  static stop$() {
    return Observable.create(observer => {
      observer.next(`${this.name} stopped`);
      observer.complete();
    });
  }

  /**
   * Gets a vehicle by its id
   */
  static getVehicle$(id) {
    if (!mongoDB || !mongoDB.db) {
      return throwError(new Error('MongoDB not initialized. Please ensure the database connection is established.'));
    }
    
    const collection = mongoDB.db.collection(CollectionName);

    const query = {
      _id: id
    };
    return defer(() => collection.findOne(query)).pipe(
      map((res) => {
        return res !== null
          ? { ...res, id: res._id }
          : {}
      })
    );
  }

  static generateListingQuery(filter) {
    const query = {};
    if (filter.type) {
      query["type"] = { $regex: filter.type, $options: "i" };
    }
    if (filter.powerSource) {
      query["powerSource"] = filter.powerSource;
    }
    if (filter.year) {
      query["year"] = filter.year;
    }
    return query;
  }

  static getVehicleList$(filter = {}, pagination = {}, sortInput) {
    if (!mongoDB || !mongoDB.db) {
      return throwError(new Error('MongoDB not initialized. Please ensure the database connection is established.'));
    }
    
    const collection = mongoDB.db.collection(CollectionName);
    const { page = 0, count = 10 } = pagination;

    const query = this.generateListingQuery(filter);    
    const projection = { type: 1, powerSource: 1, hp: 1, year: 1, topSpeed: 1, timestamp: 1 };

    let cursor = collection
      .find(query, { projection })
      .skip(count * page)
      .limit(count);

    const sort = {};
    if (sortInput) {
      sort[sortInput.field] = sortInput.asc ? 1 : -1;
    } else {
      sort["timestamp"] = -1;
    }
    cursor = cursor.sort(sort);

    return mongoDB.extractAllFromMongoCursor$(cursor).pipe(
      map(res => ({ ...res, id: res._id }))
    );
  }

  static getVehicleSize$(filter = {}) {
    if (!mongoDB || !mongoDB.db) {
      return throwError(new Error('MongoDB not initialized. Please ensure the database connection is established.'));
    }
    
    const collection = mongoDB.db.collection(CollectionName);
    const query = this.generateListingQuery(filter);    
    return defer(() => collection.countDocuments(query));
  }

  /**
  * creates a new Vehicle 
  * @param {*} id Vehicle ID
  * @param {*} Vehicle properties
  */
  static createVehicle$(_id, properties) {
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.insertOne({
      _id,
      ...properties,
    })).pipe(
      map(({ insertedId }) => ({ id: insertedId, ...properties }))
    );
  }

  /**
  * modifies the Vehicle properties
  * @param {String} id  Vehicle ID
  * @param {*} Vehicle properties to update
  */
  static updateVehicle$(_id, properties) {
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() =>
      collection.findOneAndUpdate(
        { _id },
        {
          $set: {
            ...properties
          }
        },
        {
          returnOriginal: false,
        }
      )
    ).pipe(
      map(result => result && result.value ? { ...result.value, id: result.value._id } : undefined)
    );
  }

  /**
  * modifies the Vehicle properties
  * @param {String} id  Vehicle ID
  * @param {*} Vehicle properties to update
  */
  static updateVehicleFromRecovery$(_id, properties, av) {
    if (!mongoDB || !mongoDB.db) {
      return throwError(new Error('MongoDB not initialized. Please ensure the database connection is established.'));
    }
    
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() =>
      collection.updateOne(
        {
          _id,
        },
        { $set: { ...properties } },
        {
          returnOriginal: false,
          upsert: true
        }
      )
    ).pipe(
      map(result => result && result.value ? { ...result.value, id: result.value._id } : undefined)
    );
  }

  /**
  * modifies the Vehicle properties
  * @param {String} id  Vehicle ID
  * @param {*} Vehicle properties to update
  */
  static replaceVehicle$(_id, properties) {
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() =>
      collection.replaceOne(
        { _id },
        properties,
      )
    ).pipe(
      mapTo({ id: _id, ...properties })
    );
  }

  /**
    * deletes an Vehicle 
    * @param {*} _id  Vehicle ID
  */
  static deleteVehicle$(_id) {
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() =>
      collection.deleteOne({ _id })
    );
  }

  /**
    * deletes multiple Vehicle at once
    * @param {*} _ids  Vehicle IDs array
  */
  static deleteVehicles$(_ids) {
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() =>
      collection.deleteMany({ _id: { $in: _ids } })
    ).pipe(
      map(({ deletedCount }) => deletedCount > 0)
    );
  }

}

/**
 * @returns {VehicleDA}
 */
module.exports = VehicleDA;
