import { Route, Routes } from 'react-router-dom';
import Account360Page from './pages/Account360Page.jsx';
import AccountsPage from './pages/AccountsPage.jsx';

// Everything under /accounts: the list, and one account's own page.
export default function AccountsRoutes() {
  return (
    <Routes>
      <Route index element={<AccountsPage />} />
      <Route path=":accountId" element={<Account360Page />} />
    </Routes>
  );
}
