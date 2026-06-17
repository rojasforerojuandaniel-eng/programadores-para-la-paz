export interface WidgetLayoutItem {
  id: string;
  visible: boolean;
  order: number;
}

export interface WidgetDefinition {
  id: string;
  label: string;
  defaultVisible: boolean;
  defaultOrder: number;
}

export const DEFAULT_WIDGETS: WidgetDefinition[] = [
  { id: "daily-briefing", label: "Briefing diario", defaultVisible: true, defaultOrder: 0 },
  { id: "xp-bar", label: "Barra de XP", defaultVisible: true, defaultOrder: 1 },
  { id: "health-score", label: "Health Score", defaultVisible: true, defaultOrder: 2 },
  { id: "kpi-grid", label: "KPIs", defaultVisible: true, defaultOrder: 3 },
  { id: "ai-copilot", label: "Copiloto AI", defaultVisible: true, defaultOrder: 4 },
  { id: "anomalies", label: "Anomalías", defaultVisible: true, defaultOrder: 5 },
  { id: "left-widget", label: "Transacciones / Facturas", defaultVisible: true, defaultOrder: 6 },
  { id: "right-widget", label: "Presupuestos / Vencimientos", defaultVisible: true, defaultOrder: 7 },
  { id: "ant-expenses", label: "Gastos Hormiga", defaultVisible: true, defaultOrder: 8 },
  { id: "recent-events", label: "Próximos Eventos", defaultVisible: true, defaultOrder: 9 },
  { id: "economic-indicators", label: "Indicadores Colombia", defaultVisible: true, defaultOrder: 10 },
  { id: "upcoming-events", label: "Calendario de vencimientos", defaultVisible: false, defaultOrder: 11 },
];

export function buildDefaultLayout(): WidgetLayoutItem[] {
  return DEFAULT_WIDGETS.map((widget) => ({
    id: widget.id,
    visible: widget.defaultVisible,
    order: widget.defaultOrder,
  }));
}

export function mergeLayouts(
  saved: WidgetLayoutItem[] | undefined | null
): WidgetLayoutItem[] {
  const defaults = buildDefaultLayout();
  if (!saved || saved.length === 0) return defaults;

  const savedById = new Map(saved.map((item) => [item.id, item]));

  return defaults.map((defaultItem) => {
    const savedItem = savedById.get(defaultItem.id);
    return savedItem ? { ...defaultItem, ...savedItem } : defaultItem;
  });
}

export function normalizeLayout(layout: WidgetLayoutItem[]): WidgetLayoutItem[] {
  return layout
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));
}

export interface DashboardWidget {
  id: string;
  label: string;
  content: React.ReactNode;
}
