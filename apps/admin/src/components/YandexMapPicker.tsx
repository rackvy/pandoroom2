import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';
import styles from './YandexMapPicker.module.css';

interface YandexMapPickerProps {
  lat?: number;
  lng?: number;
  onLocationChange: (lat: number, lng: number) => void;
}

const DEFAULT_CENTER: [number, number] = [55.7558, 37.6173];
const DEFAULT_ZOOM = 12;

export default function YandexMapPicker({ lat, lng, onLocationChange }: YandexMapPickerProps) {
  const center: [number, number] = lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER;
  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY || undefined;

  function handleMapClick(e: any) {
    const coords = e.get('coords') as [number, number];
    if (coords && coords.length === 2) {
      onLocationChange(coords[0], coords[1]);
    }
  }

  return (
    <div className={styles.mapWrapper}>
      <YMaps query={apiKey ? { apikey: apiKey } : undefined}>
        <Map
          state={{ center, zoom: DEFAULT_ZOOM }}
          width="100%"
          height="300px"
          onClick={handleMapClick}
        >
          {lat != null && lng != null && (
            <Placemark
              geometry={[lat, lng]}
              options={{
                draggable: true,
                preset: 'islands#redDotIcon',
              }}
              onDragEnd={(e: any) => {
                const coords = (e.get('target') as any).geometry.getCoordinates();
                onLocationChange(coords[0], coords[1]);
              }}
            />
          )}
        </Map>
      </YMaps>
      {lat != null && lng != null && (
        <div className={styles.coords}>
          <span>Широта: {lat.toFixed(6)}</span>
          <span>Долгота: {lng.toFixed(6)}</span>
        </div>
      )}
    </div>
  );
}
