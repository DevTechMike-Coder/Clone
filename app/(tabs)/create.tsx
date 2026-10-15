import { Redirect } from "expo-router";

// Fallback if navigated to directly; normally intercepted by tabPress listener
export default function CreateTabPlaceholder() {
  return <Redirect href="/(pages)/createNew" />;
}
