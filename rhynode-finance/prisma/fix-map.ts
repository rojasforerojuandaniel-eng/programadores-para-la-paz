import { readFileSync, writeFileSync } from "fs";

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

function fixMapInSchema(filePath: string) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match field lines with optional comment
    // Group 1: indent, Group 2: field name, Group 3: field type, Group 4: rest before comment, Group 5: comment
    const match = trimmed.match(/^(\s*)(\w+)\s+([A-Z][a-zA-Z0-9_]+(\[\])?\??)(\s+[^\/]*)?(\s*\/\/.*)?$/);
    if (match) {
      const indent = match[1];
      const fieldName = match[2];
      const fieldType = match[3];
      const beforeComment = match[5] || "";
      const comment = match[6] || "";

      const scalarTypes = [
        "String", "Int", "Float", "Boolean", "DateTime", "Json", "Decimal",
        "BigInt", "Bytes", "UUID", "Cuid", "Cuid2", "Ulid", "String[]", "Int[]", "Float[]",
      ];
      const isScalar = scalarTypes.some(t => fieldType.startsWith(t) || fieldType === t);

      if (isScalar && !beforeComment.includes("@map") && fieldName !== toSnakeCase(fieldName)) {
        const snake = toSnakeCase(fieldName);
        const newBeforeComment = beforeComment.trim() + ` @map("${snake}")`;
        out.push(`${indent}${fieldName} ${fieldType}${newBeforeComment}${comment}`);
      } else {
        out.push(line);
      }
    } else {
      out.push(line);
    }
  }

  writeFileSync(filePath, out.join("\n"));
  // eslint-disable-next-line no-console
  console.log(`Fixed ${filePath}`);
}

fixMapInSchema("prisma/schema.prisma");
