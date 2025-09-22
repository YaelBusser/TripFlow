export default {
  expo: {
    name: "TripFlow",
    slug: "TripFlow",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "tripflow",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-screen.png",
      resizeMode: "cover",
      backgroundColor: "#2FB6A1",
      dark: {
        image: "./assets/images/splash-screen.png",
        resizeMode: "cover",
        backgroundColor: "#259B8A"
      }
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.tripflow.app"
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#2FB6A1",
        foregroundImage: "./assets/images/icon.png",
        backgroundImage: "./assets/images/icon.png"
      },
      package: "com.tripflow.app",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    },
    web: {
      output: "static",
      favicon: "./assets/images/icon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-screen.png",
          resizeMode: "cover",
          backgroundColor: "#2FB6A1",
          dark: {
            image: "./assets/images/splash-screen.png",
            resizeMode: "cover",
            backgroundColor: "#259B8A"
          }
        }
      ],
      "expo-sqlite",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Cette application a besoin d'accéder à votre localisation pour afficher votre position sur la carte.",
          locationAlwaysPermission: "Cette application a besoin d'accéder à votre localisation en arrière-plan pour suivre vos déplacements.",
          locationWhenInUsePermission: "Cette application a besoin d'accéder à votre localisation pour afficher votre position sur la carte.",
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    }
  }
};
