import { ActivityIndicator, View } from "react-native";
import { colors } from "@/constants/theme";

export default function AuthSplash() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.slate[50],
      }}
    >
      <ActivityIndicator size="large" color={colors.blue[600]} />
    </View>
  );
}
