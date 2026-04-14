import { useAuth } from '../context/AuthContext';
import LoginForm from './LoginForm';
import ClipboardPanel from './ClipboardPanel';

export default function SidePanel() {
  const { isAuthenticated, authReady } = useAuth();

  if (!authReady) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#fff', color: '#7a9ab5', fontSize: 13,
      }}>
        로딩 중...
      </div>
    );
  }

  return isAuthenticated ? <ClipboardPanel /> : <LoginForm />;
}
