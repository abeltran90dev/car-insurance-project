import { FormFieldConfig } from '../applicant-form/form-field-config';
import { QuoteValue } from '../../core/quote-store';
import { maskDocument } from './mask';

export interface SummaryRow {
  key: string;
  label: string;
  displayValue: string;
  masked: boolean;
}

export interface SummaryFormatOptions {
  numberLocale: string;
  yes: string;
  no: string;
}

function isEmpty(value: QuoteValue | undefined): value is null | undefined {
  return value === undefined || value === null || value === '';
}

function formatDate(iso: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    return iso;
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat(locale).format(date);
}

/** GAP-14 display rules: published fields of one group, ordered, empty values omitted. */
export function buildRows(
  fields: readonly FormFieldConfig[],
  values: Readonly<Record<string, QuoteValue>>,
  group: FormFieldConfig['group'],
  options: SummaryFormatOptions,
): SummaryRow[] {
  const rows: SummaryRow[] = [];
  for (const field of fields.filter((f) => f.group === group)) {
    const value = values[field.key];
    if (isEmpty(value)) {
      continue;
    }
    let displayValue: string;
    if (field.maskInSummary) {
      displayValue = maskDocument(String(value));
    } else if (field.type === 'select') {
      displayValue = field.options.find((o) => o.value === String(value))?.label ?? String(value);
    } else if (field.type === 'date') {
      displayValue = formatDate(String(value), options.numberLocale);
    } else if (field.type === 'checkbox') {
      displayValue = value === true ? options.yes : options.no;
    } else {
      displayValue = String(value);
    }
    rows.push({ key: field.key, label: field.label, displayValue, masked: field.maskInSummary });
  }
  return rows;
}
