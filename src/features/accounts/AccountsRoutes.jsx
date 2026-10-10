import { Route, Routes } from 'react-router-dom';
import Account360Page from './pages/Account360Page.jsx';
import AccountsPage from './pages/AccountsPage.jsx';
import ImportPage from './pages/ImportPage.jsx';

// Everything under /accounts: the list, the CSV import, and one account's own page.
export default function AccountsRoutes() {
  return (
    <Routes>
      <Route index element={<AccountsPage />} />
      {/* Before ":accountId", so "import" is not read as an account. */}
      <Route path="import" element={<ImportPage />} />
      <Route path=":accountId" element={<Account360Page />} />
    </Routes>
  );
}
