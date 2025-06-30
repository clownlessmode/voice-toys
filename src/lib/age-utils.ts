// Маппинг технических значений возрастных групп в читаемые
export const ageMap: { [key: string]: string } = {
  "6м-2года": "6 м. – 2 года",
  "3-4года": "3 – 4 года",
  "5-7лет": "5 – 7 лет",
  "8-10лет": "8 – 10 лет",
};

// Обратный маппинг для совместимости
export const ageMapReverse: { [key: string]: string } = {
  "6 м. – 2 года": "6м-2года",
  "3 – 4 года": "3-4года",
  "5 – 7 лет": "5-7лет",
  "8 – 10 лет": "8-10лет",
};

/**
 * Преобразует техническое значение возрастной группы в читаемое
 */
export function formatAgeGroup(technicalValue: string): string {
  return ageMap[technicalValue] || technicalValue;
}

/**
 * Преобразует массив технических значений в читаемые и объединяет их
 */
export function formatAgeGroups(technicalValues: string[]): string {
  if (!technicalValues || technicalValues.length === 0) {
    return "0+";
  }

  const formatted = technicalValues.map((value) => formatAgeGroup(value));

  if (formatted.length === 1) {
    return formatted[0];
  }

  // Если несколько групп, показываем первую или можно объединить через запятую
  return formatted[0]; // или: return formatted.join(", ");
}

/**
 * Преобразует читаемое значение возрастной группы в техническое
 */
export function getTechnicalAgeValue(readableValue: string): string {
  return ageMapReverse[readableValue] || readableValue;
}
