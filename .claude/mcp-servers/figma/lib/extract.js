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
  const scoped = options.nodeId !== undefined && options.nodeId !== null;
  const result = { colors: [], typography: [], spacing: [], radii: [], ignored: [] };
  const add = (key, value) => { if (scope === 'all' || scope === key) result[key].push(value); };

  // File-wide styles собираются заранее, но публикуются после обхода. Ответ с
  // nodeId ограничен выбранным поддеревом, поэтому стиль попадает в него только
  // если на него ссылается узел поддерева (node.styles). Прочие не отбрасываются
  // молча, а перечисляются в ignored с причиной — иначе вызывающий не отличает
  // «стиля нет» от «стиль вне выбранной области».
  const pendingStyles = [];
  for (const [styleId, style] of Object.entries(file.styles || {})) {
    const styleOrigin = origin('styles/' + (style.name || styleId), styleId);
    const entry = { key: null, styleId, name: style.name || styleId, origin: styleOrigin, value: null };
    if (style.styleType === 'FILL') {
      const fill = style.fills?.find(item => item.type === 'SOLID' && item.color);
      const color = fill && rgba(fill.color, fill.opacity ?? 1);
      if (color) {
        entry.key = 'colors';
        entry.value = { name: style.name || styleId, type: 'style', ...color, ...styleOrigin };
      }
    }
    if (style.styleType === 'TEXT') {
      entry.key = 'typography';
      entry.value = {
        name: style.name || styleId,
        type: 'style',
        fontFamily: style.fontFamily || style.fontName?.family || null,
        fontSize: style.fontSize ?? null,
        fontWeight: style.fontWeight ?? style.fontName?.style ?? null,
        lineHeight: style.lineHeightPx ?? style.lineHeight?.value ?? null,
        ...styleOrigin,
      };
    }
    if (entry.key) pendingStyles.push(entry);
  }

  const usedStyles = new Set();

  function visit(node, parentPath = '') {
    if (!node || typeof node !== 'object') return;
    const currentPath = parentPath ? parentPath + '/' + (node.name || node.id || 'unnamed') : (node.name || node.id || 'document');
    const nodeOrigin = origin(currentPath, node.id);
    for (const styleId of Object.values(node.styles || {})) usedStyles.add(String(styleId));
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
    // gap без padding — самостоятельный признак раскладки: без него узел с
    // одним itemSpacing не попадал в spacing вовсе.
    if (Object.keys(padding).length || typeof node.itemSpacing === 'number') {
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

  function findNode(node, id) {
    if (!node || typeof node !== 'object') return null;
    if (String(node.id) === String(id)) return node;
    for (const child of node.children || []) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  }

  const selected = options.nodeId === undefined || options.nodeId === null
    ? file.document
    : findNode(file.document, options.nodeId);
  if (!selected) throw new Error('Figma nodeId not found: ' + options.nodeId);
  visit(selected);
  for (const style of pendingStyles) {
    if (scoped && !usedStyles.has(String(style.styleId))) {
      result.ignored.push({
        kind: 'style',
        style_id: style.styleId,
        name: style.name,
        reason: 'not-used-in-scope',
        ...style.origin,
      });
      continue;
    }
    add(style.key, style.value);
  }
  return result;
}

module.exports = { extractDesignTokens, hex };

