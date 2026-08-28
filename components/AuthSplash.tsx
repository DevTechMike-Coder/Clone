import { ActivityIndicator, View } from "react-native";

export default function AuthSplash() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F8FAFC",
      }}
    >
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}
