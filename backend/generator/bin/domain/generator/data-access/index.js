"use strict";

const Rx = require('rxjs');

const GeneratorDA = require("./GeneratorDA");

module.exports = {
  /**
   * Data-Access start workflow
   */
  start$: Rx.concat(GeneratorDA.start$()),
  /**
   * @returns {GeneratorDA}
   */
  GeneratorDA: GeneratorDA,
};
