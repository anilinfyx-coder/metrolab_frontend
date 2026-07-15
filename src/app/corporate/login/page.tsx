import LoginLayout from '../../components/LoginLayout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function CorporateLoginPage() {
  return (
    <LoginLayout
      title="Corporate Portal"
      subtitle="Employee Testing & Management"
      icon="🏭"
      iconBg="#e67e22"
      apiEndpoint={`${API}/api/CorporateClients/login`}
      tokenKey="corporate_token"
      userKey="corporate_user"
      dashboardPath="/corporate/dashboard"
      usernameLabel="Email Address"
      usernamePlaceholder="hr@yourcompany.com"
      usernameType="email"
    />
  );
}
