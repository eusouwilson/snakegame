// Estende o app.json com configuracoes de build do Android.
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    // Mantem o R8 desligado no release, como no build testado no S24 Ultra (Android 17).
    ['expo-build-properties', { android: { enableMinifyInReleaseBuilds: false } }],
  ],
});
