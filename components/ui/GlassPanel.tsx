import React from "react";
import { View, StyleSheet, type ViewProps, type StyleProp, type ViewStyle } from "react-native";
import { glass, radius, shadow } from "../../lib/theme";

interface GlassPanelProps extends ViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  rounded?: "xl" | "sheet" | "full";
  elevated?: boolean;
}

export default function GlassPanel({
  children,
  style,
  rounded = "xl",
  elevated = true,
  ...rest
}: GlassPanelProps) {
  return (
    <View
      style={[
        styles.base,
        rounded === "xl" && styles.roundedXl,
        rounded === "sheet" && styles.roundedSheet,
        rounded === "full" && styles.roundedFull,
        elevated && shadow.md,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    ...glass,
    overflow: "hidden",
  },
  roundedXl: { borderRadius: radius.xl },
  roundedSheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  roundedFull: { borderRadius: radius.full },
});
