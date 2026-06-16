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
  { id: "xp-bar", label: "Barra de XP", defaultVisible: true, defaultOrder: 0 },
  { id: "health-score", label: "Health Score", defaultVisible: true, defaultOrder: 1 },
  { id: "kpi-grid", label: "KPIs", defaultVisible: true, defaultOrder: 2 },
  { id: "anomalies", label: "Anomalías", defaultVisible: true, defaultOrder: 3 },
  { id: "left-widget", label: "Transacciones / Facturas", defaultVisible: true, defaultOrder: 4 },
  { id: "right-widget", label: "Presupuestos / Vencimientos", defaultVisible: true, defaultOrder: 5 },
  { id: "ant-expenses", label: "Gastos Hormiga", defaultVisible: true, defaultOrder: 6 },
  { id: "recent-events", label: "Próximos Eventos", defaultVisible: true, defaultOrder: 7 },
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
