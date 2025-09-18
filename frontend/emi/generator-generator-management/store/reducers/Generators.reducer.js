import * as Actions from '../actions';

const initialState = {
    data: [],
    totalDataCount: 0,
    page: 0,
    rowsPerPage: 10,
    order: {
        direction: 'asc',
        id: null
    },
    filters: {
        name: '',
        active: null,
        organizationId: undefined
    }
};

const generatorsReducer = function (state = initialState, action) {
    switch (action.type) {
        case Actions.SET_GENERATORS:
            {
                const { listing, queryTotalResultCount } = action.payload;
                return {
                    ...state,
                    data: listing,
                    totalDataCount: queryTotalResultCount ? queryTotalResultCount : state.totalDataCount,
                };
            }
        case Actions.SET_GENERATORS_PAGE:
            {
                return {
                    ...state,
                    page: action.page
                };
            }
        case Actions.SET_GENERATORS_ROWS_PER_PAGE:
            {
                return {
                    ...state,
                    rowsPerPage: action.rowsPerPage
                };
            }
        case Actions.SET_GENERATORS_ORDER:
            {
                return {
                    ...state,
                    order: action.order
                };
            }
        case Actions.SET_GENERATORS_FILTERS_ORGANIZATION_ID:
            {
                return {
                    ...state,
                    filters: { ...state.filters, organizationId: action.organizationId }
                };
            }
        case Actions.SET_GENERATORS_FILTERS_NAME:
            {
                return {
                    ...state,
                    filters: { ...state.filters, name: action.name }
                };
            }
        case Actions.SET_GENERATORS_FILTERS_ACTIVE:
            {
                return {
                    ...state,
                    filters: { ...state.filters, active: action.active }
                };
            }
        default:
            {
                return state;
            }
    }
};

export default generatorsReducer;
