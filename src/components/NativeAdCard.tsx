import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

// The AdMob native module doesn't exist in Expo Go, and importing the package there throws.
// Load it lazily so the app still runs (without ads) instead of crashing at startup.
type AdsModule = typeof import('react-native-google-mobile-ads');
let Ads: AdsModule | null = null;
try {
  Ads = require('react-native-google-mobile-ads');
} catch {
  Ads = null;
}
type NativeAdT = import('react-native-google-mobile-ads').NativeAd;
let initialized: Promise<unknown> | null = null;

/** Native Advanced ad, restyled to the dark/neon UI. Interstitials are intentionally never used. */
export function NativeAdCard({ accent }: { accent: string }) {
  const [ad, setAd] = useState<NativeAdT | null>(null);

  useEffect(() => {
    if (!Ads) return;
    let cancelled = false;
    let current: NativeAdT | null = null;
    const unitId = process.env.EXPO_PUBLIC_ADMOB_NATIVE_ID || Ads.TestIds.NATIVE;
    initialized ??= Ads.default().initialize();
    initialized
      .then(() => Ads!.NativeAd.createForAdRequest(unitId))
      .then((a) => {
        if (cancelled) return a.destroy();
        current = a;
        setAd(a);
      })
      .catch(() => {}); // no fill / offline / init failure: render nothing
    return () => {
      cancelled = true;
      current?.destroy();
    };
  }, []);

  if (!Ads || !ad) return null;
  const { NativeAdView, NativeAsset, NativeAssetType } = Ads;
  return (
    <NativeAdView nativeAd={ad} style={styles.card}>
      <Text style={[styles.badge, { color: accent, borderColor: accent }]}>AD</Text>
      <NativeAsset assetType={NativeAssetType.HEADLINE}>
        <Text style={styles.headline}>{ad.headline}</Text>
      </NativeAsset>
      {!!ad.body && (
        <NativeAsset assetType={NativeAssetType.BODY}>
          <Text style={styles.body}>{ad.body}</Text>
        </NativeAsset>
      )}
      {!!ad.callToAction && (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <View style={[styles.cta, { borderColor: accent }]}>
            <Text style={[styles.ctaText, { color: accent }]}>{ad.callToAction}</Text>
          </View>
        </NativeAsset>
      )}
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 8 },
  badge: { alignSelf: 'flex-start', fontSize: 10, fontWeight: '900', letterSpacing: 2, borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  headline: { color: colors.text, fontSize: 17, fontWeight: '900' },
  body: { color: colors.muted, fontSize: 13 },
  cta: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginTop: 4 },
  ctaText: { fontWeight: '900', fontSize: 12, letterSpacing: 1 },
});
