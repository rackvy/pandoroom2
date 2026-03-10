import Link from 'next/link'
import Image from 'next/image'
import styles from './page.module.css'

// Моковые данные для квестов
const questsWithActors = [
  { id: '1', title: 'Гарри Поттер', genre: 'Фэнтези', image: '/quests/harry.jpg', players: '2-6', time: '60 мин' },
  { id: '2', title: 'Ужин с Убийцей', genre: 'Детектив', image: '/quests/dinner.jpg', players: '4-8', time: '90 мин' },
  { id: '3', title: 'Госпожа Удача', genre: 'Комедия', image: '/quests/luck.jpg', players: '2-6', time: '60 мин' },
  { id: '4', title: 'Resident Evil', genre: 'Хоррор', image: '/quests/re.jpg', players: '2-4', time: '75 мин' },
]

const questsWithoutActors = [
  { id: '5', title: 'Инквизиция', genre: 'Исторический', image: '/quests/inq.jpg', players: '2-4', time: '60 мин' },
  { id: '6', title: 'Silent Hill', genre: 'Хоррор', image: '/quests/silent.jpg', players: '2-6', time: '75 мин' },
  { id: '7', title: 'Секретный эксперимент', genre: 'Триллер', image: '/quests/exp.jpg', players: '2-5', time: '60 мин' },
  { id: '8', title: 'Тайна старого театра', genre: 'Мистика', image: '/quests/theater.jpg', players: '3-6', time: '90 мин' },
]

const kidsQuests = [
  { id: '9', title: 'Лазертаг', genre: 'Активный', image: '/quests/laser.jpg', players: '4-12', time: '30 мин' },
  { id: '10', title: 'Ограбление века', genre: 'Приключение', image: '/quests/robbery.jpg', players: '4-8', time: '60 мин' },
  { id: '11', title: 'Игровая и кафе', genre: 'Отдых', image: '/quests/play.jpg', players: '2-10', time: '∞' },
  { id: '12', title: 'Детский квест', genre: 'Приключение', image: '/quests/kids.jpg', players: '4-8', time: '45 мин' },
]

const partyCategories = [
  { id: '1', title: 'Праздники для малышей', subtitle: '1-5 лет', image: '/party/babies.jpg', color: '#A0BF39' },
  { id: '2', title: 'Праздники для детей', subtitle: '6-10 лет', image: '/party/kids.jpg', color: '#B6009D' },
  { id: '3', title: 'Праздники для детей', subtitle: '10-15 лет', image: '/party/teens.jpg', color: '#A0BF39' },
  { id: '4', title: 'Организовываем Выпускные из детсада', subtitle: '', image: '/party/kindergarten.jpg', color: '#4A90D9' },
  { id: '5', title: 'Отпразднуем Поступление в школу', subtitle: '', image: '/party/school.jpg', color: '#E85D75' },
  { id: '6', title: 'Устроим праздник По любому поводу :)', subtitle: '', image: '/party/any.jpg', color: '#F5A623' },
]

const services = [
  { icon: '🛋️', title: 'Lounge' },
  { icon: '🎮', title: 'Игровая' },
  { icon: '☕', title: 'Кафе' },
  { icon: '🎭', title: 'Шоу-программы' },
  { icon: '🎲', title: 'Квесты' },
  { icon: '🎂', title: 'Торты' },
  { icon: '🎉', title: 'Праздники' },
]

const news = [
  { id: '1', title: 'День рождения в квесте', image: '/news/birthday.jpg', text: 'Проведите день рождения в наших квестах со скидкой 20%' },
  { id: '2', title: 'Новый квест — Мумия', image: '/news/mummy.jpg', text: 'Скоро открытие нового квеста в египетском стиле' },
  { id: '3', title: 'Скидка 30% на Тайна Теслы', image: '/news/tesla.jpg', text: 'Специальное предложение на популярный квест' },
  { id: '4', title: 'Дарим квест всем мам', image: '/news/mom.jpg', text: 'В честь 8 марта дарим сертификаты всем мамочкам' },
]

const reviews = [
  { id: '1', name: 'Анна М.', rating: 5, text: 'Потрясающий квест! Актёры играли просто великолепно, мы полностью погрузились в атмосферу. Обязательно придём ещё!', date: '15.03.2024' },
  { id: '2', name: 'Павел Г.', rating: 5, text: 'Организация на высшем уровне. Дети в восторге от праздника, всё продумано до мелочей. Спасибо Пандорум!', date: '12.03.2024' },
  { id: '3', name: 'Родители Светланы', rating: 5, text: 'Отличное место для детского праздника. Чисто, уютно, персонал очень внимательный. Дочка счастлива!', date: '10.03.2024' },
  { id: '4', name: 'Кирилл В.', rating: 5, text: 'Были на квесте "Гарри Поттер" — это нечто! Декорации, загадки, актёры — всё на 5 баллов.', date: '08.03.2024' },
]

export default function Home() {
  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <div className={styles.headerLeft}>
            <Link href="/" className={styles.logo}>
              PANDOROOM
            </Link>
            <nav className={styles.nav}>
              <Link href="/quests" className={styles.navLink}>Квесты</Link>
              <Link href="/cafe" className={styles.navLink}>Кафе</Link>
              <Link href="/guide" className={styles.navLink}>Праздники</Link>
              <Link href="/news" className={styles.navLink}>Новости</Link>
              <Link href="/reviews" className={styles.navLink}>Отзывы</Link>
            </nav>
          </div>
          <div className={styles.headerRight}>
            <a href="tel:+74232022696" className={styles.phone}>8 (423) 202-26-96</a>
            <a href="tel:+74232054468" className={styles.phone}>8 (423) 205-44-68</a>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContainer}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>
                Самый большой квеструм и площадки для праздников во Владивостоке
              </h1>
              <div className={styles.heroFeatures}>
                <p>• 15 квест-комнат для любого возраста</p>
                <p>• 3 зоны кафе: Lounge, Игровая, Детская</p>
                <p>• Организация праздников под ключ</p>
                <p>• Работаем с 2015 года</p>
              </div>
              <div className={styles.heroButtons}>
                <Link href="/quests" className={styles.btnPrimary}>
                  Забронировать квест
                </Link>
                <Link href="/guide" className={styles.btnSecondary}>
                  Отметить праздник
                </Link>
              </div>
            </div>
            <div className={styles.heroImage}>
              <div className={styles.heroImageWrapper}>
                <Image
                  src="/hero-main.jpg"
                  alt="Pandoroom"
                  fill
                  className={styles.heroImg}
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Quests with Actors */}
        <section className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Квесты с актёрами во Владивостоке</h2>
            <div className={styles.questsGrid}>
              {questsWithActors.map((quest) => (
                <Link href={`/quests/${quest.id}`} key={quest.id} className={styles.questCard}>
                  <div className={styles.questImageWrapper}>
                    <div className={styles.questImagePlaceholder} style={{ background: '#2a2a25' }}>
                      <span>{quest.title}</span>
                    </div>
                  </div>
                  <div className={styles.questInfo}>
                    <span className={styles.questGenre}>{quest.genre}</span>
                    <h3 className={styles.questTitle}>{quest.title}</h3>
                    <div className={styles.questMeta}>
                      <span>{quest.players} чел</span>
                      <span>{quest.time}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Quests without Actors */}
        <section className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Квесты без актёров во Владивостоке</h2>
            <div className={styles.questsGrid}>
              {questsWithoutActors.map((quest) => (
                <Link href={`/quests/${quest.id}`} key={quest.id} className={styles.questCard}>
                  <div className={styles.questImageWrapper}>
                    <div className={styles.questImagePlaceholder} style={{ background: '#1a1a18' }}>
                      <span>{quest.title}</span>
                    </div>
                  </div>
                  <div className={styles.questInfo}>
                    <span className={styles.questGenre}>{quest.genre}</span>
                    <h3 className={styles.questTitle}>{quest.title}</h3>
                    <div className={styles.questMeta}>
                      <span>{quest.players} чел</span>
                      <span>{quest.time}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Kids Quests */}
        <section className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Квесты для детей во Владивостоке</h2>
            <div className={styles.questsGrid}>
              {kidsQuests.map((quest) => (
                <Link href={`/quests/${quest.id}`} key={quest.id} className={styles.questCard}>
                  <div className={styles.questImageWrapper}>
                    <div className={styles.questImagePlaceholder} style={{ background: '#2d2d28' }}>
                      <span>{quest.title}</span>
                    </div>
                  </div>
                  <div className={styles.questInfo}>
                    <span className={styles.questGenre}>{quest.genre}</span>
                    <h3 className={styles.questTitle}>{quest.title}</h3>
                    <div className={styles.questMeta}>
                      <span>{quest.players} чел</span>
                      <span>{quest.time}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Party Section */}
        <section className={styles.partySection}>
          <div className={styles.container}>
            <h2 className={styles.partyTitle}>
              Устройте незабываемый праздник для вашего ребёнка в семейном центре «Пандорум»
            </h2>
            <div className={styles.partyGrid}>
              {partyCategories.map((cat) => (
                <div key={cat.id} className={styles.partyCard} style={{ '--card-color': cat.color } as React.CSSProperties}>
                  <div className={styles.partyCardImage}>
                    <div className={styles.partyImagePlaceholder} style={{ background: cat.color + '20' }}>
                      <span>{cat.title}</span>
                    </div>
                  </div>
                  <div className={styles.partyCardContent}>
                    <h3>{cat.title}</h3>
                    {cat.subtitle && <p>{cat.subtitle}</p>}
                    <button className={styles.partyCardBtn} style={{ background: cat.color }}>
                      Подробнее
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services Icons */}
        <section className={styles.servicesSection}>
          <div className={styles.container}>
            <div className={styles.servicesGrid}>
              {services.map((service, idx) => (
                <div key={idx} className={styles.serviceItem}>
                  <span className={styles.serviceIcon}>{service.icon}</span>
                  <span className={styles.serviceTitle}>{service.title}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* News Section */}
        <section className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Новости и акции</h2>
            <div className={styles.newsGrid}>
              {news.map((item) => (
                <div key={item.id} className={styles.newsCard}>
                  <div className={styles.newsImage}>
                    <div className={styles.newsImagePlaceholder}>
                      <span>{item.title}</span>
                    </div>
                  </div>
                  <div className={styles.newsContent}>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                    <Link href={`/news/${item.id}`} className={styles.newsLink}>
                      Подробнее →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Отзывы гостей</h2>
            <div className={styles.reviewsGrid}>
              {reviews.map((review) => (
                <div key={review.id} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <span className={styles.reviewName}>{review.name}</span>
                    <div className={styles.reviewRating}>
                      {'★'.repeat(review.rating)}
                    </div>
                  </div>
                  <p className={styles.reviewText}>{review.text}</p>
                  <span className={styles.reviewDate}>{review.date}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerTop}>
            <div className={styles.footerCol}>
              <h4>Квесты во Владивостоке</h4>
              <Link href="/quests">Все квесты</Link>
              <Link href="/quests?type=actors">С актёрами</Link>
              <Link href="/quests?type=no-actors">Без актёров</Link>
              <Link href="/quests?type=kids">Для детей</Link>
            </div>
            <div className={styles.footerCol}>
              <h4>Праздники во Владивостоке</h4>
              <Link href="/guide">День рождения</Link>
              <Link href="/guide">Выпускной</Link>
              <Link href="/guide">Корпоратив</Link>
              <Link href="/guide">Детский праздник</Link>
            </div>
            <div className={styles.footerCol}>
              <h4>О нас</h4>
              <Link href="/about">О компании</Link>
              <Link href="/news">Новости</Link>
              <Link href="/reviews">Отзывы</Link>
              <Link href="/contacts">Контакты</Link>
            </div>
            <div className={styles.footerCol}>
              <h4>Контакты</h4>
              <p>Владивосток, ул. Пушкинская, 14</p>
              <p>Ежедневно 10:00 - 22:00</p>
              <a href="tel:+74232022696">8 (423) 202-26-96</a>
              <a href="tel:+74232054468">8 (423) 205-44-68</a>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <div className={styles.footerLogo}>PANDOROOM</div>
            <p className={styles.footerCopy}>© 2024 Pandoroom. Все права защищены.</p>
            <div className={styles.footerSocials}>
              <a href="#" className={styles.socialLink}>VK</a>
              <a href="#" className={styles.socialLink}>TG</a>
              <a href="#" className={styles.socialLink}>WA</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
