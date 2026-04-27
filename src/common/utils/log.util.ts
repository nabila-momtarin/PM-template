function getCallerContext(): string {
  const stack = new Error().stack ?? '';
  // stack lines: [0] Error, [1] getCallerContext, [2] log, [3] actual caller
  const callerLine = stack.split('\n')[3] ?? '';

  // 1. Class method: "at ClassName.methodName"
  const classMatch = callerLine.match(/at (\w+)\./);
  if (classMatch) return classMatch[1];

  // 2. Plain function: "at functionName ("
  const fnMatch = callerLine.match(/at (\w+) \(/);
  if (fnMatch) return fnMatch[1];

  // 3. File name from path: "/path/to/my-file.ts" → "my-file"
  const fileMatch = callerLine.match(/([^/\\]+)\.[tj]s/);
  if (fileMatch) return fileMatch[1];

  return 'App';
}

/**
 * Drop-in replacement for console.log.
 * Auto-serializes objects/arrays — no need for JSON.stringify.
 * Prefixes output with the caller's class/function name.
 *
 * @example
 * log('hello');
 * log('user', user);
 * log('ids', businessIds, 'extra', { foo: 1 });
 */
export function log(...args: unknown[]): void {
  const context = getCallerContext();
  const message = args
    .map((a) =>
      a === null || a === undefined
        ? String(a)
        : typeof a === 'object'
          ? JSON.stringify(a, null, 2)
          : String(a),
    )
    .join(' ');
  console.log(`[${context}]`, message);
}
