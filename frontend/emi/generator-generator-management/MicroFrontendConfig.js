import React from 'react';
import { Redirect } from 'react-router-dom';
import i18n from './i18n'

const auth = ["GENERATOR_READ"];

export const MicroFrontendConfig = {
    settings: {
        layout: {}
    },
    auth,
    routes: [
        { 
            path: '/generator-mng/generators/:generatorId/:generatorHandle?',
            component: React.lazy(() => import('./generator/Generator'))
        },
        {
            path: '/generator-mng/generators',
            component: React.lazy(() => import('./generators/Generators'))
        },
        {
            path: '/generator-mng',
            component: () => <Redirect to="/generator-mng/generators" />
        }
    ],
    navigationConfig: [
        {
            'id': 'settings',
            'type': 'collapse',
            'icon': 'settings',
            'priority': 100,
            children: [{
                'id': 'generator-generator-management',
                'type': 'item',
                'icon': 'business',
                'url': '/generator-mng',
                'priority': 2000,
                auth
            }]
        }
    ],
    i18nLocales: i18n.locales
};

