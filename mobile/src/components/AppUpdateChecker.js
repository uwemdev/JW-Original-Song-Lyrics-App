import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import {
  CURRENT_APP_VERSION,
  fetchVersionConfig,
  compareVersions,
  isUpdateDismissed,
} from '../lib/versionCheck';
import UpdateModal from './UpdateModal';

export default function AppUpdateChecker() {
  const [modalVisible, setModalVisible] = useState(false);
  const [versionConfig, setVersionConfig] = useState(null);
  const [isForced, setIsForced] = useState(false);
  const checkingRef = useRef(false);

  const checkVersion = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      const config = await fetchVersionConfig();
      if (!config || !config.latest_version) {
        checkingRef.current = false;
        return;
      }

      setVersionConfig(config);

      const hasNewerVersion = compareVersions(CURRENT_APP_VERSION, config.latest_version) < 0;
      const isBelowMin = compareVersions(CURRENT_APP_VERSION, config.min_required_version) < 0;
      const forced = Boolean(config.force_update || isBelowMin);

      setIsForced(forced);

      if (forced) {
        // Forced updates always show regardless of prior dismissal
        setModalVisible(true);
      } else if (hasNewerVersion) {
        // Optional update: only show if user hasn't dismissed this version yet
        const dismissed = await isUpdateDismissed(config.latest_version);
        if (!dismissed) {
          setModalVisible(true);
        }
      } else {
        setModalVisible(false);
      }
    } catch (err) {
      console.warn('[AppUpdateChecker] Check failed:', err);
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // 1. Initial check on mount
    checkVersion();

    // 2. Re-check when app returns to foreground
    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkVersion();
      }
    });

    // 3. Realtime listener: triggers if admin changes version or forces update in dashboard
    const channel = supabase
      .channel('app_version_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_version_config' },
        (payload) => {
          if (payload.new) {
            const config = payload.new;
            setVersionConfig(config);
            const hasNewerVersion = compareVersions(CURRENT_APP_VERSION, config.latest_version) < 0;
            const isBelowMin = compareVersions(CURRENT_APP_VERSION, config.min_required_version) < 0;
            const forced = Boolean(config.force_update || isBelowMin);
            setIsForced(forced);

            if (forced || hasNewerVersion) {
              setModalVisible(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      appStateSub.remove();
      supabase.removeChannel(channel);
    };
  }, [checkVersion]);

  return (
    <UpdateModal
      visible={modalVisible}
      config={versionConfig}
      isForced={isForced}
      onDismiss={() => setModalVisible(false)}
    />
  );
}
