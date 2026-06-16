export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

export function calculateLevel(xp: number): number {
  let level = 1;
  let accumulated = 0;
  while (accumulated + xpForLevel(level) <= xp) {
    accumulated += xpForLevel(level);
    level++;
  }
  return level;
}

export function getTitleForLevel(level: number): string {
  const titles = [
    {
      max: 10,
      options: [
        "Ahorrador Principiante",
        "Aprendiz del Tinto",
        "Novato del Bus",
        "Cajon de Ahorros",
      ],
    },
    {
      max: 25,
      options: [
        "Administrador de Gastos",
        "Controlador del Rappi",
        "Dueno del Presupuesto",
        "Rey de la Quincena",
      ],
    },
    {
      max: 50,
      options: [
        "Capitan del Ahorro",
        "Maestro del Cash Flow",
        "Tiburon de las Finanzas",
        "Inversionista en Formacion",
      ],
    },
    {
      max: 75,
      options: [
        "Emperador del Patrimonio",
        "Senor de los Dividendos",
        "Dios del TRM",
        "Banquero del Barrio",
      ],
    },
    {
      max: 100,
      options: [
        "Leyenda de las Finanzas",
        "Warren Buffett Colombiano",
        "Dueno del Banco de la Republica",
        "Finanzas Iluminado",
      ],
    },
  ];

  for (const tier of titles) {
    if (level <= tier.max) {
      return tier.options[level % tier.options.length];
    }
  }
  return "Leyenda Viviente";
}

export function xpToNextLevel(currentLevel: number, currentXp: number): number {
  const totalForNextLevel = totalXpForLevel(currentLevel + 1);
  return totalForNextLevel - currentXp;
}

export function levelProgressPercent(
  currentLevel: number,
  currentXp: number
): number {
  const totalForCurrent = totalXpForLevel(currentLevel);
  const totalForNext = totalXpForLevel(currentLevel + 1);
  const levelXp = currentXp - totalForCurrent;
  const levelRange = totalForNext - totalForCurrent;
  return Math.min(100, Math.floor((levelXp / levelRange) * 100));
}
