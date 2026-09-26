import { observer } from 'mobx-react-lite';
import { CSSProperties, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { VariableSizeList } from 'react-window';
import { store } from '../stores/FinanceStore';
import { addDays, fmtMoney, HEADER_H, toDateStr, WEEK_H } from '../utils/calendar';
import { DayCell } from './DayCell';

const WEEKDAY_H = 26;
const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface CalendarProps {
  onSelect: (s: string) => void;
}

interface RowData {
  onSelect: (s: string) => void;
}

function getScrollbarWidth(): number {
  const outer = document.createElement('div');
  outer.style.visibility = 'hidden';
  outer.style.overflow = 'scroll';
  outer.style.position = 'absolute';
  outer.style.width = '50px';
  outer.style.height = '50px';
  document.body.appendChild(outer);
  const inner = document.createElement('div');
  inner.style.width = '100%';
  inner.style.height = '100%';
  outer.appendChild(inner);
  const w = outer.offsetWidth - inner.offsetWidth;
  outer.remove();
  return w;
}

const MonthSummary = observer(function MonthSummary({ ym }: { ym: number }) {
  const s = store.monthSummary(ym);
  const total = s.exceedDays + s.okDays + s.noFixDays;
  if (total === 0) return null;
  return (
    <div className="month-summary">
      <span className="ms-item ms-e" title="Дни с превышением плана и сумма перерасхода">
        превыш.: {s.exceedDays} ({fmtMoney(s.sumExceeds)})
      </span>
      <span className="ms-item ms-s" title="Дни без превышения и сумма экономии">
        норма: {s.okDays} ({fmtMoney(s.sumSavings)})
      </span>
      <span className="ms-item ms-n" title="Дни без ручной фиксации остатка">
        без фикс.: {s.noFixDays}
      </span>
    </div>
  );
});

const Row = observer(function Row({
  index,
  style,
  data,
}: {
  index: number;
  style: CSSProperties;
  data: RowData;
}) {
  const w = store.weeks[index];
  if (!w) return null;
  return (
    <div style={style} className="week">
      {w.isMonthStart && (
        <div className="month-header">
          <span className="month-label">{w.monthLabel}</span>
          <MonthSummary ym={w.ym} />
        </div>
      )}
      <div className="week-grid">
        {w.cells.map((cell, i) =>
          cell ? (
            <DayCell key={i} date={cell} onSelect={data.onSelect} />
          ) : (
            <div key={i} className="day-blank" />
          ),
        )}
      </div>
    </div>
  );
});

export const Calendar = observer(function Calendar({ onSelect }: CalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<VariableSizeList>(null);
  const offsetRef = useRef(0);
  const pendingBackHeight = useRef(0);
  const loadTimer = useRef<number>(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [scrollbarW, setScrollbarW] = useState(0);

  const weeks = store.weeks;

  const itemSize = useCallback(
    (i: number) => (weeks[i].isMonthStart ? WEEK_H + HEADER_H : WEEK_H),
    [weeks],
  );

  const totalHeight = useMemo(
    () => weeks.reduce((sum, w) => sum + (w.isMonthStart ? WEEK_H + HEADER_H : WEEK_H), 0),
    [weeks],
  );

  const itemData = useMemo<RowData>(() => ({ onSelect }), [onSelect]);

  const scheduleLoad = useCallback(
    (fromIdx: number, toIdx: number) => {
      window.clearTimeout(loadTimer.current);
      loadTimer.current = window.setTimeout(() => {
        const first = weeks[Math.max(0, fromIdx)];
        const last = weeks[Math.min(weeks.length - 1, toIdx)];
        if (!first || !last) return;
        const anchor = first.weekStart ?? first.cells.find(Boolean) ?? new Date();
        const from = addDays(toDateStr(anchor), -14);
        const lastCell = [...last.cells].reverse().find(Boolean) ?? last.weekStart ?? anchor;
        const to = addDays(toDateStr(lastCell), 14);
        store.loadRange(from, to);
      }, 120);
    },
    [weeks],
  );

  const handleItemsRendered = useCallback(
    ({ overscanStartIndex, overscanStopIndex }: { overscanStartIndex: number; overscanStopIndex: number }) => {
      if (overscanStartIndex <= 2) {
        const added = store.extendBack();
        if (added) pendingBackHeight.current = added;
      }
      if (overscanStopIndex >= weeks.length - 3) {
        store.extendForward();
      }
      scheduleLoad(overscanStartIndex, overscanStopIndex);
    },
    [weeks, scheduleLoad],
  );

  const handleScroll = useCallback(({ scrollOffset }: { scrollOffset: number }) => {
    offsetRef.current = scrollOffset;
  }, []);

  useLayoutEffect(() => {
    if (pendingBackHeight.current) {
      const h = pendingBackHeight.current;
      pendingBackHeight.current = 0;
      const list = listRef.current;
      if (list) {
        const timer = window.setTimeout(() => {
          list.resetAfterIndex(0, true);
          list.scrollTo(offsetRef.current + h);
        }, 0);
        return () => window.clearTimeout(timer);
      }
    }
  }, [weeks[0]?.ym, weeks.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    setScrollbarW(getScrollbarWidth());
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      scheduleLoad(0, weeks.length - 1);
    }, 50);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const padRight = totalHeight > size.h && size.w > 0 ? scrollbarW : 0;

  return (
    <div className="calendar" ref={containerRef}>
      <div className="weekday-row" style={{ paddingRight: padRight }}>
        {WEEKDAYS_SHORT.map((d, i) => (
          <div key={i} className="weekday">
            {d}
          </div>
        ))}
      </div>
      {size.w > 0 && size.h > WEEKDAY_H && (
        <VariableSizeList
          ref={listRef}
          height={size.h - WEEKDAY_H}
          width={size.w}
          itemCount={weeks.length}
          itemSize={itemSize}
          itemData={itemData}
          overscanCount={6}
          onItemsRendered={handleItemsRendered}
          onScroll={handleScroll}
        >
          {Row}
        </VariableSizeList>
      )}
    </div>
  );
});
