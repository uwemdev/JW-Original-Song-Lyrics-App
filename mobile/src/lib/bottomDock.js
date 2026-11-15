export const DOCK_GAP = 8;
export const INITIAL_MINI_PLAYER_HEIGHT = 68;

export function getTabBarHeight(platform, bottomInset) {
  return (platform === 'ios' ? 88 : 72) + bottomInset;
}

export function getMiniPlayerBottom(platform, bottomInset) {
  return getTabBarHeight(platform, bottomInset) + DOCK_GAP;
}

export function getChatBottomPadding(platform, bottomInset, playerVisible, playerHeight, keyboardVisible) {
  if (keyboardVisible) return DOCK_GAP;
  return getMiniPlayerBottom(platform, bottomInset) + (playerVisible ? playerHeight + DOCK_GAP : 0);
}
