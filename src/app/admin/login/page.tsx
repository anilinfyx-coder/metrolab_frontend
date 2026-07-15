import LoginLayout from '../../components/LoginLayout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function AdminLoginPage() {
  return (
    <LoginLayout
      title="Admin / Staff Portal"
      subtitle="Lab Operations & Management"
      icon="👨‍💼"
      iconBg="#18BADD"
      apiEndpoint={`${API}/api/AdminUsers/login`}
      tokenKey="admin_token"
      userKey="admin_user"
      dashboardPath="/admin/dashboard"
      usernameLabel="Email Address"
      usernamePlaceholder="admin@metrolab.com"
      usernameType="email"
    />
  );
}
