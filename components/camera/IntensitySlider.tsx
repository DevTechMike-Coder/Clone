import React, { useEffect, useRef, useState } from "react";
import { PanResponder, Text, View } from "react-native";

/**
 * Dependency-free horizontal slider (0..1) for filter intensity.
 * @react-native-community/slider is a native module absent from Expo Go, so
 * a gesture-based track keeps the composer usable in every build.
 *
 * Note: the PanResponder is created once (in a lazy useState initializer);
 * everything it needs at gesture time is read through refs synced in
 * effects, so no ref is ever touched during render.
 */
type IntensitySliderProps = {
  value: number; // 0..1
  onChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  label?: string;
};

const TRACK_PADDING = 12;

const IntensitySlider = ({
  value,
  onChange,
  minimumValue = 0.2,
  maximumValue = 1,
  label = "Intensity",
}: IntensitySliderProps) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const originXRef = useRef(0);
  const trackRef = useRef<View>(null);

  // Latest props/layout for the stable gesture handlers (refs only ever
  // written inside effects/handlers — React Compiler safe).
  const latest = useRef({ onChange, minimumValue, maximumValue, trackWidth });
  useEffect(() => {
    latest.current = { onChange, minimumValue, maximumValue, trackWidth };
  });

  function measureOrigin() {
    trackRef.current?.measureInWindow((x) => {
      originXRef.current = x;
    });
  }

  // absoluteX-based positioning avoids drift vs accumulated deltas
  function applyPageX(pageX: number) {
    const s = latest.current;
    const usable = Math.max(s.trackWidth - TRACK_PADDING * 2, 1);
    const x = Math.min(
      Math.max(pageX - originXRef.current - TRACK_PADDING, 0),
      usable
    );
    const ratio = x / usable;
    s.onChange(s.minimumValue + ratio * (s.maximumValue - s.minimumValue));
  }

  // The PanResponder must be created exactly once; its callbacks only READ
  // refs at gesture time (never during render), which the compiler lint
  // can't prove statically.
  // eslint-disable-next-line react-hooks/refs
  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dx) > 2,
      onPanResponderGrant: (evt) => {
        measureOrigin();
        applyPageX(evt.nativeEvent.pageX);
      },
      onPanResponderMove: (evt) => {
        applyPageX(evt.nativeEvent.pageX);
      },
    })
  );

  const clamped = Math.min(maximumValue, Math.max(minimumValue, value));
  const ratio = (clamped - minimumValue) / (maximumValue - minimumValue);
  const usableWidth = Math.max(trackWidth - TRACK_PADDING * 2, 0);
  const thumbX = TRACK_PADDING + ratio * usableWidth;

  return (
    <View className="px-5 py-2">
      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="text-white/70 text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </Text>
        <Text className="text-white/70 text-[11px] font-bold">
          {Math.round(ratio * 100)}%
        </Text>
      </View>
      <View
        ref={trackRef}
        onLayout={(e) => {
          setTrackWidth(e.nativeEvent.layout.width);
          measureOrigin();
        }}
        {...panResponder.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{
          min: Math.round(minimumValue * 100),
          max: Math.round(maximumValue * 100),
          now: Math.round(value * 100),
        }}
        className="h-8 justify-center"
      >
        <View className="h-1.5 mx-3 rounded-full bg-white/25 overflow-hidden">
          <View
            className="h-full bg-white"
            style={{ width: `${ratio * 100}%` }}
          />
        </View>
        {trackWidth > 0 && (
          <View
            className="absolute w-6 h-6 rounded-full bg-white"
            style={{
              left: thumbX - 12,
              shadowColor: "#000",
              shadowOpacity: 0.35,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            }}
          />
        )}
      </View>
    </View>
  );
};

export default IntensitySlider;
