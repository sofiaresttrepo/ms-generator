# Vehicle Generator Configuration

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017
MONGODB_DATABASE=generator

# MQTT Configuration
MQTT_HOST=localhost
MQTT_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=

# WebSocket Configuration
WEBSOCKET_PORT=3001

# Microservice Configuration
MICROBACKEND_KEY=your-microbackend-key
PORT=3000

# Logging
LOG_LEVEL=info
```

## MQTT Broker Setup

1. Install and start an MQTT broker (e.g., Mosquitto):
   ```bash
   # Ubuntu/Debian
   sudo apt-get install mosquitto mosquitto-clients
   sudo systemctl start mosquitto
   sudo systemctl enable mosquitto
   
   # macOS with Homebrew
   brew install mosquitto
   brew services start mosquitto
   
   # Docker
   docker run -it -p 1883:1883 -p 9001:9001 eclipse-mosquitto
   ```

2. Configure authentication (optional):
   ```bash
   # Create password file
   sudo mosquitto_passwd -c /etc/mosquitto/passwd username
   
   # Update mosquitto.conf
   sudo nano /etc/mosquitto/mosquitto.conf
   ```
   Add:
   ```
   allow_anonymous false
   password_file /etc/mosquitto/passwd
   ```

## MongoDB Setup

1. Install MongoDB:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install mongodb
   
   # macOS with Homebrew
   brew install mongodb-community
   brew services start mongodb-community
   
   # Docker
   docker run -d -p 27017:27017 --name mongodb mongo
   ```

2. Create database and collections:
   ```javascript
   use generator
   db.createCollection("Vehicle")
   db.createCollection("processed_vehicles")
   ```

## Running the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the microservice:
   ```bash
   npm start
   ```

3. Access the frontend:
   - Open http://localhost:3000
   - Navigate to Vehicle Generator

## Performance Optimization

The application is optimized for high-frequency data generation:

- **RxJS Streams**: Uses `interval(50)` for 20 vehicles/second generation
- **Virtualization**: React-window for efficient rendering of large lists
- **Memoization**: React.memo and useCallback to prevent unnecessary re-renders
- **Throttling**: UI updates are throttled to 1 second intervals
- **Batch Processing**: MQTT events are processed in batches every second

## Monitoring

- Check MQTT topics: `fleet/vehicles/generated`
- Monitor MongoDB collections: `Vehicle`, `processed_vehicles`
- WebSocket updates: `fleet-statistics-updated`
