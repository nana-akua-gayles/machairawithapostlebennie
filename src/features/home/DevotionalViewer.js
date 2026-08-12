import React, { useMemo, useCallback } from 'react';
import { useWindowDimensions, Linking } from 'react-native';
import RenderHtml, { defaultSystemFonts } from 'react-native-render-html';
import { useTheme } from '../../context/ThemeContext';
import { processDevotionalHtml } from './formatDevotionalHtml';

const systemFonts = [
  ...defaultSystemFonts,
  'Montserrat-Regular',
  'Montserrat-SemiBold',
  'Montserrat-Bold',
  'Montserrat-Black',
];

const DEVOTIONAL_RED = '#DC2626';

export default function DevotionalViewer({
  htmlContent,
  title,
  baseFontSize = 16,
  onInternalLinkPress,
}) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();

  const baseStyle = useMemo(
    () => ({
      fontFamily: 'Montserrat-Regular',
      color: colors.text,
      fontSize: baseFontSize,
      lineHeight: baseFontSize * 1.6,
    }),
    [colors.text, baseFontSize]
  );

  const tagsStyles = useMemo(
    () => ({
      a: {
        color: DEVOTIONAL_RED,
        textDecorationLine: 'underline',
        fontFamily: 'Montserrat-SemiBold',
      },
      blockquote: {
        borderLeftWidth: 4,
        borderLeftColor: DEVOTIONAL_RED,
        backgroundColor: '#FFF5F5',
        paddingVertical: 10,
        paddingLeft: 14,
        paddingRight: 10,
        marginVertical: 16,
        borderRadius: 6,
        fontStyle: 'italic',
      },
      p: {
        marginBottom: 16,
      },
      strong: {
        fontFamily: 'Montserrat-Bold',
      },
      ul: {
        marginTop: 4,
        marginBottom: 4,
      },
      li: {
        marginBottom: 8,
      },
    }),
    [colors, baseFontSize]
  );

  const classesStyles = useMemo(
    () => ({
      keyverse: {
        borderLeftWidth: 0,
        backgroundColor: '#FFFFFF',
        paddingVertical: 18,
        paddingHorizontal: 16,
        marginBottom: 26,
        alignItems: 'center',
        borderBottomWidth: 2,
        color: DEVOTIONAL_RED,
      },
      'keyverse-text': {
        fontFamily: 'Montserrat-SemiBold',
        fontSize: baseFontSize * 1,
        lineHeight: baseFontSize * 1.6,
        textAlign: 'center',
        color: DEVOTIONAL_RED,
      },
      'keyverse-ref': {
        fontFamily: 'Montserrat-Bold',
        fontSize: baseFontSize * 1,
        textAlign: 'center',
        marginTop: 8,
      },
      footer: {
        backgroundColor: colors.surface ?? '#F7F7F7',
        borderRadius: 10,
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginTop: 24,
      },
      footerLabel: {
        fontFamily: 'Montserrat-Bold',
        fontSize: baseFontSize * 0.85,
        color: DEVOTIONAL_RED,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      },
      closing: {
        fontFamily: 'Montserrat-Bold',
        fontSize: baseFontSize,
        color: DEVOTIONAL_RED,
        textAlign: 'center',
        marginTop: 12,
      },
    }),
    [colors, baseFontSize]
  );

  const handleLinkPress = useCallback(
    async (event, href) => {
      try {
        if (!href) return;

        const episodeMatch = href.match(/episode-(\d+)/i);

        if (episodeMatch && episodeMatch[1] && onInternalLinkPress) {
          const episodeId = episodeMatch[1];
          onInternalLinkPress(episodeId);
          return;
        }

        const supported = await Linking.canOpenURL(href);
        if (supported) {
          await Linking.openURL(href);
        } else {
          console.warn(`Don't know how to open URL: ${href}`);
        }
      } catch (error) {
        console.error('An error occurred handling the link:', error);
      }
    },
    [onInternalLinkPress]
  );

  const renderersProps = useMemo(
    () => ({
      a: {
        onPress: handleLinkPress,
      },
    }),
    [handleLinkPress]
  );

  const htmlSource = useMemo(
    () => ({
      html: htmlContent || '<p></p>',
    }),
    [htmlContent]
  );

  const contentWidth = useMemo(() => width - 40, [width]);

  return (
    <RenderHtml
      source={htmlSource}
      contentWidth={contentWidth}
      baseStyle={baseStyle}
      tagsStyles={tagsStyles}
      classesStyles={classesStyles}
      systemFonts={systemFonts}
      enableExperimentalMarginCollapsing={true}
      enableTrustedHTML={true}
      renderersProps={renderersProps}
    />
  );
}