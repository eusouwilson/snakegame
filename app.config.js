// Estende o app.json. Os IDs do AdMob vem de variaveis de ambiente;
// sem elas, usa os IDs de TESTE do Google (nunca clique em anuncios reais para testar).
const TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: process.env.ADMOB_ANDROID_APP_ID || TEST_ANDROID_APP_ID,
        iosAppId: process.env.ADMOB_IOS_APP_ID || TEST_IOS_APP_ID,
      },
    ],
  ],
});
