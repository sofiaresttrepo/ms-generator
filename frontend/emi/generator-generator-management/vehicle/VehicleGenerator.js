/* React core */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
    Button, 
    Card, 
    CardContent, 
    Typography, 
    Box, 
    Grid,
    Chip,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    IconButton,
    Tooltip
} from '@material-ui/core';
import { PlayArrow, Stop, Refresh } from '@material-ui/icons';
import { useMutation, useSubscription } from "@apollo/react-hooks";
import { useDispatch } from 'react-redux';
import * as AppActions from 'app/store/actions';
import { FixedSizeList as List } from 'react-window';

/* GQL queries to use */
import {
    VehicleStartGeneration,
    VehicleStopGeneration,
    onVehicleVehicleGenerated
} from "../gql/Vehicle";


/**
 * Memoized Vehicle Row Component for performance optimization
 */
const VehicleRow = React.memo(({ index, style, data }) => {
    const vehicle = data[index];
    if (!vehicle) return null;
    
    return (
        <div style={style}>
            <TableRow hover>
                <TableCell>{vehicle.aid}</TableCell>
                <TableCell>{vehicle.type}</TableCell>
                <TableCell>{vehicle.powerSource}</TableCell>
                <TableCell>{vehicle.hp}</TableCell>
                <TableCell>{vehicle.year}</TableCell>
                <TableCell>{vehicle.topSpeed}</TableCell>
                <TableCell>{new Date(vehicle.timestamp).toLocaleTimeString()}</TableCell>
            </TableRow>
        </div>
    );
});

function VehicleGenerator() {
    const dispatch = useDispatch();
    const [isGenerating, setIsGenerating] = useState(false);
    const [vehicles, setVehicles] = useState([]);
    const [stats, setStats] = useState({
        totalGenerated: 0,
        lastGenerated: null
    });
    
    // Performance optimization: throttle updates to max once per second
    const lastUpdateRef = useRef(0);
    const updateThrottleRef = useRef(1000); // 1 second throttle

    // GraphQL mutations
    const [startGeneration] = useMutation(VehicleStartGeneration().mutation);
    const [stopGeneration] = useMutation(VehicleStopGeneration().mutation);

    // GraphQL subscription for real-time updates
    const { data: subscriptionData } = useSubscription(onVehicleVehicleGenerated().query);

    // Handle real-time vehicle updates with throttling
    useEffect(() => {
        if (subscriptionData && subscriptionData.VehicleVehicleGenerated) {
            const now = Date.now();
            
            // Throttle updates to max once per second for performance
            if (now - lastUpdateRef.current >= updateThrottleRef.current) {
                const newVehicle = subscriptionData.VehicleVehicleGenerated;
                setVehicles(prev => [newVehicle, ...prev.slice(0, 99)]); // Keep last 100 vehicles
                setStats(prev => ({
                    totalGenerated: prev.totalGenerated + 1,
                    lastGenerated: new Date().toLocaleTimeString()
                }));
                lastUpdateRef.current = now;
            }
        }
    }, [subscriptionData]);

    // Start generation
    const handleStartGeneration = useCallback(async () => {
        try {
            await startGeneration();
            setIsGenerating(true);
            dispatch(AppActions.showMessage({
                message: "Vehicle generation started",
                variant: 'success'
            }));
        } catch (error) {
            dispatch(AppActions.showMessage({
                message: error.message || "Error starting generation",
                variant: 'error'
            }));
        }
    }, [startGeneration, dispatch]);

    // Stop generation
    const handleStopGeneration = useCallback(async () => {
        try {
            await stopGeneration();
            setIsGenerating(false);
            dispatch(AppActions.showMessage({
                message: "Vehicle generation stopped",
                variant: 'info'
            }));
        } catch (error) {
            dispatch(AppActions.showMessage({
                message: error.message || "Error stopping generation",
                variant: 'error'
            }));
        }
    }, [stopGeneration, dispatch]);

    // Clear vehicles
    const handleClearVehicles = useCallback(() => {
        setVehicles([]);
        setStats(prev => ({ ...prev, totalGenerated: 0 }));
    }, []);

    return (
        <Box p={3}>
            <Grid container spacing={3}>
                {/* Header */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h4" gutterBottom>
                                🚗 Vehicle Generator
                            </Typography>
                            <Typography variant="body1" paragraph>
                                Generate vehicles in real-time and see them appear instantly in the fleet dashboard.
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Controls */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2} mb={2}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<PlayArrow />}
                                    onClick={handleStartGeneration}
                                    disabled={isGenerating}
                                >
                                    Start Generation
                                </Button>
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    startIcon={<Stop />}
                                    onClick={handleStopGeneration}
                                    disabled={!isGenerating}
                                >
                                    Stop Generation
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<Refresh />}
                                    onClick={handleClearVehicles}
                                >
                                    Clear List
                                </Button>
                            </Box>
                            
                            {/* Status */}
                            <Box display="flex" gap={2} flexWrap="wrap">
                                <Chip
                                    label={isGenerating ? "Generating..." : "Stopped"}
                                    color={isGenerating ? "primary" : "default"}
                                    variant="outlined"
                                />
                                <Chip
                                    label={`Total: ${stats.totalGenerated}`}
                                    color="secondary"
                                    variant="outlined"
                                />
                                {stats.lastGenerated && (
                                    <Chip
                                        label={`Last: ${stats.lastGenerated}`}
                                        color="default"
                                        variant="outlined"
                                    />
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Vehicle List - Virtualized for Performance */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Generated Vehicles (Last 100) - Virtualized List
                            </Typography>
                            <Paper style={{ height: 400, width: '100%' }}>
                                {vehicles.length > 0 ? (
                                    <>
                                        {/* Table Header */}
                                        <Table stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>ID</TableCell>
                                                    <TableCell>Type</TableCell>
                                                    <TableCell>Power Source</TableCell>
                                                    <TableCell>HP</TableCell>
                                                    <TableCell>Year</TableCell>
                                                    <TableCell>Top Speed</TableCell>
                                                    <TableCell>Time</TableCell>
                                                </TableRow>
                                            </TableHead>
                                        </Table>
                                        {/* Virtualized List */}
                                        <List
                                            height={320} // Height minus header
                                            itemCount={Math.min(vehicles.length, 100)}
                                            itemSize={48} // Row height
                                            itemData={vehicles}
                                            overscanCount={5} // Render 5 extra items for smooth scrolling
                                        >
                                            {VehicleRow}
                                        </List>
                                    </>
                                ) : (
                                    <Box 
                                        display="flex" 
                                        alignItems="center" 
                                        justifyContent="center" 
                                        height="100%"
                                    >
                                        <Typography variant="body2" color="textSecondary">
                                            No vehicles generated yet. Click "Start Generation" to begin.
                                        </Typography>
                                    </Box>
                                )}
                            </Paper>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Instructions */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                📋 Instructions
                            </Typography>
                            <Typography variant="body2" paragraph>
                                1. Click <strong>"Start Generation"</strong> to begin generating vehicles
                            </Typography>
                            <Typography variant="body2" paragraph>
                                2. Vehicles will be generated every 50ms and appear in the table above
                            </Typography>
                            <Typography variant="body2" paragraph>
                                3. Open the <strong>Fleet Dashboard</strong> in ms-reporter (port 4001) to see real-time statistics
                            </Typography>
                            <Typography variant="body2" paragraph>
                                4. Click <strong>"Stop Generation"</strong> to stop the process
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

export default VehicleGenerator;