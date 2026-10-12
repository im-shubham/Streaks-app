module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo applies the Reanimated/worklets transform itself; no manual plugin.
  return { presets: ['babel-preset-expo'] };
};
