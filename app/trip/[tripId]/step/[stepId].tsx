import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../../lib/colors';
import { addStepImage, deleteStep, deleteStepImage, getStep, getStepImages, listSteps, Step, StepImage, updateStep } from '../../../../lib/steps';
import { addTripImage } from '../../../../lib/trip-images';

const { width } = Dimensions.get('window');

export default function StepDetailsScreen() {
  const { tripId, stepId } = useLocalSearchParams<{ tripId: string; stepId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const [step, setStep] = useState<Step | null>(null);
  const [loading, setLoading] = useState(true);
  const [allSteps, setAllSteps] = useState<Step[]>([]);
  const [descDraft, setDescDraft] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [locationName, setLocationName] = useState('');
  const [stepImages, setStepImages] = useState<StepImage[]>([]);
  const [addingImages, setAddingImages] = useState(false);

  useEffect(() => {
    loadStep();
  }, [stepId]);

  // Masquer l'en-tête natif (onglet/route) car on a déjà un bouton retour custom
  useLayoutEffect(() => {
    navigation.setOptions?.({ headerShown: false });
  }, [navigation]);

  const loadStep = async () => {
    try {
      setLoading(true);
      const [stepData, stepsData] = await Promise.all([
        getStep(Number(stepId)),
        listSteps(Number(tripId))
      ]);
      setStep(stepData);
      setDescDraft(stepData.description || '');
      setNameDraft(stepData.name || '');
      setAllSteps(stepsData.sort((a,b) => (a.order_index||0)-(b.order_index||0)));
      // Charger les images de l'étape
      const pics = await getStepImages(Number(stepId));
      setStepImages(pics);
    } catch (error) {
      console.log('Erreur lors du chargement de l\'étape:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de l\'étape');
    } finally {
      setLoading(false);
    }
  };

  const isFirst = useMemo(() => allSteps[0]?.id === step?.id, [allSteps, step]);
  const isLast = useMemo(() => allSteps[allSteps.length-1]?.id === step?.id, [allSteps, step]);

  // Résoudre un libellé de localisation lisible à partir des coordonnées de l'étape
  useEffect(() => {
    const resolveLocation = async () => {
      if (!step) return;
      try {
        const results = await Location.reverseGeocodeAsync({ latitude: step.latitude, longitude: step.longitude });
        if (results && results.length > 0) {
          const addr = results[0];
          const human = `${addr.city || addr.subregion || addr.region || 'Lieu'}, ${addr.country || ''}`.trim();
          setLocationName(human);
        } else {
          setLocationName(`${step.latitude.toFixed(4)}, ${step.longitude.toFixed(4)}`);
        }
      } catch {
        setLocationName(`${step.latitude.toFixed(4)}, ${step.longitude.toFixed(4)}`);
      }
    };
    resolveLocation();
  }, [step]);

  const saveName = async () => {
    if (!step) return;
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== step.name) {
      await updateStep(step.id, { name: trimmed });
      await loadStep();
    }
  };

  const saveDescription = async () => {
    if (!step) return;
    await updateStep(step.id, { description: descDraft });
    await loadStep();
  };

  const onAddImages = async () => {
    if (!step) return;
    try {
      setAddingImages(true);
      // Demander la permission si nécessaire
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission requise', 'Autorisez l\'accès à vos photos pour ajouter des images.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        allowsMultipleSelection: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (res.canceled) return;
      const assets = (res.assets ?? []).filter((a: any) => !!a?.uri);
      for (const asset of assets) {
        await addStepImage(step.id, asset.uri);
        await addTripImage(Number(tripId), asset.uri);
      }
      const pics = await getStepImages(step.id);
      setStepImages(pics);
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'ajouter les images");
    } finally {
      setAddingImages(false);
    }
  };

  const onDeleteImage = async (imageId: number) => {
    Alert.alert('Supprimer la photo', 'Voulez-vous supprimer cette photo de cette étape ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await deleteStepImage(imageId);
            const pics = await getStepImages(Number(stepId));
            setStepImages(pics);
          } catch {
            Alert.alert('Erreur', 'Suppression impossible');
          }
        }
      }
    ]);
  };

  const onDeleteStep = async () => {
    if (!step) return;
    if (isFirst || isLast) {
      Alert.alert('Action non autorisée', isFirst ? "Le point de départ ne peut pas être supprimé." : "Le point d'arrivée ne peut pas être supprimé ici.");
      return;
    }
    Alert.alert(
      "Supprimer l'étape",
      `Voulez-vous supprimer l'étape "${step.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              await deleteStep(step.id);
              // Réindexer les étapes restantes
              const remaining = (await listSteps(Number(tripId))).sort((a,b) => (a.order_index||0)-(b.order_index||0));
              for (let i = 0; i < remaining.length; i++) {
                if ((remaining[i].order_index||0) !== i) {
                  await updateStep(remaining[i].id, { order_index: i });
                }
              }
              router.back();
            } catch (e) {
              Alert.alert('Erreur', "Impossible de supprimer l'étape");
            }
          }
        }
      ]
    );
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Date non définie';
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!step) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Étape non trouvée</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Retour</Text>
          </Pressable>
          <Text style={styles.stepName}>{step.name}</Text>
        </View>

        {/* Informations de l'étape */}
        <View style={styles.infoSection}>
          {!!step && (
            <Pressable
              style={styles.viewOnMapInlineBtn}
              onPress={() => router.push({
                pathname: `/trip/${tripId}/map`,
                params: { focusLat: String(step.latitude), focusLng: String(step.longitude) }
              })}
            >
              <Text style={styles.viewOnMapInlineText}>📍 Voir sur la carte</Text>
            </Pressable>
          )}
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Nom de l'étape</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="Nom personnalisé de l'étape"
              value={nameDraft}
              onChangeText={setNameDraft}
              onBlur={saveName}
            />
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{formatDate(step.start_date)}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Coordonnées</Text>
            <Text style={styles.infoValue}>
              {step.latitude.toFixed(4)}, {step.longitude.toFixed(4)}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Lieu</Text>
            <Text style={styles.infoValue}>{locationName || '...'}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              multiline
              placeholder="Ajoutez des notes sur cette étape"
              value={descDraft}
              onChangeText={setDescDraft}
              onBlur={saveDescription}
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          {isLast && (
            <Pressable style={styles.redefineArrivalBtn} onPress={() => Alert.alert('Redéfinir', 'Ouverture du sélecteur de lieu à implémenter sur la carte')}>
              <Text style={styles.redefineArrivalText}>📍 Redéfinir le point d'arrivée</Text>
            </Pressable>
          )}
          {!isFirst && !isLast && (
            <Pressable style={styles.deleteStepBtn} onPress={onDeleteStep}>
              <Text style={styles.deleteStepText}>🗑️ Supprimer cette étape</Text>
            </Pressable>
          )}
        </View>

        {/* Section Photos */}
        <View style={styles.photosSection}>
          <View style={styles.photosHeaderRow}>
            <Text style={styles.sectionTitle}>Photos de l'étape</Text>
            <Pressable style={[styles.addImageCta, addingImages && { opacity: 0.6 }]} onPress={onAddImages} disabled={addingImages}>
              <Text style={styles.addImageCtaText}>{addingImages ? 'Ajout...' : 'Ajouter des photos'}</Text>
            </Pressable>
          </View>
          {stepImages.length === 0 ? (
            <View style={styles.noPhotosContainer}>
              <Text style={styles.noPhotosText}>Aucune photo pour cette étape</Text>
              <Text style={styles.noPhotosSubtext}>Ajoutez vos souvenirs ici</Text>
            </View>
          ) : (
            <View style={styles.photosGrid}>
              {stepImages.map((img) => (
                <View key={img.id} style={styles.photoItem}>
                  <Image source={{ uri: img.image_uri }} style={styles.photoThumb} />
                  <Pressable style={styles.photoDeleteBtn} onPress={() => onDeleteImage(img.id)}>
                    <Text style={styles.photoDeleteText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 20,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.keppel,
    fontWeight: '600',
  },
  viewOnMapBtn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.keppel,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  viewOnMapText: {
    color: colors.white,
    fontWeight: '700',
  },
  viewOnMapInlineBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.keppel,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  viewOnMapInlineText: {
    color: colors.white,
    fontWeight: '700',
  },
  stepName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  infoSection: {
    padding: 20,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  photosSection: {
    padding: 20,
  },
  actionsSection: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  arrowBtn: {
    backgroundColor: colors.eggshell,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  arrowBtnDisabled: {
    opacity: 0.4,
  },
  arrowText: {
    fontSize: 16,
  },
  reorderHint: {
    flex: 1,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  redefineArrivalBtn: {
    backgroundColor: colors.keppel,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  redefineArrivalText: {
    color: 'white',
    fontWeight: '700',
  },
  deleteStepBtn: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteStepText: {
    color: '#991b1b',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  noPhotosContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.eggshell,
    borderRadius: 12,
  },
  noPhotosText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  noPhotosSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  photosHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addImageCta: {
    backgroundColor: colors.keppel,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addImageCtaText: {
    color: colors.white,
    fontWeight: '700',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    width: (width - 20 - 20 - 8) / 3,
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.eggshell,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  photoDeleteText: {
    color: 'white',
    fontWeight: '800',
  },
});
