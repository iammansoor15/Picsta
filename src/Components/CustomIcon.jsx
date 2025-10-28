import React from 'react';
import { Text } from 'react-native';

// Custom Icon component using Unicode symbols for better reliability
const CustomIcon = ({ name, size = 24, color = '#000', strokeColor = 'rgba(0,0,0,0.8)', style = {} }) => {
  const getIconSymbol = (iconName) => {
    const icons = {
      // Heart icons
      'heart-filled': '❤️',
      'heart-outline': '♡', // Heart outline
      'heart-o': '♥', // Filled heart suit symbol (better visibility)
      'heart-empty': '🤍',
      
      // Download icons
      'download': '⬇️', // Down arrow emoji (more visible)
      'download-arrow': '↓', // Simple down arrow
      'download-alt': '📥',
      'download-done': '⬇️', // Keep down arrow even when downloaded
      'checkmark': '✓',
      
      // Cloud icons
      'cloud': '☁️',
      'cloud-download': '☁️',
      
      // Mobile icons
      'mobile': '📱',
      'phone': '📱',
      
      // Arrow icons
      'arrow-down': '↓',
      'arrow-up': '↑',
      'arrow-left': '←',
      'arrow-right': '→',
      
      // Other utility icons
      'star': '⭐',
      'star-outline': '☆',
      'plus': '+',
      'minus': '-',
      'close': '✕',
      'check': '✓',
      'refresh': '🔄',
      'settings': '⚙️',
      'info': 'ℹ️',
      'warning': '⚠️',
      'error': '❌',
      'success': '✅',

      // Share icons
      'share-2': '📤',   // Feather share-2 equivalent
      'share-alt': '📤', // FontAwesome share-alt equivalent (using same emoji)

      // Delete / trash icons
      'trash': '🗑️',
      'delete': '🗑️',
      'bin': '🗑️',
    };
    
    return icons[iconName] || '?';
  };

  return (
    <Text
      style={[
        {
          fontSize: size,
          color: color,
          textAlign: 'center',
          lineHeight: size + 2, // Better vertical alignment
          textShadowColor: strokeColor,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 1,
          fontWeight: 'bold',
        },
        style,
      ]}
    >
      {getIconSymbol(name)}
    </Text>
  );
};

export default CustomIcon;