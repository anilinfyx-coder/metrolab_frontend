/** Shared mobile sidebar drawer helpers (body class + sync event). */

export const SIDEBAR_MOBILE_OPEN_CLASS = 'sidebar-mobile-open';
export const SIDEBAR_MOBILE_CLOSE_EVENT = 'metrolab:close-mobile-nav';

export function setSidebarMobileOpen(open: boolean) {
  if (typeof document === 'undefined') return;
  document.body.classList.toggle(SIDEBAR_MOBILE_OPEN_CLASS, open);
  if (!open) {
    window.dispatchEvent(new Event(SIDEBAR_MOBILE_CLOSE_EVENT));
  }
}

export function closeSidebarMobileNav() {
  setSidebarMobileOpen(false);
}
