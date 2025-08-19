"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

export type City = {
  code: number;
  city: string;
  region?: string;
  latitude: number;
  longitude: number;
};

type Props = {
  name?: string;
  value: string; // выбранный город (по имени), как у вас в formData.cdekCity
  cities: City[];
  onSelect: (city: City) => void; // вызывается при выборе
  required?: boolean;
  className?: string; // стили инпута
  placeholder?: string;
};

export const SearchableCitySelect: React.FC<Props> = ({
  name,
  value,
  cities,
  onSelect,
  required,
  className = "w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary",
  placeholder = "Выберите город",
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Синхронизация отображаемого текста с выбранным значением
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const filtered = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return cities.slice(0, 100);
    return cities.filter((c) =>
      `${c.city} ${c.region}`.toLowerCase().includes(q)
    );
  }, [cities, inputValue]);

  useEffect(() => {
    if (highlight >= filtered.length) setHighlight(0);
  }, [filtered.length, highlight]);

  const pick = (city: City) => {
    onSelect(city);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[highlight]) {
        e.preventDefault();
        pick(filtered[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative" role="combobox" aria-expanded={open}>
      <input
        ref={inputRef}
        name={name}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // даём кликнуть по пункту меню, затем закрываем и откатываем текст
          setTimeout(() => {
            setOpen(false);
            setInputValue(value || "");
          }, 120);
        }}
        onKeyDown={onKeyDown}
        required={required}
        placeholder={placeholder}
        className={className}
        aria-autocomplete="list"
        aria-controls="city-listbox"
        aria-activedescendant={
          open && filtered[highlight]
            ? `city-${filtered[highlight].code}`
            : undefined
        }
      />

      {/* стрелка */}
      <button
        type="button"
        aria-label="Открыть список"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          inputRef.current?.focus();
          setOpen((v) => !v);
        }}
      >
        ▾
      </button>

      {open && (
        <ul
          id="city-listbox"
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-300 bg-white shadow"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-gray-500">Ничего не найдено</li>
          ) : (
            filtered.map((c, idx) => (
              <li
                key={c.code}
                id={`city-${c.code}`}
                role="option"
                aria-selected={idx === highlight}
                className={`px-3 py-2 cursor-pointer ${
                  idx === highlight ? "bg-gray-100" : "hover:bg-gray-100"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(c)}
                onMouseEnter={() => setHighlight(idx)}
              >
                {c.city} ({c.region})
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
