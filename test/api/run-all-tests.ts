import { describe } from "vitest";

// Import all test suites
import "./comprehensive-server.test";
import "./payment-integration.test";
import "./utilities.test";
import "./external-services.test";

// Import existing tests
import "./products.test";
import "./orders.test";
import "./recommended.test";
import "./export.test";
import "./order-create.test";

describe("All Server API Tests", () => {
  // This file serves as an entry point to run all server tests
  // Individual test files are imported above and will be executed
});
