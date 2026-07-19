import { useState } from 'react';
import { getFoodReport, type FoodReport } from '../api/reports';
import { useBranchSelection } from '../hooks/useBranchSelection';
import { toast } from '../components/ui/Toast';
import styles from './ReportsPage.module.css';

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ReportsPage() {
  const [date, setDate] = useState(getTodayString());
  const { branches, branchId, setBranchId } = useBranchSelection();
  const [report, setReport] = useState<FoodReport | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!date) {
      toast.error('Укажите дату');
      return;
    }
    setLoading(true);
    try {
      const data = await getFoodReport(date, branchId || undefined);
      setReport(data);
      if (data.departments.length === 0) {
        toast.success('Отчёт сформирован (нет данных за выбранную дату)');
      } else {
        toast.success('Отчёт сформирован');
      }
    } catch (error: any) {
      console.error('Failed to load report:', error);
      toast.error(error.response?.data?.message || 'Ошибка формирования отчёта');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Отчёты</h1>
          <p className={styles.subtitle}>Отчёт по кухне / цехам</p>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Дата</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label>Филиал</label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">Все филиалы</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <button
          className={styles.generateButton}
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? 'Загрузка...' : 'Сформировать отчёт'}
        </button>
        {report && (
          <button className={styles.printButton} onClick={handlePrint}>
            Печать
          </button>
        )}
      </div>

      {loading && <div className={styles.loading}>Загрузка отчёта...</div>}

      {!loading && report && (
        <>
          {/* Summary */}
          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Дата</div>
              <div className={styles.summaryValue}>{formatDate(report.date)}</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Всего позиций</div>
              <div className={styles.summaryValue}>{report.totalItems}</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Бронирований</div>
              <div className={styles.summaryValue}>{report.totalBookings}</div>
            </div>
          </div>

          {/* Departments */}
          {report.departments.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Нет данных за выбранную дату</p>
              <span className={styles.emptyHint}>
                Попробуйте выбрать другую дату или филиал
              </span>
            </div>
          ) : (
            <div className={styles.departments}>
              {report.departments.map((dept) => (
                <div key={dept.key} className={styles.departmentCard}>
                  <div className={styles.departmentHeader}>
                    <span className={styles.departmentName}>{dept.name}</span>
                    <span className={styles.departmentTotal}>
                      Итого: {dept.totalItems} поз.
                    </span>
                  </div>
                  <table className={styles.departmentTable}>
                    <thead>
                      <tr>
                        <th>Наименование</th>
                        <th>Количество</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dept.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className={styles.itemName}>{item.name}</td>
                          <td className={styles.itemQty}>{item.totalQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!loading && !report && (
        <div className={styles.emptyState}>
          <p>Выберите дату и нажмите «Сформировать отчёт»</p>
        </div>
      )}
    </div>
  );
}
