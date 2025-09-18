import { defer } from 'rxjs';
import { mergeMap, map } from 'rxjs/operators';

import graphqlService from '../../../../services/graphqlService';
import { GeneratorGeneratorListing, GeneratorDeleteGenerator } from '../../gql/Generator';

export const SET_GENERATORS = '[GENERATOR_MNG] SET GENERATORS';
export const SET_GENERATORS_PAGE = '[GENERATOR_MNG] SET GENERATORS PAGE';
export const SET_GENERATORS_ROWS_PER_PAGE = '[GENERATOR_MNG] SET GENERATORS ROWS PER PAGE';
export const SET_GENERATORS_ORDER = '[GENERATOR_MNG] SET GENERATORS ORDER';
export const SET_GENERATORS_FILTERS_ORGANIZATION_ID = '[GENERATOR_MNG] SET GENERATORS FILTERS ORGANIZATION_ID';
export const SET_GENERATORS_FILTERS_NAME = '[GENERATOR_MNG] SET GENERATORS FILTERS NAME';
export const SET_GENERATORS_FILTERS_ACTIVE = '[GENERATOR_MNG] SET GENERATORS FILTERS ACTIVE';

/**
 * Common function to generate the arguments for the GeneratorGeneratorListing query based on the user input
 * @param {Object} queryParams 
 */
function getListingQueryArguments({ filters: { name, organizationId, active }, order, page, rowsPerPage }) {
    const args = {
        "filterInput": { organizationId },
        "paginationInput": { "page": page, "count": rowsPerPage, "queryTotalResultCount": (page === 0) },
        "sortInput": order.id ? { "field": order.id, "asc": order.direction === "asc" } : undefined
    };
    if (name.trim().length > 0) {
        args.filterInput.name = name;
    }
    if (active !== null) {
        args.filterInput.active = active;
    }
    return args;
}

/**
 * Queries the Generator Listing based on selected filters, page and order
 * @param {{ filters, order, page, rowsPerPage }} queryParams
 */
export function getGenerators({ filters, order, page, rowsPerPage }) {
    const args = getListingQueryArguments({ filters, order, page, rowsPerPage });    
    return (dispatch) => graphqlService.client.query(GeneratorGeneratorListing(args)).then(result => {
        return dispatch({
            type: SET_GENERATORS,
            payload: result.data.GeneratorGeneratorListing
        });
    })
}

/**
 * Executes the mutation to remove the selected rows
 * @param {*} selectedForRemovalIds 
 * @param {*} param1 
 */
export function removeGenerators(selectedForRemovalIds, { filters, order, page, rowsPerPage }) {
    const deleteArgs = { ids: selectedForRemovalIds };
    const listingArgs = getListingQueryArguments({ filters, order, page, rowsPerPage });
    return (dispatch) => defer(() => graphqlService.client.mutate(GeneratorDeleteGenerator(deleteArgs))).pipe(
        mergeMap(() => defer(() => graphqlService.client.query(GeneratorGeneratorListing(listingArgs)))),
        map((result) =>
            dispatch({
                type: SET_GENERATORS,
                payload: result.data.GeneratorGeneratorListing
            })
        )
    ).toPromise();
}

/**
 * Set the listing page
 * @param {int} page 
 */
export function setGeneratorsPage(page) {
    return {
        type: SET_GENERATORS_PAGE,
        page
    }
}

/**
 * Set the number of rows to see per page
 * @param {*} rowsPerPage 
 */
export function setGeneratorsRowsPerPage(rowsPerPage) {
    return {
        type: SET_GENERATORS_ROWS_PER_PAGE,
        rowsPerPage
    }
}

/**
 * Set the table-column order
 * @param {*} order 
 */
export function setGeneratorsOrder(order) {
    return {
        type: SET_GENERATORS_ORDER,
        order
    }
}

/**
 * Set the name filter
 * @param {string} name 
 */
export function setGeneratorsFilterName(name) {    
    return {
        type: SET_GENERATORS_FILTERS_NAME,
        name
    }
}

/**
 * Set the filter active flag on/off/both
 * @param {boolean} active 
 */
export function setGeneratorsFilterActive(active) {
    return {
        type: SET_GENERATORS_FILTERS_ACTIVE,
        active
    }
}

/**
 * set the organizationId filter
 * @param {string} organizationId 
 */
export function setGeneratorsFilterOrganizationId(organizationId) {    
    return {
        type: SET_GENERATORS_FILTERS_ORGANIZATION_ID,
        organizationId
    }
}



