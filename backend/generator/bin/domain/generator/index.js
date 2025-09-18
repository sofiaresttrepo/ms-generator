"use strict";

const { empty, Observable } = require("rxjs");

const GeneratorCRUD = require("./GeneratorCRUD")();
const GeneratorES = require("./GeneratorES")();
const DataAcess = require("./data-access/");

module.exports = {
  /**
   * domain start workflow
   */
  start$: DataAcess.start$,
  /**
   * start for syncing workflow
   * @returns {Observable}
   */
  startForSyncing$: DataAcess.start$,
  /**
   * start for getting ready workflow
   * @returns {Observable}
   */
  startForGettingReady$: empty(),
  /**
   * Stop workflow
   * @returns {Observable}
   */
  stop$: DataAcess.stop$,
  /**
   * @returns {GeneratorCRUD}
   */
  GeneratorCRUD: GeneratorCRUD,
  /**
   * CRUD request processors Map
   */
  cqrsRequestProcessorMap: GeneratorCRUD.generateRequestProcessorMap(),
  /**
   * @returns {GeneratorES}
   */
  GeneratorES,
  /**
   * EventSoircing event processors Map
   */
  eventSourcingProcessorMap: GeneratorES.generateEventProcessorMap(),
};
