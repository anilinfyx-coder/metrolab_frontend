'use client';
import { useState, useEffect } from 'react';
import TopNav from '../../../components/TopNav';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('b2b_token') || '' : ''; }

interface TestCount {
  lab_test_id: number;
  name: string;
  labTestCount: string;
}

export default function B2BDashboardPage() {
  const [loading, setLoading] = useState(true);

  // States for toggle cards
  const [showToday, setShowToday] = useState(false);
  const [showWeek, setShowWeek] = useState(false);
  const [showMonth, setShowMonth] = useState(false);
  const [showYear, setShowYear] = useState(false);

  // Data lists
  const [todayList, setTodayList] = useState<TestCount[]>([]);
  const [weekList, setWeekList] = useState<TestCount[]>([]);
  const [monthList, setMonthList] = useState<TestCount[]>([]);
  const [yearList, setYearList] = useState<TestCount[]>([]);

  // Totals
  const [todayTotal, setTodayTotal] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [yearTotal, setYearTotal] = useState(0);

  const fetchStats = async (startDate: string, endDate: string) => {
    try {
      const res = await fetch(`${API}/api/LabTestCategoryReport/getLabTestCategoryCountList`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify({ startDate, endDate }),
      });
      const d = await res.json();
      return d.response_code === '200' ? (d.obj || []) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      const now = new Date();
      const formatDate = (d: Date) => {
        // Adjust for timezone offset to get local YYYY-MM-DD
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
      };

      // Today
      const todayDate = formatDate(now);
      const todayData = await fetchStats(todayDate, todayDate);
      
      // Week
      const wDate = new Date();
      const firstDayOfWeek = new Date(wDate.setDate(wDate.getDate() - wDate.getDay()));
      const lastDayOfWeek = new Date(wDate.setDate(wDate.getDate() - wDate.getDay() + 6));
      const weekData = await fetchStats(formatDate(firstDayOfWeek), formatDate(lastDayOfWeek));

      // Month
      const mDate = new Date();
      const firstDayOfMonth = new Date(mDate.getFullYear(), mDate.getMonth(), 1);
      const lastDayOfMonth = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0);
      const monthData = await fetchStats(formatDate(firstDayOfMonth), formatDate(lastDayOfMonth));

      // Year
      const yDate = new Date();
      const firstDayOfYear = new Date(yDate.getFullYear(), 0, 1);
      const lastDayOfYear = new Date(yDate.getFullYear(), 11, 31);
      const yearData = await fetchStats(formatDate(firstDayOfYear), formatDate(lastDayOfYear));

      setTodayList(todayData);
      setWeekList(weekData);
      setMonthList(monthData);
      setYearList(yearData);

      setTodayTotal(todayData.reduce((acc: number, item: any) => acc + Number(item.labTestCount), 0));
      setWeekTotal(weekData.reduce((acc: number, item: any) => acc + Number(item.labTestCount), 0));
      setMonthTotal(monthData.reduce((acc: number, item: any) => acc + Number(item.labTestCount), 0));
      setYearTotal(yearData.reduce((acc: number, item: any) => acc + Number(item.labTestCount), 0));

      setLoading(false);
    };
    loadAll();
  }, []);

  const CardHeader = ({ title, total, show, onToggle }: any) => (
    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontWeight: 600 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <p style={{
          border: '1px solid grey', padding: '0.2rem 0.6rem', color: '#18BADD',
          marginBottom: 0, textAlign: 'center', borderRadius: '4px'
        }}>
          {total}
        </p>
        <div 
          onClick={onToggle} 
          style={{ cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}
          title={show ? "Collapse" : "Expand"}
        >
          {show ? '−' : '+'}
        </div>
      </div>
    </div>
  );

  const CardBody = ({ show, list }: any) => {
    if (!show) return null;
    return (
      <div className="card-body">
        {list.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No tests recorded for this period.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {list.map((item: any) => (
              <div key={item.lab_test_id} style={{
                flex: '1 1 45%', border: '1px solid #e2e8f0', borderRadius: '5px',
                padding: '0.5rem 0.8rem', backgroundColor: '#f8fafc',
                display: 'flex', justifyContent: 'space-between'
              }}>
                <span>{item.name}</span>
                <span style={{ fontWeight: 600, color: '#18BADD' }}>{item.labTestCount}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Admin Dashboard" />
      <div style={{ padding: '1.5rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading stats...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
            
            <div className="card">
              <CardHeader title="Today's Total Test" total={todayTotal} show={showToday} onToggle={() => setShowToday(!showToday)} />
              <CardBody show={showToday} list={todayList} />
            </div>

            <div className="card">
              <CardHeader title="Weekly Total Test" total={weekTotal} show={showWeek} onToggle={() => setShowWeek(!showWeek)} />
              <CardBody show={showWeek} list={weekList} />
            </div>

            <div className="card">
              <CardHeader title="Monthly Total Test" total={monthTotal} show={showMonth} onToggle={() => setShowMonth(!showMonth)} />
              <CardBody show={showMonth} list={monthList} />
            </div>

            <div className="card">
              <CardHeader title="Yearly Total Test" total={yearTotal} show={showYear} onToggle={() => setShowYear(!showYear)} />
              <CardBody show={showYear} list={yearList} />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
