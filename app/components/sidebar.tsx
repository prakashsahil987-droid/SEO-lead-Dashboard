'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

const items = [
  {label: 'Find Leads', href: '/'},
  {label: 'Opportunities', href: '/opportunities'},
  {label: 'Email Queue', href: '/email-queue'},
  {label: 'Sent', href: '/sent'},
  {label: 'Settings', href: '/settings'},
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="side">
      {items.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return <Link className={`nav${active ? ' active' : ''}`} href={item.href} key={item.href}>{item.label}</Link>;
      })}
    </aside>
  );
}
