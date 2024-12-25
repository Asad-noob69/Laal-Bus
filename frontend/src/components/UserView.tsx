import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import io from 'socket.io-client';

// Connect to the backend
const socket = io(import.meta.env.VITE_BACKEND_URL);

interface DriverLocation {
  id: string;
  position: [number, number];
}

const UserView: React.FC = () => {
  const [driverLocations, setDriverLocations] = useState<DriverLocation[]>([]);

  useEffect(() => {
    // Listen for driver location updates
    socket.on('driverLocationUpdate', (data: DriverLocation) => {
      console.log('Received driver location update:', data); 
      setDriverLocations((prevLocations) => {
        // Update the driver's location if it already exists
        const updatedLocations = prevLocations.filter(
          (driver) => driver.id !== data.id
        );
        return [...updatedLocations, data];
      });
    });

    return () => {
      socket.off('driverLocationUpdate');
    };
  }, []);

  return (
    <div className="h-screen">
      <h2 className="text-2xl font-bold p-4">User View</h2>
      <MapContainer
        center={[24.8607, 67.0011]}
        zoom={13}
        style={{ height: 'calc(100% - 60px)' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {driverLocations.map((driver) => (
          <Marker key={driver.id} position={driver.position}>
            <Popup>Driver ID: {driver.id}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default UserView;