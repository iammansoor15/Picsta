import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

/**
 * HeroQuickActions
 * A compact dashboard card like the provided design.
 *
 * Props:
 * - title: string (e.g., 'Recharge & Bills')
 * - onViewAll: () => void
 * - items: Array<{
 *     key: string,
 *     iconName: string, // Feather icon name
 *     titleTop: string,
 *     titleBottom?: string,
 *     badgeText?: string,
 *     onPress?: () => void,
 *   }>
 */
const HeroQuickActions = ({ title = 'Quick Actions', onViewAll, items = [] }) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <TouchableOpacity onPress={onViewAll} activeOpacity={0.85}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        {items.map((it) => (
          <TouchableOpacity
            key={it.key}
            style={styles.item}
            activeOpacity={0.9}
            onPress={it.onPress}
          >
            <View style={styles.iconWrap}>
              {/* Badge (optional) */}
              {it.badgeText ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{it.badgeText}</Text>
                </View>
              ) : null}
              <View style={styles.iconCircle}>
                <Feather name={it.iconName || 'grid'} size={26} color="#EDEDED" />
              </View>
            </View>
            <Text style={styles.labelTop} numberOfLines={1}>{it.titleTop}</Text>
            {it.titleBottom ? (
              <Text style={styles.labelBottom} numberOfLines={1}>{it.titleBottom}</Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default HeroQuickActions;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    marginTop: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#EDEDED',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  viewAll: {
    color: '#A855F7',
    fontSize: 15,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  item: {
    width: '23%',
    alignItems: 'center',
  },
  iconWrap: {
    width: 84,
    height: 84,
    marginBottom: 8,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    zIndex: 2,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b91c1c',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelTop: {
    color: '#EDEDED',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 18,
  },
  labelBottom: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
});
