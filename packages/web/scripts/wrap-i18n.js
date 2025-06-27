/*
 * Codemod: wrap-i18n.js
 * --------------------------------------------
 * For each JSXText literal inside markup it converts:
 *   <Typography>Hello World</Typography>
 * into
 *   const { t } = useTranslate('auto');
 *   <Typography>{t('Hello World')}</Typography>
 *
 * It also auto-adds the `useTranslate` import from '@/locales' when missing.
 * The namespace is temporarily set to "auto" – run i18next-parser afterwards
 * to extract keys into src/locales/langs/<lang>/auto.json and later move them
 * to proper namespaces.
 */

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let mutated = false;

  // 1. Replace JSXText nodes
  root.find(j.JSXText).forEach((p) => {
    const text = p.value.value;
    if (!text || text.trim() === '') return; // skip whitespace

    // skip if parent is JSXExpressionContainer (already expression) or text contains only \n
    const trimmed = text.trim();
    if (trimmed === '') return;

    // Create {t('Some text')}
    const callExpr = j.callExpression(j.identifier('t'), [j.literal(trimmed)]);
    const exprContainer = j.jsxExpressionContainer(callExpr);
    p.replace(exprContainer);
    mutated = true;
  });

  if (!mutated) {
    return file.source; // no changes
  }

  // 2. Ensure useTranslate import exists
  const importDecl = root.find(j.ImportDeclaration, {
    source: { value: '@/locales' },
  });

  if (importDecl.length === 0) {
    const firstImport = root.find(j.ImportDeclaration).at(0);
    const newImport = j.importDeclaration(
      [j.importSpecifier(j.identifier('useTranslate'))],
      j.literal('@/locales')
    );
    if (firstImport.size()) {
      firstImport.insertBefore(newImport);
    } else {
      root.get().node.program.body.unshift(newImport);
    }
  } else {
    // ensure useTranslate is in specifiers
    importDecl.forEach((path) => {
      const already = path.value.specifiers.some(
        (s) => s.imported && s.imported.name === 'useTranslate'
      );
      if (!already) {
        path.value.specifiers.push(j.importSpecifier(j.identifier('useTranslate')));
      }
    });
  }

  // 3. Add const { t } = useTranslate('auto'); if not present
  const hasTConst = root
    .find(j.VariableDeclarator, {
      id: { type: 'ObjectPattern' },
      init: {
        type: 'CallExpression',
        callee: { name: 'useTranslate' },
      },
    })
    .some();

  if (!hasTConst) {
    // insert after last import
    const allImports = root.find(j.ImportDeclaration);
    const lastImport = allImports.at(allImports.size() - 1);
    const varDecl = j.variableDeclaration('const', [
      j.variableDeclarator(
        j.objectPattern([j.property('init', j.identifier('t'), j.identifier('t'))]),
        j.callExpression(j.identifier('useTranslate'), [j.literal('auto')])
      ),
    ]);

    if (lastImport.size()) {
      lastImport.insertAfter(varDecl);
    } else {
      root.get().node.program.body.unshift(varDecl);
    }
  }

  return root.toSource({ quote: 'single', trailingComma: true });
};
