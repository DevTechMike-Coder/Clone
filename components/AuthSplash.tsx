import { ActivityIndicator, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";

export default function AuthSplash() {
  const { palette } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.background,
      }}
    >
      <ActivityIndicator size="large" color={palette.primary} />
    </View>
  );
}
