import PageLoader from '../../components/PageLoader';

export default function Loading() {
  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <PageLoader message="Loading..." size="lg" />
    </div>
  );
}
