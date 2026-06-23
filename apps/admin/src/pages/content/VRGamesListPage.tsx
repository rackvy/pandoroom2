import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVRGames, deleteVRGame, type VRGame } from '../../api/catalog';
import { getMediaUrl } from '../../utils/media';
import { toast } from '../../components/ui/Toast';
import { confirm } from '../../components/ui/ConfirmDialog';
import styles from './QuestsListPage.module.css';

export default function VRGamesListPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState<VRGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGames = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getVRGames();
      setGames(data);
    } catch (err) {
      setError('Ошибка загрузки VR игр');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const handleAdd = () => {
    navigate('/content/vr-games/new');
  };

  const handleEdit = (id: string) => {
    navigate(`/content/vr-games/${id}/edit`);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: 'Удалить VR игру?',
      message: `Вы уверены, что хотите удалить "${name}"?`,
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await deleteVRGame(id);
      loadGames();
      toast.success('VR игра удалена');
    } catch (err) {
      toast.error('Ошибка удаления VR игры');
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>VR Игры</h1>
        <button className={styles.addButton} onClick={handleAdd}>
          <span>+</span>
          <span>Добавить игру</span>
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {games.length === 0 ? (
        <div className={styles.empty}>Нет VR игр</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Изображение</th>
              <th>Название</th>
              <th>Жанр</th>
              <th>Игроки</th>
              <th>Длительность</th>
              <th>Активна</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id}>
                <td>
                  {game.previewImage ? (
                    <img
                      src={getMediaUrl(game.previewImage.url)}
                      alt={game.name}
                      className={styles.questImage}
                    />
                  ) : (
                    <div className={styles.questImage} style={{ background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>—</div>
                  )}
                </td>
                <td>
                  <div className={styles.questName}>{game.name}</div>
                </td>
                <td>{game.genre || '-'}</td>
                <td className={styles.players}>
                  {game.minPlayers}-{game.maxPlayers}
                </td>
                <td>{game.durationMinutes ? `${game.durationMinutes} мин` : '-'}</td>
                <td>{game.isActive ? 'Да' : 'Нет'}</td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleEdit(game.id)}
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.delete}`}
                      onClick={() => handleDelete(game.id, game.name)}
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
