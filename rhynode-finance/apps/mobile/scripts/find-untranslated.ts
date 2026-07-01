import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const ROOT = path.resolve(__dirname, '../');
const SCAN_DIRS = ['app', 'src'];

// Props that should contain user-facing text and therefore must use t() / i18n.t().
const UI_TEXT_PROPS = new Set([
  'title', 'label', 'placeholder', 'message', 'subtitle',
  'accessibilityLabel', 'accessibilityHint', 'promptMessage', 'fallbackLabel',
]);

const ALLOWED_VALUES = new Set([
  '', ' ', '●', '⌫',
]);

function isAllowedValue(value: string): boolean {
  if (ALLOWED_VALUES.has(value)) return true;
  if (value.length === 0) return true;
  if (/^[\s\p{Emoji}]*$/u.test(value)) return true;
  if (/^\d+(\.\d+)?$/.test(value)) return true;
  return false;
}

function isTCall(node: ts.Node): boolean {
  if (!ts.isCallExpression(node)) return false;
  const expr = node.expression;
  if (ts.isIdentifier(expr) && expr.text === 't') return true;
  if (ts.isPropertyAccessExpression(expr) && expr.name.text === 't') return true;
  return false;
}

function isToastCall(node: ts.Node): boolean {
  if (!ts.isCallExpression(node)) return false;
  const expr = node.expression;
  return ts.isIdentifier(expr) && expr.text === 'showToast';
}

function isAlertCall(node: ts.Node): boolean {
  if (!ts.isCallExpression(node)) return false;
  const expr = node.expression;
  return ts.isPropertyAccessExpression(expr) && expr.name.text === 'alert';
}

function isConsoleCall(node: ts.Node): boolean {
  if (!ts.isCallExpression(node)) return false;
  const expr = node.expression;
  return ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression) && expr.expression.text === 'console';
}

function findSuspectStrings(filePath: string): Array<{ line: number; col: number; value: string; context: string }> {
  const source = fs.readFileSync(filePath, 'utf8');
  const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind);
  const results: Array<{ line: number; col: number; value: string; context: string }> = [];

  function visit(node: ts.Node) {
    if (ts.isJsxText(node)) {
      const text = node.text.trim();
      if (/[a-zA-Z]/.test(text) && text.length > 0 && !isAllowedValue(text)) {
        report(node, text);
      }
      return;
    }

    if (!ts.isStringLiteral(node) && !ts.isNoSubstitutionTemplateLiteral(node)) {
      ts.forEachChild(node, visit);
      return;
    }

    const value = node.text;
    if (isAllowedValue(value)) {
      ts.forEachChild(node, visit);
      return;
    }

    const parent = node.parent;

    // Skip strings inside imports/exports and type constructs.
    if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return;
    if (ts.isTypeReferenceNode(parent) || ts.isTypeAliasDeclaration(parent) || ts.isInterfaceDeclaration(parent)) return;
    if (ts.isUnionTypeNode(parent) || ts.isLiteralTypeNode(parent)) return;
    if (ts.isEnumMember(parent) || ts.isEnumDeclaration(parent)) return;
    if ((ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent)) && (parent.name as ts.Node) === node) return;
    if (ts.isJsxAttribute(parent) && (parent.name as ts.Node) === node) return;
    if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.InKeyword) return;
    if (ts.isTemplateSpan(parent) || ts.isTemplateExpression(parent)) return;

    // Skip console and t() calls.
    if (isConsoleCall(parent)) return;
    if (isTCall(parent)) return;

    // JSX text props must use t()/i18n.t().
    if (ts.isJsxAttribute(parent)) {
      const attrName = parent.name.getText();
      if (UI_TEXT_PROPS.has(attrName)) {
        report(node, value);
      }
      return;
    }

    // showToast and Alert.alert arguments must be translated.
    if (isToastCall(parent)) {
      const call = parent as ts.CallExpression;
      if (call.arguments[0] === node) report(node, value);
      return;
    }

    if (isAlertCall(parent)) {
      const call = parent as ts.CallExpression;
      if (call.arguments[0] === node || call.arguments[1] === node) report(node, value);
      return;
    }

    ts.forEachChild(node, visit);
  }

  function report(node: ts.Node, value: string) {
    const pos = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart(sourceFile));
    const lineText = source.split('\n')[pos.line] ?? '';
    results.push({
      line: pos.line + 1,
      col: pos.character + 1,
      value: value.length > 80 ? value.slice(0, 80) + '...' : value,
      context: lineText.trim(),
    });
  }

  visit(sourceFile);
  return results;
}

function walk(dir: string, files: string[]) {
  for (const entry of fs.readdirSync(dir)) {
    if (entry === '__tests__' || entry === 'scripts' || entry === 'node_modules') continue;
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
}

const files: string[] = [];
for (const d of SCAN_DIRS) {
  const p = path.join(ROOT, d);
  if (fs.existsSync(p)) walk(p, files);
}

const findings: Array<{ file: string; line: number; col: number; value: string; context: string }> = [];
for (const file of files) {
  const suspects = findSuspectStrings(file);
  for (const s of suspects) {
    findings.push({ file: path.relative(ROOT, file), ...s });
  }
}

if (findings.length > 0) {
  console.error(`Found ${findings.length} potentially untranslated string(s):\n`);
  for (const f of findings) {
    console.error(`${f.file}:${f.line}:${f.col}  "${f.value}"`);
    console.error(`  ${f.context}\n`);
  }
  process.exit(1);
}

console.log('No untranslated strings detected.');
