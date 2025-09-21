const VehicleDA = require('./VehicleDA');

module.exports = {
    VehicleDA,
    start$: VehicleDA.start$(),
    stop$: VehicleDA.stop$()
};
