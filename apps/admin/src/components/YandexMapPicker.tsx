import { Component, type ReactNode } from 'react';
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';
import styles from './YandexMapPicker.module.css';

/* ------------------------------------------------------------------ */
/*  ErrorBoundary — catches map init crashes                          */
/* ------------------------------------------------------------------ */

interface EBProps { children: ReactNode; fallback: ReactNode }
interface EBState { hasError: boolean }

class MapErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) { console.error('[YandexMapPicker]', err); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

interface YandexMapPickerProps {
  lat?: number;
  lng?: number;
  onLocationChange: (lat: number, lng: number) => void;
}

const DEFAULT_CENTER: [number, number] = [43.1155, 131.8855]; // Vladivostok
const DEFAULT_ZOOM = 12;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function YandexMapPicker({ lat, lng, onLocationChange }: YandexMapPickerProps) {
  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
  const hasKey = apiKey && apiKey.trim().length > 0;

  // If no API key — show manual input fallback
  if (!hasKey) {
    return (
      <div className={styles.mapWrapper}>
        <div className={styles.fallback}>
          <p className={styles.fallbackTitle}>Карта недоступна (нет API-ключа Яндекс.Карт)</p>
          <p className={styles.fallbackHint}>Введите координаты вручную или укажите VITE_YANDEX_MAPS_API_KEY в .env</p>
          <div className={styles.fallbackInputs}>
            <label>
              Широта
              <input
                type="number"
                step="any"
                placeholder="43.1155"
                value={lat ?? ''}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) onLocationChange(v, lng ?? DEFAULT_CENTER[1]);
                }}
              />
            </label>
            <label>
              Долгота
              <input
                type="number"
                step="any"
                placeholder="131.8855"
                value={lng ?? ''}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) onLocationChange(lat ?? DEFAULT_CENTER[0], v);
                }}
              />
            </label>
          </div>
          {lat != null && lng != null && (
            <div className={styles.coords}>
              <span>Широта: {Number(lat).toFixed(6)}</span>
              <span>Долгота: {Number(lng).toFixed(6)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const numLat = lat != null ? Number(lat) : undefined;
  const numLng = lng != null ? Number(lng) : undefined;
  const center: [number, number] = numLat != null && numLng != null ? [numLat, numLng] : DEFAULT_CENTER;

  function handleMapClick(e: any) {
    const coords = e.get('coords') as [number, number];
    if (coords && coords.length === 2) {
      onLocationChange(coords[0], coords[1]);
    }
  }

  return (
    <div className={styles.mapWrapper}>
      <MapErrorBoundary fallback={
        <div className={styles.fallback}>
          <p className={styles.fallbackTitle}>Ошибка загрузки карты</p>
          <p className={styles.fallbackHint}>Проверьте API-ключ Яндекс.Карт. Введите координаты вручную:</p>
          <div className={styles.fallbackInputs}>
            <label>
              Широта
              <input
                type="number"
                step="any"
                placeholder="43.1155"
                value={numLat ?? ''}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) onLocationChange(v, numLng ?? DEFAULT_CENTER[1]);
                }}
              />
            </label>
            <label>
              Долгота
              <input
                type="number"
                step="any"
                placeholder="131.8855"
                value={numLng ?? ''}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) onLocationChange(numLat ?? DEFAULT_CENTER[0], v);
                }}
              />
            </label>
          </div>
        </div>
      }>
        <YMaps query={{ apikey: apiKey }}>
          <Map
            state={{ center, zoom: DEFAULT_ZOOM }}
            width="100%"
            height="300px"
            onClick={handleMapClick}
          >
            {numLat != null && numLng != null && (
              <Placemark
                geometry={[numLat, numLng]}
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
      </MapErrorBoundary>
      {numLat != null && numLng != null && (
        <div className={styles.coords}>
          <span>Широта: {numLat.toFixed(6)}</span>
          <span>Долгота: {numLng.toFixed(6)}</span>
        </div>
      )}
    </div>
  );
}
