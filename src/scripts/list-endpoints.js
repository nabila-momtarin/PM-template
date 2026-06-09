// const fs = require("fs");

// const path = require("path");

// const SRC_DIR = path.join(process.cwd(), "src");
// const API_PREFIX = "/api/v1";

// const HTTP_METHODS = ["Get", "Post", "Patch", "Put", "Delete"];

// function walk(dir, files = []) {
//   if (!fs.existsSync(dir)) {
//     console.error(`src folder not found at: ${dir}`);
//     process.exit(1);
//   }

//   for (const item of fs.readdirSync(dir)) {
//     const fullPath = path.join(dir, item);
//     const stat = fs.statSync(fullPath);

//     if (stat.isDirectory()) {
//       walk(fullPath, files);
//     } else if (item.endsWith(".controller.ts")) {
//       files.push(fullPath);
//     }
//   }

//   return files;
// }

// function cleanRoute(route) {
//   if (!route) return "";

//   return route
//     .trim()
//     .replace(/^['"`]/, "")
//     .replace(/['"`]$/, "")
//     .replace(/^\//, "")
//     .replace(/\/$/, "");
// }

// function joinPaths(...parts) {
//   return parts
//     .filter(Boolean)
//     .join("/")
//     .replace(/\/+/g, "/")
//     .replace(/\/$/, "");
// }

// function extractEndpoints(filePath) {
//   const content = fs.readFileSync(filePath, "utf8");

//   const controllerMatch = content.match(/@Controller\(([^)]*)\)/);
//   const controllerPath = controllerMatch ? cleanRoute(controllerMatch[1]) : "";

//   const classMatch = content.match(/export\s+class\s+(\w+)/);
//   const controllerName = classMatch ? classMatch[1] : path.basename(filePath);

//   const lines = content.split("\n");
//   const endpoints = [];

//   for (let i = 0; i < lines.length; i++) {
//     for (const method of HTTP_METHODS) {
//       const routeMatch = lines[i].match(new RegExp(`@${method}\\(([^)]*)\\)`));

//       if (!routeMatch) continue;

//       const routePath = cleanRoute(routeMatch[1]);

//       let handlerName = "unknownHandler";

//       for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
//         const handlerMatch = lines[j].match(/(?:async\s+)?(\w+)\s*\(/);

//         if (
//           handlerMatch &&
//           !["if", "for", "while", "switch", "return"].includes(handlerMatch[1])
//         ) {
//           handlerName = handlerMatch[1];
//           break;
//         }
//       }

//       endpoints.push({
//         method: method.toUpperCase(),
//         endpoint: joinPaths(API_PREFIX, controllerPath, routePath),
//         controller: controllerName,
//         handler: handlerName,
//         file: path.relative(process.cwd(), filePath),
//       });
//     }
//   }

//   return endpoints;
// }

// const files = walk(SRC_DIR);
// const endpoints = files.flatMap(extractEndpoints);

// endpoints.sort((a, b) => {
//   if (a.endpoint === b.endpoint) return a.method.localeCompare(b.method);
//   return a.endpoint.localeCompare(b.endpoint);
// });

// console.table(
//   endpoints.map((ep) => ({
//     Method: ep.method,
//     Endpoint: ep.endpoint,
//     Controller: ep.controller,
//     Handler: ep.handler,
//     File: ep.file,
//   }))
// );

// console.log(`\nTotal endpoints found: ${endpoints.length}`);



// const fs = require("fs");
// const path = require("path");

// const SRC_DIR = path.join(process.cwd(), "src");
// const API_PREFIX = "/api/v1";

// const HTTP_METHODS = ["Get", "Post", "Patch", "Put", "Delete"];

// const EXCLUDE_PATTERNS = [
//   /^\/api\/v1$/,
//   /^\/api\/v1\/health$/,
//   /^\/api\/v1\/test\//,
//   /^\/api\/v1\/login\/me-test$/,
// ];

// const EXCLUDE_CONTROLLERS = [
//   "AppController",
// ];

// function walk(dir, files = []) {
//   if (!fs.existsSync(dir)) {
//     console.error(`src folder not found at: ${dir}`);
//     process.exit(1);
//   }

//   for (const item of fs.readdirSync(dir)) {
//     const fullPath = path.join(dir, item);
//     const stat = fs.statSync(fullPath);

//     if (stat.isDirectory()) {
//       walk(fullPath, files);
//     } else if (item.endsWith(".controller.ts")) {
//       files.push(fullPath);
//     }
//   }

//   return files;
// }

// function cleanRoute(route) {
//   if (!route) return "";

//   return route
//     .trim()
//     .replace(/^['"`]/, "")
//     .replace(/['"`]$/, "")
//     .replace(/^\//, "")
//     .replace(/\/$/, "");
// }

// function joinPaths(...parts) {
//   return parts
//     .filter(Boolean)
//     .join("/")
//     .replace(/\/+/g, "/")
//     .replace(/\/$/, "");
// }

// function shouldExclude(endpoint, controllerName) {
//   if (EXCLUDE_CONTROLLERS.includes(controllerName)) return true;
//   return EXCLUDE_PATTERNS.some((pattern) => pattern.test(endpoint));
// }

// function findHandlerName(lines, startIndex) {
//   for (let j = startIndex + 1; j < Math.min(startIndex + 20, lines.length); j++) {
//     const line = lines[j].trim();

//     // Skip decorators like @UseGuards(), @UseInterceptors(), @ApiOperation()
//     if (line.startsWith("@")) continue;

//     // Match method declaration
//     const match = line.match(/^(?:async\s+)?([a-zA-Z_$][\w$]*)\s*\(/);

//     if (match) {
//       const name = match[1];

//       if (!["if", "for", "while", "switch", "return"].includes(name)) {
//         return name;
//       }
//     }
//   }

//   return "unknownHandler";
// }

// function extractEndpoints(filePath) {
//   const content = fs.readFileSync(filePath, "utf8");

//   const controllerMatch = content.match(/@Controller\(([^)]*)\)/);
//   const controllerPath = controllerMatch ? cleanRoute(controllerMatch[1]) : "";

//   const classMatch = content.match(/export\s+class\s+(\w+)/);
//   const controllerName = classMatch ? classMatch[1] : path.basename(filePath);

//   const lines = content.split("\n");
//   const endpoints = [];

//   for (let i = 0; i < lines.length; i++) {
//     for (const method of HTTP_METHODS) {
//       const routeMatch = lines[i].match(new RegExp(`@${method}\\(([^)]*)\\)`));

//       if (!routeMatch) continue;

//       const routePath = cleanRoute(routeMatch[1]);
//       const endpoint = joinPaths(API_PREFIX, controllerPath, routePath);

//       if (shouldExclude(endpoint, controllerName)) continue;

//       endpoints.push({
//         method: method.toUpperCase(),
//         endpoint,
//         controller: controllerName,
//         handler: findHandlerName(lines, i),
//         file: path.relative(process.cwd(), filePath),
//       });
//     }
//   }

//   return endpoints;
// }

// const files = walk(SRC_DIR);
// const endpoints = files.flatMap(extractEndpoints);

// const seen = new Map();

// for (const ep of endpoints) {
//   const key = `${ep.method} ${ep.endpoint}`;
//   seen.set(key, (seen.get(key) || 0) + 1);
// }

// const finalEndpoints = endpoints
//   .map((ep) => ({
//     ...ep,
//     duplicate: seen.get(`${ep.method} ${ep.endpoint}`) > 1 ? "YES" : "",
//   }))
//   .sort((a, b) => {
//     if (a.endpoint === b.endpoint) return a.method.localeCompare(b.method);
//     return a.endpoint.localeCompare(b.endpoint);
//   });

// console.table(
//   finalEndpoints.map((ep) => ({
//     Method: ep.method,
//     Endpoint: ep.endpoint,
//     Controller: ep.controller,
//     Handler: ep.handler,
//     Duplicate: ep.duplicate,
//     File: ep.file,
//   }))
// );

// console.log(`\nBusiness endpoints found: ${finalEndpoints.length}`);


const fs = require("fs");
const path = require("path");

/**
 * This script scans NestJS controller files and lists API endpoints.
 *
 * Run from project root:
 * node src/scripts/list-endpoints.js
 */

const SRC_DIR = path.join(process.cwd(), "src");
const API_PREFIX = "/api/v1";

const HTTP_METHODS = ["Get", "Post", "Patch", "Put", "Delete"];

/**
 * Routes/controllers we do NOT want in business API list.
 * Mandatory? Optional.
 * Mandatory if you want clean production/business endpoint list.
 */
const EXCLUDE_PATTERNS = [
  /^\/api\/v1$/,
  /^\/api\/v1\/health$/,
  /^\/api\/v1\/test\//,
  /^\/api\/v1\/login\/me-test$/,
  /^\/api\/v1\/login\/me$/,
];

const EXCLUDE_CONTROLLERS = ["AppController"];

/**
 * Remove comments before regex parsing.
 * Mandatory.
 * Without this, script may detect fake routes from comments like:
 * // routes must stay before @Get(':taskId')
 */
function removeComments(source) {
  return source
    // remove block comments: /* ... */
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // remove single-line comments: // ...
    .replace(/^\s*\/\/.*$/gm, "");
}

/**
 * Recursively find all .controller.ts files inside src.
 */
function walk(dir, files = []) {
  if (!fs.existsSync(dir)) {
    console.error(`❌ src folder not found at: ${dir}`);
    process.exit(1);
  }

  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath, files);
    } else if (item.endsWith(".controller.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Clean route string from decorators.
 *
 * Examples:
 * "'tasks'"  -> "tasks"
 * "':id'"    -> ":id"
 * "''"       -> ""
 */
function cleanRoute(route) {
  if (!route) return "";

  return route
    .trim()
    .replace(/^['"`]/, "")
    .replace(/['"`]$/, "")
    .replace(/^\//, "")
    .replace(/\/$/, "");
}

/**
 * Join API prefix + controller path + route path safely.
 */
function joinPaths(...parts) {
  return parts
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
}

/**
 * Check whether endpoint should be excluded.
 */
function shouldExclude(endpoint, controllerName) {
  if (EXCLUDE_CONTROLLERS.includes(controllerName)) return true;

  return EXCLUDE_PATTERNS.some((pattern) => pattern.test(endpoint));
}

/**
 * Find actual handler method after route decorator.
 *
 * It skips decorators like:
 * @UseGuards()
 * @UseInterceptors()
 * @ApiOperation()
 */
function findHandlerName(lines, startIndex) {
  for (let j = startIndex + 1; j < Math.min(startIndex + 25, lines.length); j++) {
    const line = lines[j].trim();

    // skip empty lines
    if (!line) continue;

    // skip decorators
    if (line.startsWith("@")) continue;

    // match class method:
    // async getTask(...)
    // getTask(...)
    const match = line.match(/^(?:async\s+)?([a-zA-Z_$][\w$]*)\s*\(/);

    if (!match) continue;

    const name = match[1];

    // safety ignore JS keywords
    if (["if", "for", "while", "switch", "return", "catch"].includes(name)) {
      continue;
    }

    return name;
  }

  return "unknownHandler";
}

/**
 * Extract endpoints from one controller file.
 */
function extractEndpoints(filePath) {
  const rawContent = fs.readFileSync(filePath, "utf8");
  const content = removeComments(rawContent);

  const controllerMatch = content.match(/@Controller\(([^)]*)\)/);
  const controllerPath = controllerMatch ? cleanRoute(controllerMatch[1]) : "";

  const classMatch = content.match(/export\s+class\s+(\w+)/);
  const controllerName = classMatch ? classMatch[1] : path.basename(filePath);

  const lines = content.split("\n");
  const endpoints = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();

    if (!trimmedLine) continue;

    for (const method of HTTP_METHODS) {
      const routeMatch = trimmedLine.match(new RegExp(`@${method}\\(([^)]*)\\)`));

      if (!routeMatch) continue;

      const routePath = cleanRoute(routeMatch[1]);
      const endpoint = joinPaths(API_PREFIX, controllerPath, routePath);

      if (shouldExclude(endpoint, controllerName)) continue;

      endpoints.push({
        method: method.toUpperCase(),
        endpoint,
        controller: controllerName,
        handler: findHandlerName(lines, i),
        file: path.relative(process.cwd(), filePath),
      });
    }
  }

  return endpoints;
}

/**
 * Normalize parameter names for duplicate/conflict checking.
 *
 * Example:
 * /tasks/:id
 * /tasks/:taskId
 *
 * Both normalize to:
 * /tasks/:param
 */
function normalizeParams(endpoint) {
  return endpoint.replace(/:[^/]+/g, ":param");
}

/**
 * Main execution.
 */
const controllerFiles = walk(SRC_DIR);
const endpoints = controllerFiles.flatMap(extractEndpoints);

/**
 * Detect exact duplicates.
 */
const exactSeen = new Map();

for (const ep of endpoints) {
  const key = `${ep.method} ${ep.endpoint}`;
  exactSeen.set(key, (exactSeen.get(key) || 0) + 1);
}

/**
 * Detect route conflicts with different param names.
 *
 * Example:
 * GET /api/v1/tasks/:id
 * GET /api/v1/tasks/:taskId
 */
const normalizedSeen = new Map();

for (const ep of endpoints) {
  const key = `${ep.method} ${normalizeParams(ep.endpoint)}`;

  if (!normalizedSeen.has(key)) {
    normalizedSeen.set(key, []);
  }

  normalizedSeen.get(key).push(ep.endpoint);
}

const finalEndpoints = endpoints
  .map((ep) => {
    const exactKey = `${ep.method} ${ep.endpoint}`;
    const normalizedKey = `${ep.method} ${normalizeParams(ep.endpoint)}`;

    const normalizedMatches = normalizedSeen.get(normalizedKey) || [];
    const uniqueNormalizedMatches = [...new Set(normalizedMatches)];

    return {
      ...ep,
      duplicate: exactSeen.get(exactKey) > 1 ? "YES" : "",
      conflict:
        uniqueNormalizedMatches.length > 1
          ? `CHECK: ${uniqueNormalizedMatches.join(" | ")}`
          : "",
    };
  })
  .sort((a, b) => {
    if (a.endpoint === b.endpoint) return a.method.localeCompare(b.method);
    return a.endpoint.localeCompare(b.endpoint);
  });

console.table(
  finalEndpoints.map((ep) => ({
    Method: ep.method,
    Endpoint: ep.endpoint,
    Controller: ep.controller,
    Handler: ep.handler,
    Duplicate: ep.duplicate,
    Conflict: ep.conflict,
    File: ep.file,
  }))
);

console.log(`\n✅ Business endpoints found: ${finalEndpoints.length}`);

/**
 * Optional: print conflicts separately for easier checking.
 */
const conflicts = finalEndpoints.filter((ep) => ep.conflict);

if (conflicts.length > 0) {
  console.log("\n⚠️ Possible route conflicts found:");

  for (const ep of conflicts) {
    console.log(`- ${ep.method} ${ep.endpoint}`);
    console.log(`  ${ep.conflict}`);
  }
} else {
  console.log("\n✅ No parameter-name route conflicts found.");
}