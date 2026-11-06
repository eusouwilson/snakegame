// Estende o app.json. Os IDs do AdMob vem de variaveis de ambiente;
// sem elas, usa os IDs de TESTE do Google (nunca clique em anuncios reais para testar).
const TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    [
      // O template do SDK 58 liga o R8 por padrao. Com o SDK de anuncios (que traz o
      // WorkManager), o R8 remove um construtor usado por reflexao e o app fecha ao abrir
      // ("Failed to create an instance of androidx.work.impl.WorkDatabase").
      'expo-build-properties',
      { android: { enableMinifyInReleaseBuilds: false } },
    ],
  ],
});
