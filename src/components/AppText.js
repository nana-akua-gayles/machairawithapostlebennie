import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const AppText = ({ style, type = 'regular', ...props }) => {
  const { colors } = useTheme();

  const getFontFamily = () => {
    switch (type) {
      case 'semiBold': return 'Montserrat-SemiBold';
      case 'bold': return 'Montserrat-Bold';
      case 'black': return 'Montserrat-Black';
      default: return 'Montserrat-Regular';
    }
  };

  return (
    <Text
      style={[{ fontFamily: getFontFamily(), color: colors.text }, style]}
      {...props}
    />
  );
};