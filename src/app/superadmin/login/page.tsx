import LoginLayout from '../../components/LoginLayout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function SuperAdminLoginPage() {
  return (
    <LoginLayout
      title="Super Admin Portal"
      subtitle="System Administration"
      icon="⚡"
      iconBg="#8e44ad"
      apiEndpoint={`${API}/api/SuperAdmin/login`}
      tokenKey="superadmin_token"
      userKey="superadmin_user"
      dashboardPath="/superadmin/dashboard"
      usernameLabel="Email Address"
      usernamePlaceholder="superadmin@metrolab.com"
      usernameType="email"
    />
  );
}
