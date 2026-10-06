'use client';

import React, { useEffect, useState } from 'react';
import { AlignLeft } from 'lucide-react';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface TableOfContentsProps {
  contentHtml: string;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ contentHtml }) => {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Parse h2 and h3 from rendered DOM in article
    const article = document.querySelector('article .prose');
    if (!article) return;

    const headingElements = article.querySelectorAll('h2, h3');
    const items: TocItem[] = [];

    headingElements.forEach((el, index) => {
      let id = el.id;
      if (!id) {
        id = `heading-${index}-${(el.textContent || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`;
        el.id = id;
      }
      items.push({
        id,
        text: el.textContent || '',
        level: el.tagName === 'H2' ? 2 : 3,
      });
    });

    setHeadings(items);

    if (items.length > 0 && items[0]) {
      setActiveId(items[0].id);
    }

    // ScrollSpy observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );

    headingElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [contentHtml]);

  if (headings.length === 0) return null;

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <nav className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-[#121215] space-y-3 shadow-xs">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
        <AlignLeft className="w-4 h-4 text-indigo-500" />
        <span>İçindekiler</span>
      </div>

      <ul className="space-y-1.5 text-xs">
        {headings.map((item) => {
          const isActive = activeId === item.id;
          return (
            <li
              key={item.id}
              style={{ paddingLeft: item.level === 3 ? '1rem' : '0' }}
            >
              <button
                onClick={() => scrollToHeading(item.id)}
                className={`text-left transition-colors line-clamp-1 py-1 w-full ${
                  isActive
                    ? 'font-semibold text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {item.text}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
