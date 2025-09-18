import React, {useRef} from 'react';
import {FusePageCarded} from '@fuse';
import { useSelector } from 'react-redux';
import withReducer from 'app/store/withReducer';
import GeneratorsTable from './GeneratorsTable';
import GeneratorsHeader from './GeneratorsHeader';
import reducer from '../store/reducers';
import {FuseLoading} from '@fuse';

import GeneratorsFilterHeader from './GeneratorsFilterHeader';
import GeneratorsFilterContent from './GeneratorsFilterContent';

function Generators()
{
    const user = useSelector(({ auth }) => auth.user);
    const pageLayout = useRef(null);

    
    if(!user.selectedOrganization){
        return (<FuseLoading />);
    }

    return (
        <FusePageCarded
            classes={{
                content: "flex",
                //header : "min-h-72 h-72 sm:h-136 sm:min-h-136" // default tall/short header
                header: "min-h-72 h-72 sm:h-72 sm:min-h-72" // short header always
            }}
            header={
                <GeneratorsHeader pageLayout={pageLayout} />
            }
            content={
                <GeneratorsTable/>
            }

            leftSidebarHeader={
                <GeneratorsFilterHeader/>
            }
            leftSidebarContent={
                <GeneratorsFilterContent/>
            }
            ref={pageLayout}
            innerScroll
            leftSidebarVariant='permanent'
        />
    );
}

export default withReducer('GeneratorManagement', reducer)(Generators);
