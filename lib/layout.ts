/** Shared bottom chrome dimensions — keep FABs and nav bars aligned */
export const bottomChrome = {
  gap: 8,
  quickAccessHeight: 76,
  bottomNavHeight: 60,
  fabSize: 48,
  primaryFabSize: 56,
  fabGap: 10,
};

export function bottomStackHeight(includeQuickAccess: boolean, includeBottomNav: boolean) {
  let h = 0;
  if (includeQuickAccess) h += bottomChrome.quickAccessHeight + bottomChrome.gap;
  if (includeBottomNav) h += bottomChrome.bottomNavHeight + bottomChrome.gap;
  return h;
}

export function fabColumnBottom(safeBottom: number, stackHeight: number) {
  return safeBottom + stackHeight + bottomChrome.gap + 4;
}
