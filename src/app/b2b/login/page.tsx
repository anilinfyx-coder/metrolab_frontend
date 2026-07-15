import LoginLayout from '../../components/LoginLayout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function B2bLoginPage() {
  return (
    <LoginLayout
      title="B2B Client Portal"
      subtitle="Partner Clinics & Hospitals"
      icon="🏢"
      iconBg="#27ae60"
      apiEndpoint={`${API}/api/B2bClients/login`}
      tokenKey="b2b_token"
      userKey="b2b_user"
      dashboardPath="/b2b/dashboard"
      usernameLabel="Email Address"
      usernamePlaceholder="contact@yourclinic.com"
      usernameType="email"
    />
  );
}
