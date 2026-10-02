import { describe, expect, it } from "vitest";
import { extractOzonPointCity } from "@/lib/ozon-delivery/point-city";

describe("extractOzonPointCity", () => {
  it.each([
    ["Россия, Ленинградская Область, Выборгский Район, Выборг, Железнодорожная улица, 15", "Выборг"],
    ["Россия, Пермский Край, Лысьва, улица Мира, 6", "Лысьва"],
    ["Россия, Москва, улица Тверская, 1", "Москва"],
    ["Российская Федерация, г. Новокузнецк, проспект Металлургов, 1", "Новокузнецк"],
  ])("extracts a city from %s", (address, city) => {
    expect(extractOzonPointCity(address)).toBe(city);
  });
});
