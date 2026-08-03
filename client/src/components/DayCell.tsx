import { observer } from 'mobx-react-lite';
import { fmtMoney, isToday, toDateStr, todayStr } from '../utils/calendar';
import { store } from '../stores/FinanceStore';

interface Props {
  date: Date;
  onSelect: (s: string) => void;
}

function balanceLevel(balance: number): string {
  if (balance >= 12500 && balance <= 20000) return 'lvl-green';
  if (balance >= 7500 && balance <= 12499) return 'lvl-orange';
  if (balance <= 7499) return 'lvl-red';
  return '';
}

export const DayCell = observer(function DayCell({ date, onSelect }: Props) {
  const s = toDateStr(date);
  const info = store.dayInfo.get(s);
  const balance = info ? info.actualBalance ?? info.plannedBalance : null;
  const negative = balance !== null && balance < 0;
  const today = isToday(s);
  const isPast = s < todayStr();
  const lvl = balance !== null && !isPast ? balanceLevel(balance) : '';
  const payday = info !== undefined && info.plannedIncome > 25000;

  const cls = [
    'day-cell',
    today ? 'today' : '',
    store.selectedDate === s ? 'selected' : '',
    negative ? 'negative' : '',
    lvl,
    isPast ? 'past' : '',
    payday ? 'payday' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const title = info
    ? `${s}\nрасход: ${fmtMoney(info.plannedExpense)}\nдоход: ${fmtMoney(info.plannedIncome)}\nостаток: ${fmtMoney(balance)}`
    : s;

  const planNames = store.planMarkers().get(s);

  return (
    <button type="button" className={cls} onClick={() => onSelect(s)} title={title}>
      <span className="dnum">
        {date.getUTCDate()}
        {info?.actualBalance != null && <i className="dot" />}
      </span>
      <span className="bal">{balance !== null ? fmtMoney(balance) : ''}</span>
      {planNames && planNames.length > 0 && (
        <span className="plan-mark" title={`Списание по плану: ${planNames.join(', ')}`}>
          !
        </span>
      )}
      {info && (info.plannedExpense > 0 || info.plannedIncome > 0) && (
        <span className="flows">
          {info.plannedExpense > 0 && <span className="fl-e">−{fmtMoney(info.plannedExpense)}</span>}
          {info.plannedIncome > 0 && <span className="fl-i">+{fmtMoney(info.plannedIncome)}</span>}
        </span>
      )}
    </button>
  );
});
