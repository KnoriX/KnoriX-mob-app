module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Reanimated shared values (useSharedValue) and some refs don't need
    // to be in dependency arrays — including them can cause unwanted
    // re-renders or infinite loops. Downgraded to a warning so CI doesn't
    // block on these; review them manually over time and either fix the
    // dependency array or add an explicit eslint-disable-next-line comment
    // where the exclusion is intentional.
    'react-hooks/exhaustive-deps': 'warn',
  },
};
