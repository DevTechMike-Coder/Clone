import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";

/**
 * Typewriter Component (React Native + NativeWind)
 * @param text The full string to be typed out
 * @param speed Delay between characters in milliseconds
 * @param loop Whether to restart the animation
 * @param className NativeWind/Tailwind classes for the Text
 */
const Typewriter = ({
  text = "",
  speed = 70,
  loop = false,
  className = "",
}: {
  text?: string;
  speed?: number;
  loop?: boolean;
  className?: string;
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (currentIndex < text.length) {
      timeoutId = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);
    } else if (loop) {
      timeoutId = setTimeout(() => {
        setDisplayedText("");
        setCurrentIndex(0);
      }, 2000);
    }

    return () => clearTimeout(timeoutId);
  }, [currentIndex, text, speed, loop]);

  return (
    <View className="my-2 flex-row items-center">
      <Text className={`text-[#00FF41] text-2xl font-bold font-mono ${className}`}>
        {displayedText}
      </Text>
    </View>
  );
};

// Main App Showcase
export default function TypeWriter() {
  return (
    <View className="flex-1 items-center justify-center bg-[#121212] p-5">
      <Typewriter
        text="Welcome To Clone"
        speed={70}
        className="text-center"
      />
    </View>
  );
}