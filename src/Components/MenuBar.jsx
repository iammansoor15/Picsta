import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

// Card-like menu styled like the provided screenshot
const MenuBar = ({ 
  onAddText, 
  onReset, 
  onUndo, 
  onRemoveBackground, 
  onSave,
}) => {
  const items = [
    { key: 'add', icon: 'edit-3', top: 'Add', bottom: 'Text', onPress: onAddText },
    { key: 'removebg', icon: 'scissors', top: 'Remove', bottom: 'BG', onPress: onRemoveBackground },
    { key: 'electric', icon: 'refresh-cw', top: 'Reset', bottom: '', onPress: onReset },
    { key: 'undo', icon: 'corner-up-left', top: 'Undo', bottom: '', onPress: onUndo },
    { key: 'save', icon: 'save', top: 'Save', bottom: '', onPress: onSave },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Tools</Text>
        <Text style={styles.viewAll}>View All</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.itemsRow}
      >
        {items.map((it) => (
          <TouchableOpacity key={it.key} style={styles.item} activeOpacity={0.9} onPress={it.onPress}>
            <View style={styles.iconWrap}>
              <View style={styles.iconCircle}>
                <Feather name={it.icon} size={24} color="#EDEDED" />
              </View>
            </View>
            <Text style={styles.labelTop} numberOfLines={2}>{it.top}</Text>
            {it.bottom ? <Text style={styles.labelBottom} numberOfLines={2}>{it.bottom}</Text> : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#262626',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 27,
    paddingTop: 33,
    paddingHorizontal: 18,
    marginHorizontal: 12,
    marginTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    color: '#EDEDED',
    fontSize: 18,
    fontWeight: '800',
  },
  viewAll: {
    color: '#A855F7',
    fontSize: 14,
    fontWeight: '800',
  },
  itemsRow: {
    alignItems: 'center',
    gap: 14,
    paddingRight: 6,
  },
  item: {
    width: 172,
    alignItems: 'center',
  },
  iconWrap: {
    width: 126,
    height: 126,
    marginBottom: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelTop: {
    color: '#EDEDED',
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 24,
    flexWrap: 'wrap',
  },
  labelBottom: {
    color: '#D1D5DB',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 21,
    flexWrap: 'wrap',
  },
});

export default MenuBar;
