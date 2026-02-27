import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'
import RegistryPage from './pages/RegistryPage'
import BookingEditPage from './pages/BookingEditPage'
import TablesSchedulePage from './pages/schedule/TablesSchedulePage'
import QuestsSchedulePage from './pages/schedule/QuestsSchedulePage'
import ContentLayout from './pages/content/ContentLayout'
import QuestsListPage from './pages/content/QuestsListPage'
import QuestCreatePage from './pages/content/QuestCreatePage'
import QuestEditPage from './pages/content/QuestEditPage'
import QuestSchedulePage from './pages/content/QuestSchedulePage'
import NewsListPage from './pages/content/NewsListPage'
import NewsForm from './pages/content/NewsForm'
import ReviewsListPage from './pages/content/ReviewsListPage'
import ReviewForm from './pages/content/ReviewForm'
import AboutFactsListPage from './pages/content/AboutFactsListPage'
import PageBlocksEditor from './pages/content/PageBlocksEditor'
import SuppliersListPage from './pages/content/SuppliersListPage'
import SupplierForm from './pages/content/SupplierForm'
import CakesListPage from './pages/content/CakesListPage'
import CakeForm from './pages/content/CakeForm'
import ShowProgramsListPage from './pages/content/ShowProgramsListPage'
import ShowProgramForm from './pages/content/ShowProgramForm'
import DecorationsListPage from './pages/content/DecorationsListPage'
import DecorationForm from './pages/content/DecorationForm'
import ReferencePage from './pages/ReferencePage'
import EmployeesPage from './pages/EmployeesPage'
import SettingsPage from './pages/SettingsPage'
import ClientsPage from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          isAuthenticated ? 
            <Navigate to="/" replace /> : 
            <LoginPage />
        } 
      />
      <Route 
        path="/" 
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/registry" replace />} />
        <Route path="registry" element={<RegistryPage />} />
        <Route path="registry/:id" element={<BookingEditPage />} />
        <Route path="table-grid" element={<TablesSchedulePage />} />
        <Route path="quest-grid" element={<QuestsSchedulePage />} />
        <Route path="content" element={<ContentLayout />}>
          <Route index element={<QuestsListPage />} />
          <Route path="quests" element={<QuestsListPage />} />
          <Route path="quests/new" element={<QuestCreatePage />} />
          <Route path="quests/:id/edit" element={<QuestEditPage />} />
          <Route path="quests/:id/schedule" element={<QuestSchedulePage />} />
          <Route path="news" element={<NewsListPage />} />
          <Route path="news/new" element={<NewsForm />} />
          <Route path="news/:id/edit" element={<NewsForm />} />
          <Route path="reviews" element={<ReviewsListPage />} />
          <Route path="reviews/new" element={<ReviewForm />} />
          <Route path="reviews/:id/edit" element={<ReviewForm />} />
          <Route path="about" element={<AboutFactsListPage />} />
          <Route path="pages" element={<PageBlocksEditor />} />
          <Route path="suppliers" element={<SuppliersListPage />} />
          <Route path="suppliers/new" element={<SupplierForm />} />
          <Route path="suppliers/:id/edit" element={<SupplierForm />} />
          <Route path="cakes" element={<CakesListPage />} />
          <Route path="cakes/new" element={<CakeForm />} />
          <Route path="cakes/:id/edit" element={<CakeForm />} />
          <Route path="show-programs" element={<ShowProgramsListPage />} />
          <Route path="show-programs/new" element={<ShowProgramForm />} />
          <Route path="show-programs/:id/edit" element={<ShowProgramForm />} />
          <Route path="decorations" element={<DecorationsListPage />} />
          <Route path="decorations/new" element={<DecorationForm />} />
          <Route path="decorations/:id/edit" element={<DecorationForm />} />
        </Route>
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="reference" element={<ReferencePage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
