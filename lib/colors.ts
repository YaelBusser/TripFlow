// Palette de couleurs TripFlow
export const colors = {
  // Couleurs principales
  keppel: '#2FB6A1',        // Vert principal (boutons, accents)
  cambridgeBlue: '#699F7B',  // Vert secondaire (textes, éléments)
  white: '#FFFFFF',          // Blanc pur
  carrotOrange: '#F2942D',   // Orange (alertes, highlights)
  eggshell: '#F8F1DD',       // Crème (arrière-plans doux)
  
  // Couleurs dérivées
  keppelLight: '#4FC7B1',    // Keppel clair
  keppelDark: '#259B8A',     // Keppel foncé
  cambridgeBlueLight: '#7FB08A', // Cambridge Blue clair
  cambridgeBlueDark: '#5A8A6A',  // Cambridge Blue foncé
  carrotOrangeLight: '#F5A847',  // Carrot Orange clair
  carrotOrangeDark: '#E0851A',   // Carrot Orange foncé
  
  // Couleurs de texte
  textPrimary: '#1A1A1A',    // Texte principal (noir doux)
  textSecondary: '#4A4A4A',  // Texte secondaire (gris foncé)
  textTertiary: '#8A8A8A',   // Texte tertiaire (gris moyen)
  textLight: '#B8B8B8',      // Texte clair (gris clair)
  
  // Couleurs d'état
  success: '#2FB6A1',        // Succès (keppel)
  warning: '#F2942D',        // Avertissement (carrot orange)
  error: '#E53E3E',          // Erreur (rouge)
  info: '#3182CE',           // Information (bleu)
  
  // Couleurs d'arrière-plan
  backgroundPrimary: '#FFFFFF',    // Arrière-plan principal
  backgroundSecondary: '#F8F1DD',  // Arrière-plan secondaire (eggshell)
  backgroundTertiary: '#F5F5F5',   // Arrière-plan tertiaire (gris très clair)
  
  // Couleurs de bordure
  borderLight: '#E2E8F0',    // Bordure claire
  borderMedium: '#CBD5E0',   // Bordure moyenne
  borderDark: '#A0AEC0',     // Bordure foncée
  
  // Couleurs d'ombre
  shadowLight: 'rgba(0, 0, 0, 0.1)',
  shadowMedium: 'rgba(0, 0, 0, 0.15)',
  shadowDark: 'rgba(0, 0, 0, 0.2)',
  
  // Dégradés
  gradients: {
    primary: ['#2FB6A1', '#699F7B'],
    warm: ['#F2942D', '#F8F1DD'],
    cool: ['#2FB6A1', '#FFFFFF'],
    sunset: ['#F2942D', '#2FB6A1'],
    ocean: ['#2FB6A1', '#699F7B', '#FFFFFF'],
  }
} as const;

// Types pour TypeScript
export type ColorKey = keyof typeof colors;
export type GradientKey = keyof typeof colors.gradients;
