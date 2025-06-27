/*
 * Codemod: repair-i18n-hook.js
 * --------------------------------------------
 * 1. Removes module-scope `const { t } = useTranslate('auto');`
 * 2. Inserts that declaration inside each top-level React component / custom hook
 *    that actually uses the identifier `t` and does not already declare it.
 */

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let mutated = false;

  // ------------------------------------------------------------------
  // Remove top-level hook declaration
  // ------------------------------------------------------------------
  root.find(j.VariableDeclaration).forEach((path) => {
    if (path.parentPath.value.type !== 'Program') return;
    const shouldRemove = path.node.declarations.some((d) => {
      return d.init && d.init.type === 'CallExpression' && d.init.callee.name === 'useTranslate';
    });
    if (shouldRemove) {
      j(path).remove();
      mutated = true;
    }
  });

  // Helper: create declaration node
  function createTDeclaration() {
    return j.variableDeclaration('const', [
      j.variableDeclarator(
        j.objectPattern([j.property('init', j.identifier('t'), j.identifier('t'))]),
        j.callExpression(j.identifier('useTranslate'), [j.literal('auto')])
      ),
    ]);
  }

  function needsInjection(fnPath) {
    const body = fnPath.get('body');
    const hasTDeclaration = j(body)
      .find(j.VariableDeclarator, {
        id: { type: 'ObjectPattern' },
        init: {
          type: 'CallExpression',
          callee: { name: 'useTranslate' },
        },
      })
      .size();

    if (hasTDeclaration) return false;

    // Does function use identifier "t" ?
    const usesT = j(body)
      .find(j.Identifier, { name: 't' })
      .filter((idPath) => {
        // ignore property keys (obj t: value) etc.
        const parent = idPath.parent.node;
        return parent.type !== 'Property' || parent.key !== idPath.node;
      })
      .size();

    return usesT > 0;
  }

  // ------------------------------------------------------------------
  // Inject into Function Declarations
  // ------------------------------------------------------------------
  root.find(j.FunctionDeclaration).forEach((path) => {
    const name = path.node.id && path.node.id.name;
    if (!name) return;
    if (!/^[A-Z]/.test(name) && !/^use[A-Z]/.test(name)) return;
    if (!needsInjection(path)) return;

    path.get('body').get('body').unshift(createTDeclaration());
    mutated = true;
  });

  // ------------------------------------------------------------------
  // Inject into const Component = () => { ... }
  // ------------------------------------------------------------------
  root
    .find(j.VariableDeclarator, {
      init: { type: 'ArrowFunctionExpression' },
    })
    .forEach((vPath) => {
      const name = vPath.node.id && vPath.node.id.name;
      if (!name) return;
      if (!/^[A-Z]/.test(name) && !/^use[A-Z]/.test(name)) return;

      const bodyPath = vPath.get('init', 'body');
      // Only handle block bodies { ... }
      if (bodyPath.node.type !== 'BlockStatement') return;

      if (!needsInjection(bodyPath)) return;

      bodyPath.get('body').unshift(createTDeclaration());
      mutated = true;
    });

  if (!mutated) return file.source;
  return root.toSource({ quote: 'single', trailingComma: true });
};
