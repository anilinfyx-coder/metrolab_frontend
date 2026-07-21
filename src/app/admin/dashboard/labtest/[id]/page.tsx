'use client';
import { useParams, useRouter } from 'next/navigation';
import TopNav from '../../../../components/TopNav';
import ApplyTestForm from '../ApplyTestForm';

export default function WaitingListApplyPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params?.id);

  if (!id || Number.isNaN(id)) {
    return (
      <div className="page-content" style={{ paddingTop: 0 }}>
        <TopNav title="Waiting List" />
        <div className="page-body">
          <p>Invalid waiting list entry.</p>
          <button type="button" className="btn btn-primary" onClick={() => router.push('/admin/dashboard/labtest')}>
            Back to Waiting List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Waiting List" />
      <ApplyTestForm
        waitingListId={id}
        variant="page"
        onClose={() => router.push('/admin/dashboard/labtest')}
        onSuccess={() => router.push('/admin/dashboard/labtest')}
      />
    </div>
  );
}
