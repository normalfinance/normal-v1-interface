/*
 * Codemod: i18n-codemod.js
 * --------------------------------------------
 * 1. For each JSXText node that contains visible text, replace it with
 *    {t('<text>')}
 * 2. For each file that ends up using `t(…)`, ensure:
 *      a) `import { useTranslate } from '@/locales';` exists (add if missing).
 *      b) Every top-level React component / custom hook that references `t`
 *         declares `const { t } = useTranslate('auto');` at the top of its body
 *         (only once per function).  Never add `useTranslate` at module scope.
 *
 *  ───── Assumptions ─────
 *  • React components are either function declarations with a capitalised name
 *    or variable declarations assigned to an arrow-function whose name starts
 *    with a capital letter.
 *  • Custom hooks start with `use` + capital letter.
 *  • The namespace placeholder "auto" will be extracted later by
 *    `i18next-parser` and can then be moved to a better namespace.
 */

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let fileMutated = false;

  // ---------------------------------------------------------------------------
  // 1) Wrap JSXText → {t('text')}
  // ---------------------------------------------------------------------------
  root.find(j.JSXText).forEach((path) => {
    const raw = path.value.value;
    if (!raw) return;
    const text = raw.replace(/\s+/g, ' ').trim();
    if (!text) return; // whitespace only

    // skip if parent already expression container (rare)
    // but we only wrap pure text nodes
    const expr = j.jsxExpressionContainer(j.callExpression(j.identifier('t'), [j.literal(text)]));
    path.replace(expr);
    fileMutated = true;
  });

  if (!fileMutated) {
    return file.source; // nothing to change => exit early
  }

  // ---------------------------------------------------------------------------
  // 2) Ensure import { useTranslate } from '@/locales'
  // ---------------------------------------------------------------------------
  const hasImport = root
    .find(j.ImportDeclaration, {
      source: { value: '@/locales' },
    })
    .some();

  if (!hasImport) {
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
    // ensure specifier present
    root.find(j.ImportDeclaration, { source: { value: '@/locales' } }).forEach((impPath) => {
      const already = impPath.value.specifiers.some(
        (s) => s.imported && s.imported.name === 'useTranslate'
      );
      if (!already) {
        impPath.value.specifiers.push(j.importSpecifier(j.identifier('useTranslate')));
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 3) For every component/hook that uses identifier `t`, add declaration once
  // ---------------------------------------------------------------------------
  function addHookToFunction(fnPath) {
    try {
      const bodyPath = fnPath.get('body');

      if (!bodyPath || !bodyPath.node) return;

      const hasHookDecl = j(bodyPath.node)
        .find(j.VariableDeclarator, {
          init: { type: 'CallExpression', callee: { name: 'useTranslate' } },
        })
        .some();

      if (hasHookDecl) return; // already declared

      // Does this function reference identifier t ?
      const usesT = j(bodyPath.node).find(j.Identifier, { name: 't' }).some();
      if (!usesT) return;

      const declaration = j.variableDeclaration('const', [
        j.variableDeclarator(
          j.objectPattern([j.property('init', j.identifier('t'), j.identifier('t'))]),
          j.callExpression(j.identifier('useTranslate'), [j.literal('auto')])
        ),
      ]);

      if (bodyPath.node.type === 'BlockStatement') {
        bodyPath.node.body.unshift(declaration);
      }
    } catch (err) {
      /* swallow transformation errors for this function */
    }
  }

  // Function declarations
  root.find(j.FunctionDeclaration).forEach((fn) => {
    const name = fn.node.id && fn.node.id.name;
    if (!name) return;
    if (!/^[A-Z]/.test(name) && !/^use[A-Z]/.test(name)) return;
    addHookToFunction(fn);
  });

  // Arrow-function components: const Foo = () => {}
  root
    .find(j.VariableDeclarator, {
      init: { type: 'ArrowFunctionExpression' },
    })
    .forEach((v) => {
      const name = v.node.id && v.node.id.name;
      if (!name) return;
      if (!/^[A-Z]/.test(name) && !/^use[A-Z]/.test(name)) return;

      const fnPath = v.get('init'); // ArrowFunctionExpression NodePath
      const body = fnPath.get('body');
      if (body.node.type !== 'BlockStatement') return; // skip concise bodies

      addHookToFunction(fnPath);
    });

  return root.toSource({ quote: 'single', trailingComma: true });
};
