export interface CategoryCardItem {
  age: string;
  image: string;
  link: string;
  color: string;
  badges: string[];
}

export interface CategoryBadgeItem {
  label: string;
  onClick?: () => void;
  value?: boolean;
}
