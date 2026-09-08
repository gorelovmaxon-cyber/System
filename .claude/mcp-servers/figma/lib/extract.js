'use strict';

function hex(color) {
  if (!color || ['r', 'g', 'b'].some(key => typeof color[key] !== 'number')) return null;
  const channel = value => Math.max(0, Math.min(255, Math.round(value * 255))).toString(16).padStart(2, '0');
  return '#' + channel(color.r) + channel(color.g) + channel(color.b);
}

function origin(path, id) {
  return { node: path || 'document', node_id: id || null };
}

function rgba(color, opacity = 1) {
  const value = hex(color);
  return value ? { value: value.toUpperCase(), opacity: Number(opacity), alpha: opacity < 1 ? true : undefined } : null;
}

function extractDesignTokens(file, options = {}) {
  const scope = options.scope || 'all';
  const result = { colors: [], typography: [], spacing: [], radii: [], ignored: [] };
  const add = (key, value) => { if (scope === 'all' || scope === key) result[key].push(value); };

  for (const [styleId, style] of Object.entries(file.styles || {})) {
    const styleOrigin = origin('styles/' + (style.name || styleId), styleId);
    if (style.styleType === 'FILL') {
      const fill = style.fills?.find(item => item.type === 'SOLID' && item.color);
      const color = fill && rgba(fill.color, fill.opacity ?? 1);
      if (color) add('colors', { name: style.name || styleId, type: 'style', ...color, ...styleOrigin });
    }
    if (style.styleType === 'TEXT') {
      add('typography', {
        name: style.name || styleId,
        type: 'style',
        fontFamily: style.fontFamily || style.fontName?.family || null,
        fontSize: style.fontSize ?? null,
        fontWeight: style.fontWeight ?? style.fontName?.style ?? null,
        lineHeight: style.lineHeightPx ?? style.lineHeight?.value ?? null,
        ...styleOrigin,
      });
    }
  }

  function visit(node, parentPath = '') {
    if (!node || typeof node !== 'object') return;
    const currentPath = parentPath ? parentPath + '/' + (node.name || node.id || 'unnamed') : (node.name || node.id || 'document');
    const nodeOrigin = origin(currentPath, node.id);
    for (const fill of node.fills || []) {
      if (fill.type === 'SOLID' && fill.color) {
        const color = rgba(fill.color, (fill.opacity ?? 1) * (node.opacity ?? 1));
        if (color) add('colors', { name: node.name || node.id, type: 'fill', ...color, ...nodeOrigin });
      } else if (fill.type && fill.type !== 'SOLID') {
        result.ignored.push({ kind: 'fill', type: fill.type, ...nodeOrigin });
      }
    }

    const textStyle = node.style || {};
    if (node.type === 'TEXT' || textStyle.fontFamily || textStyle.fontSize) {
      add('typography', {
        name: node.name || node.id,
        type: 'node',
        fontFamily: textStyle.fontFamily || textStyle.fontName?.family || null,
        fontSize: textStyle.fontSize ?? null,
        fontWeight: textStyle.fontWeight ?? textStyle.fontName?.style ?? null,
        lineHeight: textStyle.lineHeightPx ?? null,
        ...nodeOrigin,
      });
    }

    const padding = {};
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      const value = node['padding' + side];
      if (typeof value === 'number') padding[side.toLowerCase()] = value;
    }
    if (Object.keys(padding).length) {
      add('spacing', {
        name: node.name || node.id,
        padding,
        gap: typeof node.itemSpacing === 'number' ? node.itemSpacing : null,
        ...nodeOrigin,
      });
    }

    const radius = {};
    for (const [key, field] of Object.entries({ tl: 'topLeftRadius', tr: 'topRightRadius', br: 'bottomRightRadius', bl: 'bottomLeftRadius' })) {
      if (typeof node[field] === 'number') radius[key] = node[field];
    }
    if (typeof node.cornerRadius === 'number') {
      for (const key of ['tl', 'tr', 'br', 'bl']) radius[key] = node.cornerRadius;
    }
    if (Object.keys(radius).length) add('radii', { name: node.name || node.id, radius, ...nodeOrigin });

    for (const child of node.children || []) visit(child, currentPath);
  }

  visit(file.document);
  return result;
}

module.exports = { extractDesignTokens, hex };

