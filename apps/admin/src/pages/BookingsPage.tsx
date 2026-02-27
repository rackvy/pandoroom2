import { useState } from 'react'
import styles from './Page.module.css'

export default function BookingsPage() {
  const [bookings] = useState([])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>Брони</h2>
        <button className={styles.primaryButton}>Создать бронь</button>
      </div>
      
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Клиент</th>
              <th>Телефон</th>
              <th>Филиал</th>
              <th>Дата</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  Нет бронирований
                </td>
              </tr>
            ) : (
              bookings.map((booking: any) => (
                <tr key={booking.id}>
                  <td>{booking.id}</td>
                  <td>{booking.customerName}</td>
                  <td>{booking.customerPhone}</td>
                  <td>{booking.branch?.name}</td>
                  <td>{new Date(booking.date).toLocaleDateString('ru-RU')}</td>
                  <td>{booking.status}</td>
                  <td>
                    <button className={styles.actionButton}>Редактировать</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
