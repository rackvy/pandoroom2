import { useState, useEffect, useRef } from 'react';
import { getClients, type Client } from '../../api/clients';
import styles from './ClientPicker.module.css';

export interface ClientPickerValue {
  clientId: string | null;
  clientName: string;
  clientPhone: string;
}

interface ClientPickerProps {
  value: ClientPickerValue;
  onChange: (value: ClientPickerValue) => void;
  disabled?: boolean;
}

export default function ClientPicker({ value, onChange, disabled }: ClientPickerProps) {
  const [results, setResults] = useState<Client[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search clients as the phone is typed (min 3 chars). Skipped when a client is already picked.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.clientId) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const query = value.clientPhone.replace(/\D/g, '');
    if (query.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await getClients(query, 1, 8);
        setResults(res.clients);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value.clientPhone, value.clientId]);

  // Close the dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (client: Client) => {
    onChange({ clientId: client.id, clientName: client.name, clientPhone: client.phone });
    setIsOpen(false);
  };

  const handlePhoneChange = (phone: string) => {
    // Editing the phone manually clears any matched client
    onChange({ clientId: null, clientName: value.clientName, clientPhone: phone });
  };

  const handleNameChange = (name: string) => {
    onChange({ clientId: value.clientId, clientName: name, clientPhone: value.clientPhone });
  };

  const handleClear = () => {
    onChange({ clientId: null, clientName: '', clientPhone: '' });
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div className={styles.picker} ref={containerRef}>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Телефон</label>
          <input
            type="tel"
            className={styles.input}
            value={value.clientPhone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onFocus={() => {
              if (results.length > 0 && !value.clientId) setIsOpen(true);
            }}
            placeholder="Введите телефон"
            disabled={disabled}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Имя</label>
          <input
            type="text"
            className={styles.input}
            value={value.clientName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Имя клиента"
            disabled={disabled}
          />
        </div>
      </div>

      {value.clientId && (
        <div className={styles.matched}>
          <span className={styles.matchedText}>✓ Клиент найден в базе</span>
          <button type="button" className={styles.clearBtn} onClick={handleClear} disabled={disabled}>
            Очистить
          </button>
        </div>
      )}

      {isOpen && !value.clientId && (
        <div className={styles.dropdown}>
          {isSearching && <div className={styles.dropdownEmpty}>Поиск…</div>}
          {!isSearching && results.length === 0 && (
            <div className={styles.dropdownEmpty}>Не найден — при сохранении будет создан новый</div>
          )}
          {!isSearching &&
            results.map((c) => (
              <button key={c.id} type="button" className={styles.dropdownItem} onClick={() => handleSelect(c)}>
                <span className={styles.dropdownName}>{c.name}</span>
                <span className={styles.dropdownPhone}>{c.phone}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
