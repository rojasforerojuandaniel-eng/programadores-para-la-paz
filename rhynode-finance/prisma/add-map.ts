import { readFileSync, writeFileSync } from "fs";

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

function addMapToSchema(filePath: string) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match field lines: `  name String` or `  name String?`
    const match = trimmed.match(/^(\s*)(\w+)\s+([A-Z][a-zA-Z0-9_]+(\[\])?\??)(\s*.*)?$/);
    if (match) {
      const indent = match[1];
      const fieldName = match[2];
      const fieldType = match[3];
      let rest = match[5] || "";

      // Skip relation fields (types that start with uppercase and are not scalar types)
      const scalarTypes = [
        "String", "Int", "Float", "Boolean", "DateTime", "Json", "Decimal",
        "BigInt", "Bytes", "UUID", "Cuid", "Cuid2", "Ulid", "String[]", "Int[]", "Float[]",
      ];
      const isScalar = scalarTypes.some(t => fieldType.startsWith(t) || fieldType === t);

      // Skip if already has @map
      if (isScalar && !rest.includes("@map") && fieldName !== toSnakeCase(fieldName)) {
        const snake = toSnakeCase(fieldName);
        if (!rest.trim()) {
          rest = ` @map("${snake}")`;
        } else {
          rest = ` ${rest.trim()} @map("${snake}")`;
        }
      }

      out.push(`${indent}${fieldName} ${fieldType}${rest}`);
    } else {
      out.push(line);
    }
  }

  writeFileSync(filePath, out.join("\n"));
  // eslint-disable-next-line no-console
  console.log(`Updated ${filePath}`);
}

addMapToSchema("prisma/schema.prisma");
