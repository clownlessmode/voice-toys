const ADMINISTRATIVE_PART = /(?:область|край|республика|район|автономный\s+округ|федеральный\s+округ)$/iu;
const ADDRESS_PART = /^(?:ул\.?|улица|проспект|пр-т|переулок|пер\.?|шоссе|наб(?:ережная)?\.?|бульвар|бул\.?|проезд|площадь|пл\.?)(?:\s|$)/iu;

export function extractOzonPointCity(address: string): string {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  for (const part of parts) {
    if (/^(?:россия|российская федерация)$/iu.test(part) || ADMINISTRATIVE_PART.test(part) || ADDRESS_PART.test(part)) {
      continue;
    }
    return part.replace(/^(?:г\.?|город)\s+/iu, "").trim();
  }
  return "Другой город";
}
