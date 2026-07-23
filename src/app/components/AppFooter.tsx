'use client';

import { useWhitelabel } from './WhitelabelProvider';

export default function AppFooter() {
  const year = new Date().getFullYear();
  const { isWhitelabel, config } = useWhitelabel();

  if (isWhitelabel) {
    return (
      <footer className="app-footer">
        <div className="app-footer-left">
          Copyright © {year} <span className="app-footer-brand">{config?.company_name || 'Lab'}</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="app-footer">
      <div className="app-footer-left">
        Copyright © {year} <span className="app-footer-brand">MetroLab.</span>
      </div>
      <div className="app-footer-right">
        <a href="mailto:metrolabdc@gmail.com">metrolabdc@gmail.com</a>
        <span className="app-footer-sep">|</span>
        <a href="mailto:manager@metrolabdc.com">manager@metrolabdc.com</a>
      </div>
    </footer>
  );
}
