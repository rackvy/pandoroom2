import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { toast } from '../components/ui/Toast';
import { confirm } from '../components/ui/ConfirmDialog';
import styles from './EmployeesPage.module.css';

interface Employee {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: 'ADMIN' | 'MANAGER' | 'ANIMATOR' | 'WAITER' | 'COOK';
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
  ANIMATOR: 'Аниматор',
  WAITER: 'Официант',
  COOK: 'Повар',
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#B6009D',
  MANAGER: '#A0BF39',
  ANIMATOR: '#FF9800',
  WAITER: '#2196F3',
  COOK: '#795548',
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [filterRole, setFilterRole] = useState<string>('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'MANAGER' as Employee['role'],
    password: '',
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await api.patch(`/api/admin/employees/${editingEmployee.id}`, {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone || null,
          role: formData.role,
        });
      } else {
        await api.post('/api/admin/employees', {
          ...formData,
          phone: formData.phone || '',
          position: ROLE_LABELS[formData.role],
        });
      }
      setShowForm(false);
      setEditingEmployee(null);
      resetForm();
      loadEmployees();
    } catch (error) {
      console.error('Failed to save employee:', error);
      toast.error('Ошибка сохранения сотрудника');
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      fullName: employee.fullName,
      email: employee.email,
      phone: employee.phone || '',
      role: employee.role,
      password: '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Удаление сотрудника',
      message: 'Вы уверены, что хотите удалить этого сотрудника?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/admin/employees/${id}`);
      toast.success('Сотрудник удален');
      loadEmployees();
    } catch (error) {
      console.error('Failed to delete employee:', error);
      toast.error('Ошибка удаления сотрудника');
    }
  };

  const handleToggleActive = async (employee: Employee) => {
    try {
      await api.patch(`/api/admin/employees/${employee.id}`, {
        isActive: !employee.isActive,
      });
      loadEmployees();
    } catch (error) {
      console.error('Failed to toggle active:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      role: 'MANAGER',
      password: '',
    });
  };

  const handleAddNew = () => {
    setEditingEmployee(null);
    resetForm();
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingEmployee(null);
    resetForm();
  };

  const filteredEmployees = filterRole
    ? employees.filter(e => e.role === filterRole)
    : employees;

  const activeCount = employees.filter(e => e.isActive).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Сотрудники</h1>
          <p className={styles.subtitle}>
            Всего: {employees.length} | Активных: {activeCount}
          </p>
        </div>
        <button className={styles.addButton} onClick={handleAddNew}>
          + Добавить сотрудника
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <select 
          value={filterRole} 
          onChange={(e) => setFilterRole(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">Все роли</option>
          {Object.entries(ROLE_LABELS).map(([role, label]) => (
            <option key={role} value={role}>{label}</option>
          ))}
        </select>
      </div>

      {/* Form */}
      {showForm && (
        <div className={styles.formContainer}>
          <h3>{editingEmployee ? 'Редактировать сотрудника' : 'Новый сотрудник'}</h3>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>ФИО *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  required
                  placeholder="Иванов Иван Иванович"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  placeholder="ivan@pandoroom.ru"
                />
              </div>
            </div>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Телефон</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+7 999 123 45 67"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Роль *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                  required
                >
                  {Object.entries(ROLE_LABELS).map(([role, label]) => (
                    <option key={role} value={role}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {!editingEmployee && (
              <div className={styles.formGroup}>
                <label>Пароль *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={!editingEmployee}
                  placeholder="Минимум 6 символов"
                  minLength={6}
                />
              </div>
            )}
            
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelButton} onClick={handleCancel}>
                Отмена
              </button>
              <button type="submit" className={styles.saveButton}>
                {editingEmployee ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className={styles.loading}>Загрузка...</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Email</th>
                <th>Телефон</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className={!employee.isActive ? styles.inactive : ''}>
                  <td className={styles.nameCell}>{employee.fullName}</td>
                  <td>{employee.email}</td>
                  <td>{employee.phone || '—'}</td>
                  <td>
                    <span 
                      className={styles.roleBadge}
                      style={{ backgroundColor: ROLE_COLORS[employee.role] }}
                    >
                      {ROLE_LABELS[employee.role]}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`${styles.statusToggle} ${employee.isActive ? styles.active : styles.inactive}`}
                      onClick={() => handleToggleActive(employee)}
                    >
                      {employee.isActive ? 'Активен' : 'Неактивен'}
                    </button>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button 
                        className={styles.editButton}
                        onClick={() => handleEdit(employee)}
                      >
                        Редактировать
                      </button>
                      <button 
                        className={styles.deleteButton}
                        onClick={() => handleDelete(employee.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredEmployees.length === 0 && (
            <div className={styles.emptyState}>
              {filterRole ? 'Нет сотрудников с выбранной ролью' : 'Нет сотрудников'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
