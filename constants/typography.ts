import { TextStyle } from 'react-native';

import { theme } from './theme';

export const textStyles = {
  title: {
    fontSize: theme.font.title,
    fontWeight: '700' as const,
    color: theme.black,
    letterSpacing: -0.3,
  } satisfies TextStyle,
  heading: {
    fontSize: theme.font.heading,
    fontWeight: '700' as const,
    color: theme.black,
  } satisfies TextStyle,
  body: {
    fontSize: theme.font.body,
    fontWeight: '500' as const,
    color: theme.black,
    lineHeight: 24,
  } satisfies TextStyle,
  bodySecondary: {
    fontSize: theme.font.bodySmall,
    fontWeight: '500' as const,
    color: theme.gray,
    lineHeight: 22,
  } satisfies TextStyle,
  caption: {
    fontSize: theme.font.caption,
    fontWeight: '600' as const,
    color: theme.graySecondary,
  } satisfies TextStyle,
  label: {
    fontSize: theme.font.label,
    fontWeight: '700' as const,
    color: theme.graySecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  } satisfies TextStyle,
};
