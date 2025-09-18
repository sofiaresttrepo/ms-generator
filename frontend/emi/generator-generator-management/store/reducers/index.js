import {combineReducers} from 'redux';
import generators from './Generators.reducer';

const reducer = combineReducers({
    generators,
});

export default reducer;
