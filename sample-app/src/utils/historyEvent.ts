import type { HistoryEventType } from '../types/roomDetail'

const LABEL: Record<HistoryEventType, string> = {
  borrowed: 'Půjčeno',
  returned: 'Vráceno',
  edited: 'Upraveno',
  deleted: 'Smazáno',
}

const BADGE_CLASS: Record<HistoryEventType, string> = {
  borrowed: 'bg-primary/15 border-primary/30 text-primary',
  returned: 'bg-success/15 border-success/30 text-success',
  edited: 'bg-secondary border-border text-secondary-foreground',
  deleted: 'bg-destructive/15 border-destructive/30 text-destructive',
}

const TONE_CLASS: Record<HistoryEventType, string> = {
  borrowed: 'bg-primary/5 border-primary/20',
  returned: 'bg-success/5 border-success/20',
  edited: 'bg-secondary/50 border-border',
  deleted: 'bg-destructive/5 border-destructive/20',
}

export function historyEventLabel(eventType: HistoryEventType): string {
  return LABEL[eventType]
}

export function historyEventBadgeClass(eventType: HistoryEventType): string {
  return BADGE_CLASS[eventType]
}

export function historyEventToneClass(eventType: HistoryEventType): string {
  return TONE_CLASS[eventType]
}
