export const DOCK_GAP = 8;
export const INITIAL_MINI_PLAYER_HEIGHT = 68;

export function getTabBarHeight(platform, bottomInset = 0) {
  return (platform === 'ios' ? 88 : 72) + (bottomInset || 0);
}

export function getMiniPlayerBottom(platform, bottomInset = 0) {
  return getTabBarHeight(platform, bottomInset) + DOCK_GAP;
}

export function getChatBottomPadding(
  platform,
  bottomInset = 0,
  playerVisible = false,
  playerHeight = INITIAL_MINI_PLAYER_HEIGHT,
  keyboardVisible = false,
  keyboardHeight = 0,
  didWindowResize = false
) {
  if (keyboardVisible) {
    if (platform === 'ios') {
      return Math.max(DOCK_GAP, bottomInset || 0);
    }
    // On Android: if window already resized, small gap; otherwise lift by full keyboard height
    if (didWindowResize) {
      return DOCK_GAP;
    }
    return keyboardHeight > 0 ? keyboardHeight : 280;
  }
  return getMiniPlayerBottom(platform, bottomInset) + (playerVisible ? playerHeight + DOCK_GAP : 0);
}
