import { useState, useEffect } from 'react';
import { getBranches, getTableZones, getTables, createBranch, updateBranch, deleteBranch, createTableZone, updateTableZone, deleteTableZone, createTable, updateTable, deleteTable, type Branch, type TableZone, type Table } from '../api/catalog';
import styles from './SettingsPage.module.css';

const ZONE_KEYS = [
  { value: 'CAFE', label: 'Кафе' },
  { value: 'LOUNGE', label: 'Лаунж' },
  { value: 'KIDS', label: 'Детская зона' },
] as const;

export default function SettingsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [zones, setZones] = useState<TableZone[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'branches' | 'zones' | 'tables'>('branches');

  // Forms
  const [branchForm, setBranchForm] = useState({ name: '', city: '', address: '', phone: '', email: '' });
  const [zoneForm, setZoneForm] = useState<{ key: 'CAFE' | 'LOUNGE' | 'KIDS'; name: string; sortOrder: number }>({ key: 'CAFE', name: '', sortOrder: 0 });
  const [tableForm, setTableForm] = useState({ zoneId: '', title: '', capacity: '', sortOrder: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      loadZones(selectedBranch.id);
      loadTables(selectedBranch.id);
    }
  }, [selectedBranch]);

  async function loadBranches() {
    const data = await getBranches();
    setBranches(data);
    if (data.length > 0 && !selectedBranch) {
      setSelectedBranch(data[0]);
    }
  }

  async function loadZones(branchId: string) {
    try {
      const data = await getTableZones(branchId);
      setZones(data);
    } catch {
      setZones([]);
    }
  }

  async function loadTables(branchId: string) {
    try {
      const data = await getTables(branchId);
      setTables(data);
    } catch {
      setTables([]);
    }
  }

  // Branch handlers
  async function handleSaveBranch(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const branchData = {
        ...branchForm,
        sortOrder: 0,
        isActive: true,
        // Default zone flags
        hasCafe: true,
        hasLounge: false,
        hasKids: false,
        hasQuests: false,
        hasVR: false,
        hasLava: false,
        hasLaserTag: false,
      };
      if (editingId) {
        await updateBranch(editingId, branchData);
      } else {
        await createBranch(branchData);
      }
      setBranchForm({ name: '', city: '', address: '', phone: '', email: '' });
      setEditingId(null);
      await loadBranches();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteBranch(id: string) {
    if (!confirm('Удалить филиал?')) return;
    await deleteBranch(id);
    await loadBranches();
    if (selectedBranch?.id === id) {
      setSelectedBranch(null);
    }
  }

  // Zone handlers
  async function handleSaveZone(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBranch) return;
    setIsLoading(true);
    try {
      if (editingId) {
        await updateTableZone(editingId, { ...zoneForm, branchId: selectedBranch.id, isActive: true });
      } else {
        await createTableZone({ ...zoneForm, branchId: selectedBranch.id, isActive: true });
      }
      setZoneForm({ key: 'CAFE', name: '', sortOrder: 0 });
      setEditingId(null);
      await loadZones(selectedBranch.id);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteZone(id: string) {
    if (!confirm('Удалить зал?')) return;
    await deleteTableZone(id);
    if (selectedBranch) await loadZones(selectedBranch.id);
  }

  // Table handlers
  async function handleSaveTable(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBranch) return;
    setIsLoading(true);
    try {
      const data = {
        zoneId: tableForm.zoneId,
        title: tableForm.title,
        capacity: tableForm.capacity ? parseInt(tableForm.capacity) : null,
        sortOrder: tableForm.sortOrder,
        branchId: selectedBranch.id,
        isActive: true,
      };
      if (editingId) {
        await updateTable(editingId, data);
      } else {
        await createTable(data);
      }
      setTableForm({ zoneId: '', title: '', capacity: '', sortOrder: 0 });
      setEditingId(null);
      await loadTables(selectedBranch.id);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteTable(id: string) {
    if (!confirm('Удалить стол?')) return;
    await deleteTable(id);
    if (selectedBranch) await loadTables(selectedBranch.id);
  }

  const getZoneBadgeClass = (key: string) => {
    switch (key) {
      case 'CAFE': return styles.zoneBadgeCAFE;
      case 'LOUNGE': return styles.zoneBadgeLOUNGE;
      case 'KIDS': return styles.zoneBadgeKIDS;
      default: return styles.zoneBadge;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Настройки</h2>
        <p className={styles.subtitle}>Управление филиалами, залами и столами</p>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={activeTab === 'branches' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('branches')}>
          🏢 Филиалы
        </button>
        <button className={activeTab === 'zones' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('zones')} disabled={!selectedBranch}>
          🏛️ Залы
        </button>
        <button className={activeTab === 'tables' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('tables')} disabled={!selectedBranch}>
          🪑 Столы
        </button>
      </div>

      {/* Branch Selector */}
      {activeTab !== 'branches' && (
        <div className={styles.branchSelector}>
          <label>📍 Филиал:</label>
          <select value={selectedBranch?.id || ''} onChange={(e) => {
            const branch = branches.find(b => b.id === e.target.value);
            setSelectedBranch(branch || null);
          }}>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      {/* Branches Tab */}
      {activeTab === 'branches' && (
        <div className={styles.section}>
          <h3>🏢 Филиалы</h3>
          <form onSubmit={handleSaveBranch} className={styles.form}>
            <input placeholder="Название филиала" value={branchForm.name} onChange={e => setBranchForm({...branchForm, name: e.target.value})} required />
            <input placeholder="Город" value={branchForm.city} onChange={e => setBranchForm({...branchForm, city: e.target.value})} required />
            <input placeholder="Адрес" value={branchForm.address} onChange={e => setBranchForm({...branchForm, address: e.target.value})} required />
            <input placeholder="Телефон" value={branchForm.phone} onChange={e => setBranchForm({...branchForm, phone: e.target.value})} />
            <input placeholder="Email" value={branchForm.email} onChange={e => setBranchForm({...branchForm, email: e.target.value})} />
            <button type="submit" disabled={isLoading}>{editingId ? '💾 Обновить' : '➕ Добавить филиал'}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setBranchForm({ name: '', city: '', address: '', phone: '', email: '' }); }}>❌ Отмена</button>}
          </form>

          <table className={styles.table}>
            <thead>
              <tr><th>Название</th><th>Город</th><th>Адрес</th><th>Телефон</th><th>Действия</th></tr>
            </thead>
            <tbody>
              {branches.map(b => (
                <tr key={b.id}>
                  <td><strong>{b.name}</strong></td>
                  <td>{b.city}</td>
                  <td>{b.address}</td>
                  <td>{b.phone || '-'}</td>
                  <td>
                    <button onClick={() => { setEditingId(b.id); setBranchForm({ name: b.name, city: b.city, address: b.address, phone: b.phone, email: b.email }); }}>✏️ Изменить</button>
                    <button onClick={() => handleDeleteBranch(b.id)}>🗑️ Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Zones Tab */}
      {activeTab === 'zones' && selectedBranch && (
        <div className={styles.section}>
          <h3>🏛️ Залы — {selectedBranch.name}</h3>
          <form onSubmit={handleSaveZone} className={styles.form}>
            <select value={zoneForm.key} onChange={e => setZoneForm({...zoneForm, key: e.target.value as any})}>
              {ZONE_KEYS.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
            </select>
            <input placeholder="Название зала" value={zoneForm.name} onChange={e => setZoneForm({...zoneForm, name: e.target.value})} required />
            <input type="number" placeholder="Порядок отображения" value={zoneForm.sortOrder} onChange={e => setZoneForm({...zoneForm, sortOrder: parseInt(e.target.value) || 0})} />
            <button type="submit" disabled={isLoading}>{editingId ? '💾 Обновить' : '➕ Добавить зал'}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setZoneForm({ key: 'CAFE', name: '', sortOrder: 0 }); }}>❌ Отмена</button>}
          </form>

          <table className={styles.table}>
            <thead>
              <tr><th>Тип</th><th>Название</th><th>Порядок</th><th>Действия</th></tr>
            </thead>
            <tbody>
              {zones.map(z => (
                <tr key={z.id}>
                  <td><span className={getZoneBadgeClass(z.key)}>{ZONE_KEYS.find(k => k.value === z.key)?.label || z.key}</span></td>
                  <td><strong>{z.name}</strong></td>
                  <td>{z.sortOrder}</td>
                  <td>
                    <button onClick={() => { setEditingId(z.id); setZoneForm({ key: z.key, name: z.name, sortOrder: z.sortOrder }); }}>✏️ Изменить</button>
                    <button onClick={() => handleDeleteZone(z.id)}>🗑️ Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tables Tab */}
      {activeTab === 'tables' && selectedBranch && (
        <div className={styles.section}>
          <h3>🪑 Столы — {selectedBranch.name}</h3>
          <form onSubmit={handleSaveTable} className={styles.form}>
            <select value={tableForm.zoneId} onChange={e => setTableForm({...tableForm, zoneId: e.target.value})} required>
              <option value="">Выберите зал</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
            <input placeholder="Название стола (например: Стол 1, VIP-зона)" value={tableForm.title} onChange={e => setTableForm({...tableForm, title: e.target.value})} required />
            <input type="number" placeholder="Вместимость (человек)" value={tableForm.capacity} onChange={e => setTableForm({...tableForm, capacity: e.target.value})} />
            <input type="number" placeholder="Порядок отображения" value={tableForm.sortOrder} onChange={e => setTableForm({...tableForm, sortOrder: parseInt(e.target.value) || 0})} />
            <button type="submit" disabled={isLoading}>{editingId ? '💾 Обновить' : '➕ Добавить стол'}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setTableForm({ zoneId: '', title: '', capacity: '', sortOrder: 0 }); }}>❌ Отмена</button>}
          </form>

          <table className={styles.table}>
            <thead>
              <tr><th>Зал</th><th>Название</th><th>Вместимость</th><th>Порядок</th><th>Действия</th></tr>
            </thead>
            <tbody>
              {tables.map(t => (
                <tr key={t.id}>
                  <td><span className={getZoneBadgeClass(zones.find(z => z.id === t.zoneId)?.key || '')}>{zones.find(z => z.id === t.zoneId)?.name || '-'}</span></td>
                  <td><strong>{t.title}</strong></td>
                  <td>{t.capacity ? `${t.capacity} чел.` : '-'}</td>
                  <td>{t.sortOrder}</td>
                  <td>
                    <button onClick={() => { setEditingId(t.id); setTableForm({ zoneId: t.zoneId, title: t.title, capacity: t.capacity?.toString() || '', sortOrder: t.sortOrder }); }}>✏️ Изменить</button>
                    <button onClick={() => handleDeleteTable(t.id)}>🗑️ Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
