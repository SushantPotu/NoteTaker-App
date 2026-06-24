import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';

interface PageThumbnailProps {
  id: number;
  pageNumber: number;
  extractedText: string;
  hasImage: boolean;
  color: string;
  onPress: () => void;
  onLongPress?: () => void;
}

const PageThumbnail: React.FC<PageThumbnailProps> = ({
  pageNumber,
  extractedText,
  hasImage,
  color,
  onPress,
  onLongPress,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const previewText = extractedText
    ? extractedText.substring(0, 80) + (extractedText.length > 80 ? '…' : '')
    : 'Empty page — tap to write';

  const hasText = extractedText && extractedText.trim().length > 0;

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Page header */}
        <View style={styles.header}>
          <View style={[styles.pageNumberBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.pageNumberText, { color }]}>
              Page {pageNumber}
            </Text>
          </View>

          <View style={styles.indicators}>
            {hasImage && (
              <View style={styles.indicator}>
                <Text style={styles.indicatorEmoji}>🖼️</Text>
              </View>
            )}
            {hasText && (
              <View style={styles.indicator}>
                <Text style={styles.indicatorEmoji}>✅</Text>
              </View>
            )}
          </View>
        </View>

        {/* Ruled lines effect */}
        <View style={styles.previewArea}>
          <View style={styles.ruledLine} />
          <View style={styles.ruledLine} />
          <View style={styles.ruledLine} />
          <Text style={[styles.previewText, !hasText && styles.emptyText]}>
            {previewText}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFEF7',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#F0EDDA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  pageNumberBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pageNumberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  indicators: {
    flexDirection: 'row',
    gap: 6,
  },
  indicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F5F5F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorEmoji: {
    fontSize: 12,
  },
  previewArea: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    minHeight: 70,
    position: 'relative',
  },
  ruledLine: {
    height: 1,
    backgroundColor: '#E8E4D4',
    marginBottom: 10,
    opacity: 0.6,
  },
  previewText: {
    fontSize: 13,
    color: '#444',
    lineHeight: 20,
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#BBBAA0',
  },
});

export default PageThumbnail;
