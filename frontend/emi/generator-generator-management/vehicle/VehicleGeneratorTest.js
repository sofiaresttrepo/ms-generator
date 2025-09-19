/* React core */
import React from 'react';
import { Button, Card, CardContent, Typography, Box } from '@material-ui/core';

function VehicleGeneratorTest() {
    return (
        <Box p={3}>
            <Card>
                <CardContent>
                    <Typography variant="h4" gutterBottom>
                        🚗 Vehicle Generator - Test View
                    </Typography>
                    <Typography variant="body1" paragraph>
                        Esta es una vista de prueba para verificar que la ruta funciona correctamente.
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Si puedes ver esta página, significa que la configuración de rutas está funcionando.
                    </Typography>
                    <Box mt={2}>
                        <Button variant="contained" color="primary">
                            Test Button
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}

export default VehicleGeneratorTest;
