"use client";

import { useState } from "react";
import Button1 from "@/components/ui/typography/Button1";
import T1 from "@/components/ui/typography/T1";

interface PromoCodeInputProps {
  onApply: (discountAmount: number, promoCodeId: string) => void;
  onRemove: () => void;
  orderAmount: number;
  className?: string;
}

interface PromoCodeValidation {
  isValid: boolean;
  discountAmount: number;
  promoCode?: {
    id: string;
    code: string;
    name: string;
    type: string;
    value: number;
  };
  error?: string;
}

export default function PromoCodeInput({
  onApply,
  onRemove,
  orderAmount,
  className = "",
}: PromoCodeInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState<
    PromoCodeValidation["promoCode"] | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApply = async () => {
    if (!code.trim()) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), orderAmount }),
      });

      const result: PromoCodeValidation = await response.json();

      if (result.isValid && result.promoCode) {
        setAppliedPromoCode(result.promoCode);
        onApply(result.discountAmount, result.promoCode.id);
        setCode("");
        setErrorMessage(null);
      } else {
        setErrorMessage(result.error || "Неизвестная ошибка");
      }
    } catch {
      setErrorMessage("Ошибка при проверке промокода");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setAppliedPromoCode(null);
    setErrorMessage(null);
    onRemove();
  };

  const formatDiscount = (amount: number) => {
    if (appliedPromoCode?.type === "PERCENTAGE") {
      return `${appliedPromoCode.value}%`;
    }
    return `${amount} ₽`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {!appliedPromoCode ? (
        <div className="flex gap-2 w-full">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Введите промокод"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary h-12"
            onKeyPress={(e) => e.key === "Enter" && handleApply()}
          />
          <Button1
            onClick={handleApply}
            disabled={loading || !code.trim()}
            className="h-10 text-center w-fit!"
          >
            {loading ? "Проверка..." : "Применить"}
          </Button1>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <T1 className="text-green-800 font-medium">
                Промокод {appliedPromoCode.code} применен!
              </T1>
              <T1 className="text-green-600 text-sm">
                Скидка: {formatDiscount(appliedPromoCode.value)}
              </T1>
            </div>
            <button
              onClick={handleRemove}
              className="text-green-600 hover:text-green-800 text-sm underline"
            >
              Убрать
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <T1 className="text-red-800 text-sm">{errorMessage}</T1>
        </div>
      )}
    </div>
  );
}
