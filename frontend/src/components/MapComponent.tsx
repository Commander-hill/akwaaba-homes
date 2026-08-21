'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BedDouble } from 'lucide-react';

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icon for properties
const propertyIcon = new L.Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const poiIcon = new L.Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Property {
  id: string;
  title: string;
  price: number;
  latitude?: number | null;
  longitude?: number | null;
  images?: string[];
}

interface MapComponentProps {
  mode: 'picker' | 'view' | 'multiple';
  center?: [number, number]; // [lat, lng]
  zoom?: number;
  // For picker mode
  onLocationSelect?: (lat: number, lng: number) => void;
  selectedLocation?: [number, number] | null;
  // For single view mode
  property?: Property;
  // For multiple view mode
  properties?: Property[];
  // For POIs (Points of Interest)
  pois?: { name: string; lat: number; lng: number }[];
}

// Component to handle clicking on the map in picker mode
function LocationPicker({ onLocationSelect, selectedLocation }: { onLocationSelect?: (lat: number, lng: number) => void, selectedLocation: [number, number] | null }) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return selectedLocation === null ? null : (
    <Marker position={selectedLocation} icon={propertyIcon}>
      <Popup>Selected Location</Popup>
    </Marker>
  );
}

// Component to dynamically fit bounds for multiple properties
function FitBounds({ properties, center }: { properties: Property[], center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    if (properties.length > 0) {
      const validProps = properties.filter(p => p.latitude && p.longitude);
      if (validProps.length > 0) {
        const bounds = L.latLngBounds(validProps.map(p => [p.latitude as number, p.longitude as number]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } else {
      map.setView(center, 12);
    }
  }, [properties, map, center]);

  return null;
}

export default function MapComponent({ 
  mode, 
  center = [5.6037, -0.1870], // Default to Accra, Ghana 
  zoom = 13, 
  onLocationSelect, 
  selectedLocation,
  property,
  properties = [],
  pois = []
}: MapComponentProps) {
  
  // Set default center based on provided property or properties if any
  const defaultCenter = (mode === 'view' && property?.latitude && property?.longitude) 
    ? [property.latitude, property.longitude] as [number, number] 
    : center;

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={zoom} 
        scrollWheelZoom={mode !== 'view'} // Disable scroll zoom on single view to not annoy users scrolling the page
        style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mode === 'picker' && (
          <LocationPicker onLocationSelect={onLocationSelect} selectedLocation={selectedLocation || null} />
        )}

        {mode === 'view' && property?.latitude && property?.longitude && (
          <Marker position={[property.latitude, property.longitude]} icon={propertyIcon}>
            <Popup className="property-popup">
              <div className="font-bold text-sm">{property.title}</div>
              <div className="text-[var(--primary)] font-bold">GHS {property.price.toLocaleString()}</div>
            </Popup>
          </Marker>
        )}

        {mode === 'multiple' && (
          <>
            <FitBounds properties={properties} center={center} />
            {properties.map(prop => {
              if (!prop.latitude || !prop.longitude) return null;
              return (
                <Marker key={prop.id} position={[prop.latitude, prop.longitude]} icon={propertyIcon}>
                  <Popup className="min-w-[200px]">
                    <div className="flex flex-col gap-2">
                      <div className="h-24 bg-slate-100 rounded-md overflow-hidden relative">
                        {prop.images && prop.images.length > 0 ? (
                          <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400"><BedDouble /></div>
                        )}
                      </div>
                      <div className="font-bold text-sm line-clamp-1">{prop.title}</div>
                      <div className="text-[var(--primary)] font-bold">GHS {prop.price.toLocaleString()}</div>
                      <a 
                        href={`/properties/${prop.id}`}
                        className="block text-center bg-[var(--primary)] text-white py-1.5 rounded-lg text-xs font-bold hover:bg-[var(--primary-hover)] transition-colors mt-1"
                      >
                        View Details
                      </a>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </>
        )}

        {pois.map((poi, idx) => (
          <Marker key={idx} position={[poi.lat, poi.lng]} icon={poiIcon}>
            <Popup>
              <div className="font-bold text-sm text-green-700">{poi.name}</div>
              <div className="text-xs text-slate-500">Point of Interest</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
