import type { CartItem, MenuItemOption } from '../types/database';

// Legacy options were sold as complete variants. Never infer price semantics
// from the amount: a cheap size is still a size, including the last available one.
export function classifyOptions(options: MenuItemOption[], _basePrice?: number) {
  return {
    sizes: options.filter(o => o.available !== false && o.option_type !== 'extra'),
    extras: options.filter(o => o.available !== false && o.option_type === 'extra'),
  };
}

export function cartLineKey(item: CartItem): string {
  return JSON.stringify([
    item.menu_item.id, item.menu_item.name, item.menu_item.price,
    [...item.selected_options].map(o => [o.id, o.price]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    item.notes.trim(),
  ]);
}
