export enum PromoCodeType {
  PERCENTAGE = "PERCENTAGE",
  FIXED_AMOUNT = "FIXED_AMOUNT",
}

export interface PromoCode {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: PromoCodeType;
  value: number;
  minOrderAmount?: number;
  maxUses?: number;
  currentUses: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePromoCodeRequest {
  code: string;
  name: string;
  description?: string;
  type: PromoCodeType;
  value: number;
  minOrderAmount?: number;
  maxUses?: number;
  validFrom: Date;
  validUntil: Date;
  isActive?: boolean;
}

export interface UpdatePromoCodeRequest {
  name?: string;
  description?: string;
  type?: PromoCodeType;
  value?: number;
  minOrderAmount?: number;
  maxUses?: number;
  validFrom?: Date;
  validUntil?: Date;
  isActive?: boolean;
}

export interface PromoCodeFilters {
  search?: string;
  type?: PromoCodeType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PromoCodeValidationResult {
  isValid: boolean;
  discountAmount: number;
  error?: string;
}
