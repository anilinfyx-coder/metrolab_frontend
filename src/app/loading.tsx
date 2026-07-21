import PageLoader from './components/PageLoader';

export default function Loading() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PageLoader message="Loading..." size="lg" />
    </div>
  );
}
