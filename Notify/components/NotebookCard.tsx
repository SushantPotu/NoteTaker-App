import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';

interface NotebookCardProps {
  id: number;
  name: string;
  color: string;
  pageCount: number;
  updatedAt: string;
  onPress: () => void;
  onLongPress: () => void;
}

const NotebookCard: React.FC<NotebookCardProps> = ({
  name,
  color,
  pageCount,
  updatedAt,
  onPress,
  onLongPress,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Color accent strip */}
        <View style={[styles.colorStrip, { backgroundColor: color }]} />

        <View style={styles.content}>
          {/* Notebook icon */}
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            <Text style={styles.icon}>📒</Text>
          </View>

          {/* Name */}
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>

          {/* Footer: page count + date */}
          <View style={styles.footer}>
            <View style={[styles.badge, { backgroundColor: color + '25' }]}>
              <Text style={[styles.badgeText, { color }]}>
                {pageCount} {pageCount === 1 ? 'page' : 'pages'}
              </Text>
            </View>
            <Text style={styles.date}>{formatDate(updatedAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    width: '48%',
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  colorStrip: {
    height: 5,
    width: '100%',
  },
  content: {
    padding: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 22,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 12,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  date: {
    fontSize: 11,
    color: '#999',
  },
});

export default NotebookCard;
