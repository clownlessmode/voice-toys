import nextVitals from "eslint-config-next/core-web-vitals";
import security from "eslint-plugin-security";

const eslintConfig = [
  ...nextVitals,
  security.configs.recommended,
  {
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
