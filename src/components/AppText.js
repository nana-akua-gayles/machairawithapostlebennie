import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const AppText = ({ style, type = 'regular', italic = false, maxFontSizeMultiplier = 1.3, ...props }) => {
  const { colors } = useTheme();

  const getFontFamily = () => {
    switch (type) {
      case 'semiBold': return italic ? 'Montserrat-SemiBoldItalic' : 'Montserrat-SemiBold';
      case 'bold': return italic ? 'Montserrat-BoldItalic' : 'Montserrat-Bold';
      case 'black': return italic ? 'Montserrat-BlackItalic' : 'Montserrat-Black';
      default: return italic ? 'Montserrat-Italic' : 'Montserrat-Regular';
    }
  };

  return (
    <Text
      style={[{ fontFamily: getFontFamily(), color: colors.text }, style]}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      {...props}
    />
  );
};