import { Route, Routes } from 'react-router-dom';
import WhatsAppPage from './pages/WhatsAppPage.jsx';

// Everything under /whatsapp: the chats, and the same page with one chat open.
export default function WhatsAppRoutes() {
  return (
    <Routes>
      <Route index element={<WhatsAppPage />} />
      <Route path=":conversationId" element={<WhatsAppPage />} />
    </Routes>
  );
}
