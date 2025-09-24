import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, FlatList, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../../contexts/ThemeContext';
import { createJournalEntry, deleteJournalEntry, JournalEntry, listJournal, updateJournalEntry } from '../../../../lib/journal';
import { addStepImage, createStepChecklistItem, deleteStep, deleteStepChecklistItem, deleteStepImage, getStep, getStepImages, listStepChecklistItems, listSteps, markStepAsArrived, markStepAsNotArrived, Step, StepChecklistItem, StepImage, toggleStepChecklistItem, updateStep, updateStepChecklistItem } from '../../../../lib/steps';
import { addTripImage } from '../../../../lib/trip-images';
import { getTrip, setTripCompleted as setTripCompletedDB } from '../../../../lib/trips';

const { width } = Dimensions.get('window');

export default function StepDetailsScreen() {
  const { themeColors } = useTheme();
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
  const [checklistItems, setChecklistItems] = useState<StepChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState<number | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');
  const [showRedefineArrival, setShowRedefineArrival] = useState(false);
  const [selectedNewLocation, setSelectedNewLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [newLocationName, setNewLocationName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isArrived, setIsArrived] = useState(false);
  const [adventureStarted, setAdventureStarted] = useState(false);
  const [isLastStep, setIsLastStep] = useState(false);
  const [tripCompleted, setTripCompletedState] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const mapRef = useRef<MapView>(null);
  
  // États pour le journal de bord
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [showAddJournalModal, setShowAddJournalModal] = useState(false);
  const [showEditJournalModal, setShowEditJournalModal] = useState(false);
  const [editingJournalEntry, setEditingJournalEntry] = useState<JournalEntry | null>(null);
  const [newJournalText, setNewJournalText] = useState('');
  const [editJournalText, setEditJournalText] = useState('');

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
      const [stepData, stepsData, tripData] = await Promise.all([
        getStep(Number(stepId)),
        listSteps(Number(tripId)),
        getTrip(Number(tripId))
      ]);
      setStep(stepData);
      setDescDraft(stepData.description || '');
      setNameDraft(stepData.name || '');
      setIsArrived(!!stepData.arrived_at);
      setStartDate(stepData.start_date ? new Date(stepData.start_date) : null);
      setEndDate(stepData.end_date ? new Date(stepData.end_date) : null);
      const sortedSteps = stepsData.sort((a,b) => (a.order_index||0)-(b.order_index||0));
      setAllSteps(sortedSteps);
      setAdventureStarted(!!tripData?.adventure_started);
      setTripCompletedState(!!tripData?.completed);
      
      // Vérifier si c'est la dernière étape
      const currentStepIndex = sortedSteps.findIndex(s => s.id === Number(stepId));
      setIsLastStep(currentStepIndex === sortedSteps.length - 1);
      // Charger les images de l'étape
      const pics = await getStepImages(Number(stepId));
      setStepImages(pics);
      
      // Charger les éléments de checklist de l'étape
      const checklist = await listStepChecklistItems(Number(stepId));
      setChecklistItems(checklist);
      
      // Charger les entrées du journal de l'étape
      const journal = await listJournal(Number(stepId));
      setJournalEntries(journal);
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
    if (tripCompleted) {
      Alert.alert('Voyage terminé', 'Ce voyage est terminé, vous ne pouvez plus le modifier.');
      return;
    }
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== step.name) {
      await updateStep(step.id, { name: trimmed });
      await loadStep();
    }
  };

  const saveDescription = async () => {
    if (!step) return;
    if (tripCompleted) {
      Alert.alert('Voyage terminé', 'Ce voyage est terminé, vous ne pouvez plus le modifier.');
      return;
    }
    await updateStep(step.id, { description: descDraft });
    await loadStep();
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
      if (step) {
        updateStep(step.id, { start_date: selectedDate.getTime() });
      }
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
      if (step) {
        updateStep(step.id, { end_date: selectedDate.getTime() });
      }
    }
  };

  const handleFinishTrip = async () => {
    try {
      Alert.alert(
        'Terminer le voyage',
        'Êtes-vous sûr de vouloir terminer ce voyage ? Cette action est irréversible.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Terminer',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('Terminaison du voyage', tripId);
                await setTripCompletedDB(Number(tripId), true);
                setTripCompletedState(true);
                
                // Recharger les données du voyage
                await loadStep();
                
                console.log('Voyage terminé avec succès');
                Alert.alert(
                  'Félicitations ! 🎉',
                  'Votre voyage est maintenant terminé ! Vous pouvez le retrouver dans la section "Voyages terminés".',
                  [
                    { text: 'OK', onPress: () => router.push('/(tabs)/explore') }
                  ]
                );
              } catch (error) {
                console.error('Erreur lors de la terminaison du voyage:', error);
                Alert.alert('Erreur', 'Impossible de terminer le voyage');
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de terminer le voyage');
    }
  };

  const handleArrivalToggle = async () => {
    try {
      // Vérifier que l'aventure a commencé
      if (!adventureStarted) {
        Alert.alert('Aventure non démarrée', 'Vous devez d\'abord démarrer l\'aventure depuis la carte du voyage !');
        return;
      }
      
      if (isArrived) {
        // Vérifier qu'on peut dé-marquer cette étape
        const currentStepIndex = allSteps.findIndex(s => s.id === Number(stepId));
        
        // Ne pas pouvoir dé-marquer si on a marqué une étape plus loin
        for (let i = currentStepIndex + 1; i < allSteps.length; i++) {
          if (allSteps[i].arrived_at) {
            Alert.alert('Impossible', 'Vous devez d\'abord dé-marquer les étapes suivantes !');
            return;
          }
        }
        
        await markStepAsNotArrived(Number(stepId));
        setIsArrived(false);
        Alert.alert('Succès', 'Vous n\'êtes plus marqué comme arrivé à cette étape');
      } else {
        // Vérifier qu'on peut marquer cette étape comme atteinte
        const currentStepIndex = allSteps.findIndex(s => s.id === Number(stepId));
        
        // Ne pas pouvoir marquer le point de départ comme atteint
        if (currentStepIndex === 0) {
          Alert.alert('Information', 'Vous êtes déjà au point de départ !');
          return;
        }
        
        // Vérifier que l'étape précédente est atteinte (sauf pour la première étape intermédiaire)
        if (currentStepIndex > 1) {
          const previousStep = allSteps[currentStepIndex - 1];
          if (!previousStep.arrived_at) {
            Alert.alert('Impossible', 'Vous devez d\'abord arriver à l\'étape précédente !');
            return;
          }
        }
        
        await markStepAsArrived(Number(stepId));
        setIsArrived(true);
        Alert.alert('Félicitations !', 'Vous êtes arrivé à cette étape ! 🎉');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut de l\'étape');
    }
  };

  const onAddImages = async () => {
    if (!step) return;
    if (tripCompleted) {
      Alert.alert('Voyage terminé', 'Ce voyage est terminé, vous ne pouvez plus le modifier.');
      return;
    }
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

  // Fonctions pour la checklist
  const onAddChecklistItem = async () => {
    if (!newChecklistText.trim()) return;
    if (tripCompleted) {
      Alert.alert('Voyage terminé', 'Ce voyage est terminé, vous ne pouvez plus le modifier.');
      return;
    }
    
    try {
      const newItem = await createStepChecklistItem(Number(stepId), newChecklistText.trim());
      setChecklistItems(prev => [...prev, newItem]);
      setNewChecklistText('');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'élément à la checklist');
    }
  };

  const onToggleChecklistItem = async (itemId: number) => {
    if (tripCompleted) {
      Alert.alert('Voyage terminé', 'Ce voyage est terminé, vous ne pouvez plus le modifier.');
      return;
    }
    try {
      await toggleStepChecklistItem(itemId);
      setChecklistItems(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, is_checked: item.is_checked ? 0 : 1 }
            : item
        )
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier l\'élément de la checklist');
    }
  };

  const onDeleteChecklistItem = async (itemId: number) => {
    if (tripCompleted) {
      Alert.alert('Voyage terminé', 'Ce voyage est terminé, vous ne pouvez plus le modifier.');
      return;
    }
    try {
      await deleteStepChecklistItem(itemId);
      setChecklistItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de supprimer l\'élément de la checklist');
    }
  };

  const onStartEditChecklistItem = (item: StepChecklistItem) => {
    setEditingChecklistId(item.id);
    setEditingChecklistText(item.text);
  };

  const onSaveEditChecklistItem = async () => {
    if (!editingChecklistId || !editingChecklistText.trim()) return;
    if (tripCompleted) {
      Alert.alert('Voyage terminé', 'Ce voyage est terminé, vous ne pouvez plus le modifier.');
      return;
    }
    
    try {
      await updateStepChecklistItem(editingChecklistId, editingChecklistText.trim());
      setChecklistItems(prev => 
        prev.map(item => 
          item.id === editingChecklistId 
            ? { ...item, text: editingChecklistText.trim() }
            : item
        )
      );
      setEditingChecklistId(null);
      setEditingChecklistText('');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier l\'élément de la checklist');
    }
  };

  const onCancelEditChecklistItem = () => {
    setEditingChecklistId(null);
    setEditingChecklistText('');
  };

  // Fonctions pour le journal de bord
  const onAddJournalEntry = async () => {
    if (!newJournalText.trim()) return;
    if (tripCompleted) {
      Alert.alert('Voyage terminé', 'Ce voyage est terminé, vous ne pouvez plus le modifier.');
      return;
    }
    
    try {
      const newEntry = await createJournalEntry(Number(stepId), newJournalText.trim());
      setJournalEntries(prev => [newEntry, ...prev]);
      setNewJournalText('');
      setShowAddJournalModal(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'entrée au journal');
    }
  };

  const onEditJournalEntry = (entry: JournalEntry) => {
    setEditingJournalEntry(entry);
    setEditJournalText(entry.content);
    setShowEditJournalModal(true);
  };

  const onSaveEditJournalEntry = async () => {
    if (!editingJournalEntry || !editJournalText.trim()) return;
    if (tripCompleted) {
      Alert.alert('Voyage terminé', 'Ce voyage est terminé, vous ne pouvez plus le modifier.');
      return;
    }
    
    try {
      await updateJournalEntry(editingJournalEntry.id, editJournalText.trim());
      setJournalEntries(prev => 
        prev.map(entry => 
          entry.id === editingJournalEntry.id 
            ? { ...entry, content: editJournalText.trim() }
            : entry
        )
      );
      setShowEditJournalModal(false);
      setEditingJournalEntry(null);
      setEditJournalText('');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier l\'entrée du journal');
    }
  };

  const onDeleteJournalEntry = (entryId: number) => {
    if (tripCompleted) {
      Alert.alert('Voyage terminé', 'Ce voyage est terminé, vous ne pouvez plus le modifier.');
      return;
    }
    
    Alert.alert(
      'Supprimer l\'entrée',
      'Êtes-vous sûr de vouloir supprimer cette entrée du journal ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteJournalEntry(entryId);
              setJournalEntries(prev => prev.filter(entry => entry.id !== entryId));
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer l\'entrée du journal');
            }
          }
        }
      ]
    );
  };

  const onCancelEditJournalEntry = () => {
    setEditingJournalEntry(null);
    setEditJournalText('');
    setShowEditJournalModal(false);
  };

  // Fonctions pour redéfinir le point d'arrivée
  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedNewLocation({ latitude, longitude });
    
    try {
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result.length > 0) {
        const address = result[0];
        const addressString = [
          address.street,
          address.city,
          address.region,
          address.country
        ].filter(Boolean).join(', ');
        setNewLocationName(addressString);
      }
    } catch (error) {
      console.log('Erreur lors de la résolution de l\'adresse:', error);
      setNewLocationName('Nouvelle destination');
    }
  };

  const handleRedefineArrival = async () => {
    if (!selectedNewLocation || !step) {
      Alert.alert('Erreur', 'Veuillez sélectionner un nouvel emplacement');
      return;
    }

    try {
      await updateStep(step.id, {
        latitude: selectedNewLocation.latitude,
        longitude: selectedNewLocation.longitude,
        name: newLocationName.trim() || step.name
      });
      
      Alert.alert('Succès', 'Point d\'arrivée redéfini avec succès', [
        { text: 'OK', onPress: () => {
          setShowRedefineArrival(false);
          setSelectedNewLocation(null);
          setNewLocationName('');
          setSearchQuery('');
          setSearchResults([]);
          loadStep(); // Recharger les données
        }}
      ]);
    } catch (error) {
      console.log('Erreur lors de la redéfinition:', error);
      Alert.alert('Erreur', 'Impossible de redéfinir le point d\'arrivée');
    }
  };

  // Fonction de recherche de lieux
  const searchPlaces = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await Location.geocodeAsync(query);
      
      // Résoudre les adresses pour chaque résultat
      const resultsWithAddresses = await Promise.all(
        results.map(async (result, index) => {
          try {
            const reverseResults = await Location.reverseGeocodeAsync({
              latitude: result.latitude,
              longitude: result.longitude
            });
            const address = reverseResults.length > 0 
              ? [
                  reverseResults[0].street,
                  reverseResults[0].city,
                  reverseResults[0].region,
                  reverseResults[0].country
                ].filter(Boolean).join(', ')
              : `${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`;
            
            return {
              id: index,
              latitude: result.latitude,
              longitude: result.longitude,
              name: query,
              address: address
            };
          } catch (error) {
            return {
              id: index,
              latitude: result.latitude,
              longitude: result.longitude,
              name: query,
              address: `${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`
            };
          }
        })
      );
      
      setSearchResults(resultsWithAddresses);
    } catch (error) {
      console.log('Erreur lors de la recherche:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultSelect = async (result: any) => {
    setSelectedNewLocation({ latitude: result.latitude, longitude: result.longitude });
    setNewLocationName(result.name);
    setSearchQuery('');
    setSearchResults([]);
    
    // Centrer la carte sur le résultat sélectionné
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: result.latitude,
        longitude: result.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const onDeleteStep = async () => {
    if (!step) return;
    if (isFirst || isLast) {
      Alert.alert('Action non autorisée', isFirst ? "Le point de départ ne peut pas être supprimé." : "Le point d'arrivée ne peut pas être supprimé ici.");
      return;
    }
    // Vérifier s'il y a des images liées à cette étape
    const hasImages = stepImages.length > 0;
    
    Alert.alert(
      "Supprimer l'étape",
      hasImages 
        ? `Voulez-vous supprimer l'étape "${step.name}" ?\n\n⚠️ ATTENTION : Toutes les photos de cette étape seront définitivement supprimées de la galerie du voyage.`
        : `Voulez-vous supprimer l'étape "${step.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: hasImages ? 'Supprimer (perdre les photos)' : 'Supprimer', 
          style: 'destructive',
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
                pathname: `/trip/${tripId}/map` as any,
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
          {/* Champs de dates */}
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date de début</Text>
            <Pressable 
              style={styles.dateInput}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {startDate ? startDate.toLocaleDateString('fr-FR') : 'Sélectionner une date'}
              </Text>
              <Text style={styles.dateIcon}>📅</Text>
            </Pressable>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date de fin</Text>
            <Pressable 
              style={styles.dateInput}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {endDate ? endDate.toLocaleDateString('fr-FR') : 'Sélectionner une date'}
              </Text>
              <Text style={styles.dateIcon}>📅</Text>
            </Pressable>
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

        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          {/* Bouton d'arrivée */}
          {(() => {
            const currentStepIndex = allSteps.findIndex(s => s.id === Number(stepId));
            const isFirstStep = currentStepIndex === 0;
            const isDisabled = isFirstStep || (currentStepIndex > 1 && !allSteps[currentStepIndex - 1]?.arrived_at);
            
            // Vérifier si on peut dé-marquer cette étape
            let canUnmark = true;
            if (isArrived) {
              for (let i = currentStepIndex + 1; i < allSteps.length; i++) {
                if (allSteps[i].arrived_at) {
                  canUnmark = false;
                  break;
                }
              }
            }
            
            // Ne pas afficher le bouton pour la première étape (départ)
            if (isFirstStep) {
              return (
                <View style={styles.departureInfo}>
                  <Text style={styles.departureText}>🏠 Point de départ</Text>
                  <Text style={styles.departureSubtext}>Vous êtes déjà ici !</Text>
                </View>
              );
            }
            
            return (
              <Pressable 
                style={[
                  styles.arrivalBtn,
                  isArrived && canUnmark && styles.arrivalBtnUnmark,
                  isArrived && !canUnmark && styles.arrivalBtnArrived,
                  (tripCompleted || !adventureStarted || (isDisabled && !isArrived) || (isArrived && !canUnmark)) && styles.arrivalBtnDisabled
                ]}
                onPress={handleArrivalToggle}
                disabled={tripCompleted || !adventureStarted || (isDisabled && !isArrived) || (isArrived && !canUnmark)}
              >
                <Text style={[
                  styles.arrivalBtnText, 
                  isArrived && styles.arrivalBtnTextArrived,
                  (tripCompleted || !adventureStarted || (isDisabled && !isArrived) || (isArrived && !canUnmark)) && styles.arrivalBtnTextDisabled
                ]}>
                  {tripCompleted ? '🏁 Voyage terminé' :
                    !adventureStarted ? '🚀 Aventure non démarrée' :
                    isArrived ? 
                      (canUnmark ? 'Marquer comme non-arrivé' : '⏳ Étape suivante bloquée') :
                      isDisabled ? '⏳ Étape précédente requise' : '📍 Je suis arrivé'}
                </Text>
              </Pressable>
            );
          })()}

          {/* Bouton Terminer le voyage - affiché seulement si c'est la dernière étape, qu'on est arrivé, et que le voyage n'est pas encore terminé */}
          {isLastStep && isArrived && !tripCompleted && (
            <Pressable
              style={styles.finishTripBtn}
              onPress={handleFinishTrip}
            >
              <Text style={styles.finishTripBtnText}>
                🏁 Terminer le voyage
              </Text>
            </Pressable>
          )}

          {/* Message si le voyage est terminé */}
          {tripCompleted && (
            <View style={styles.tripCompletedInfo}>
              <Text style={styles.tripCompletedText}>
                🎉 Voyage terminé !
              </Text>
              <Text style={styles.tripCompletedSubtext}>
                Félicitations ! Ce voyage est maintenant dans vos souvenirs.
              </Text>
            </View>
          )}

          {isLast && (
            <Pressable style={styles.redefineArrivalBtn} onPress={() => setShowRedefineArrival(true)}>
              <Text style={styles.redefineArrivalText}>📍 Redéfinir le point d'arrivée</Text>
            </Pressable>
          )}
          {!isFirst && !isLast && (
            <Pressable style={styles.deleteStepBtn} onPress={onDeleteStep}>
              <Text style={styles.deleteStepText}>🗑️ Supprimer cette étape</Text>
            </Pressable>
          )}
        </View>

        {/* Section Journal de bord */}
        <View style={styles.journalSection}>
          <View style={styles.journalHeader}>
            <Text style={styles.sectionTitle}>Journal de bord</Text>
            <Pressable 
              style={styles.addJournalButton} 
              onPress={() => setShowAddJournalModal(true)}
              disabled={tripCompleted}
            >
              <Text style={styles.addJournalButtonText}>+ Ajouter</Text>
            </Pressable>
          </View>
          
          {journalEntries.length === 0 ? (
            <View style={styles.noJournalContainer}>
              <Text style={styles.noJournalIcon}>📝</Text>
              <Text style={styles.noJournalText}>Aucune entrée</Text>
              <Text style={styles.noJournalSubtext}>Ajoutez votre première note dans le journal</Text>
            </View>
          ) : (
            <View style={styles.journalList}>
              {journalEntries.map((entry) => (
                <View key={entry.id} style={styles.journalEntry}>
                  <View style={styles.journalEntryHeader}>
                    <Text style={styles.journalEntryDate}>
                      {new Date(entry.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                    {!tripCompleted && (
                      <View style={styles.journalEntryActions}>
                        <Pressable 
                          style={styles.journalEditButton} 
                          onPress={() => onEditJournalEntry(entry)}
                        >
                          <Text style={styles.journalEditButtonText}>✏️</Text>
                        </Pressable>
                        <Pressable 
                          style={styles.journalDeleteButton} 
                          onPress={() => onDeleteJournalEntry(entry.id)}
                        >
                          <Text style={styles.journalDeleteButtonText}>🗑️</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                  <Text style={styles.journalEntryContent}>{entry.content}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Section Checklist */}
        <View style={styles.checklistSection}>
          <Text style={styles.sectionTitle}>Checklist de l'étape</Text>
          
          {/* Ajouter un nouvel élément */}
          <View style={styles.addChecklistContainer}>
            <TextInput
              style={styles.addChecklistInput}
              placeholder="Ex: Visiter le musée, Prendre des photos..."
              value={newChecklistText}
              onChangeText={setNewChecklistText}
              onSubmitEditing={onAddChecklistItem}
              returnKeyType="done"
            />
            <Pressable 
              style={[styles.addChecklistButton, !newChecklistText.trim() && styles.addChecklistButtonDisabled]} 
              onPress={onAddChecklistItem}
              disabled={!newChecklistText.trim()}
            >
              <Text style={styles.addChecklistButtonText}>+</Text>
            </Pressable>
          </View>

          {/* Indicateur de progression */}
          {checklistItems.length > 0 && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {checklistItems.filter(item => item.is_checked).length} / {checklistItems.length} terminés
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(checklistItems.filter(item => item.is_checked).length / checklistItems.length) * 100}%` }
                  ]} 
                />
              </View>
            </View>
          )}

          {/* Liste des éléments de checklist */}
          {checklistItems.length === 0 ? (
            <View style={styles.noChecklistContainer}>
              <Text style={styles.noChecklistIcon}>📝</Text>
              <Text style={styles.noChecklistText}>Aucun élément</Text>
              <Text style={styles.noChecklistSubtext}>Ajoutez votre premier élément à la checklist</Text>
            </View>
          ) : (
            <View style={styles.checklistList}>
              {checklistItems.map((item) => (
                <View key={item.id} style={styles.checklistItem}>
                  <Pressable 
                    style={styles.checklistCheckbox} 
                    onPress={() => onToggleChecklistItem(item.id)}
                  >
                    <Text style={styles.checklistCheckboxText}>
                      {item.is_checked ? '✅' : '⬜'}
                    </Text>
                  </Pressable>
                  
                  {editingChecklistId === item.id ? (
                    <View style={styles.checklistEditContainer}>
                      <TextInput
                        style={styles.checklistEditInput}
                        value={editingChecklistText}
                        onChangeText={setEditingChecklistText}
                        autoFocus
                        onSubmitEditing={onSaveEditChecklistItem}
                        returnKeyType="done"
                      />
                      <Pressable style={styles.checklistSaveButton} onPress={onSaveEditChecklistItem}>
                        <Text style={styles.checklistSaveButtonText}>✓</Text>
                      </Pressable>
                      <Pressable style={styles.checklistCancelButton} onPress={onCancelEditChecklistItem}>
                        <Text style={styles.checklistCancelButtonText}>✕</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.checklistItemContent}>
                      <Text style={[
                        styles.checklistItemText,
                        item.is_checked ? styles.checklistItemTextChecked : null
                      ]}>
                        {item.text}
                      </Text>
                      <View style={styles.checklistItemActions}>
                        <Pressable 
                          style={styles.checklistEditButton} 
                          onPress={() => onStartEditChecklistItem(item)}
                        >
                          <Text style={styles.checklistEditButtonText}>✏️</Text>
                        </Pressable>
                        <Pressable 
                          style={styles.checklistDeleteButton} 
                          onPress={() => onDeleteChecklistItem(item.id)}
                        >
                          <Text style={styles.checklistDeleteButtonText}>🗑️</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
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

      {/* Modal pour redéfinir le point d'arrivée */}
      <Modal visible={showRedefineArrival} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Redéfinir le point d'arrivée</Text>
            <Pressable onPress={() => setShowRedefineArrival(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Recherchez un lieu ou maintenez appuyé sur la carte pour sélectionner le nouveau point d'arrivée
            </Text>
            
            {/* Barre de recherche */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un lieu (ex: Paris, Tour Eiffel...)"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  searchPlaces(text);
                }}
                returnKeyType="search"
                onSubmitEditing={() => searchPlaces(searchQuery)}
              />
              {isSearching && (
                <View style={styles.searchLoading}>
                  <Text style={styles.searchLoadingText}>Recherche...</Text>
                </View>
              )}
            </View>
            
            {/* Résultats de recherche */}
            {searchResults.length > 0 && (
              <View style={styles.searchResultsContainer}>
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.searchResultItem}
                      onPress={() => handleSearchResultSelect(item)}
                    >
                      <Text style={styles.searchResultName}>{item.name}</Text>
                      <Text style={styles.searchResultAddress}>{item.address}</Text>
                    </Pressable>
                  )}
                  style={styles.searchResultsList}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            )}
            
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: step?.latitude || 0,
                  longitude: step?.longitude || 0,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                onLongPress={handleMapPress}
              >
                {selectedNewLocation && (
                  <Marker
                    coordinate={selectedNewLocation}
                    title="Nouveau point d'arrivée"
                  />
                )}
                {step && (
                  <Marker
                    coordinate={{ latitude: step.latitude, longitude: step.longitude }}
                    title="Point d'arrivée actuel"
                    pinColor="orange"
                  />
                )}
              </MapView>
            </View>
            
            {selectedNewLocation && (
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Nouvelle destination :</Text>
                <TextInput
                  style={styles.locationInput}
                  value={newLocationName}
                  onChangeText={setNewLocationName}
                  placeholder="Nom de la nouvelle destination"
                />
              </View>
            )}
            
            <View style={styles.modalActions}>
              <Pressable 
                style={styles.modalButtonSecondary} 
                onPress={() => setShowRedefineArrival(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Annuler</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalButtonPrimary, !selectedNewLocation && styles.modalButtonDisabled]} 
                onPress={handleRedefineArrival}
                disabled={!selectedNewLocation}
              >
                <Text style={styles.modalButtonTextPrimary}>Redéfinir</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal pour ajouter une entrée au journal */}
      <Modal visible={showAddJournalModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ajouter une note au journal</Text>
            <Pressable onPress={() => setShowAddJournalModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Partagez vos pensées et souvenirs de cette étape
            </Text>
            
            <TextInput
              style={styles.journalTextInput}
              placeholder="Écrivez votre note ici..."
              value={newJournalText}
              onChangeText={setNewJournalText}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
            
            <View style={styles.modalActions}>
              <Pressable 
                style={styles.modalButtonSecondary} 
                onPress={() => setShowAddJournalModal(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Annuler</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalButtonPrimary, !newJournalText.trim() && styles.modalButtonDisabled]} 
                onPress={onAddJournalEntry}
                disabled={!newJournalText.trim()}
              >
                <Text style={styles.modalButtonTextPrimary}>Ajouter</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal pour modifier une entrée du journal */}
      <Modal visible={showEditJournalModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier la note</Text>
            <Pressable onPress={onCancelEditJournalEntry}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Modifiez votre note du journal
            </Text>
            
            <TextInput
              style={styles.journalTextInput}
              placeholder="Écrivez votre note ici..."
              value={editJournalText}
              onChangeText={setEditJournalText}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
            
            <View style={styles.modalActions}>
              <Pressable 
                style={styles.modalButtonSecondary} 
                onPress={onCancelEditJournalEntry}
              >
                <Text style={styles.modalButtonTextSecondary}>Annuler</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalButtonPrimary, !editJournalText.trim() && styles.modalButtonDisabled]} 
                onPress={onSaveEditJournalEntry}
                disabled={!editJournalText.trim()}
              >
                <Text style={styles.modalButtonTextPrimary}>Sauvegarder</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // colors.backgroundPrimary
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
    color: '#4A4A4A', // colors.textSecondary
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#1A1A1A', // colors.textPrimary
    marginBottom: 20,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0', // colors.borderLight
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2FB6A1', // colors.keppel
    fontWeight: '600',
  },
  viewOnMapBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#2FB6A1', // colors.keppel
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  viewOnMapText: {
    color: '#FFFFFF', // colors.white
    fontWeight: '700',
  },
  viewOnMapInlineBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#2FB6A1', // colors.keppel
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  viewOnMapInlineText: {
    color: '#FFFFFF', // colors.white
    fontWeight: '700',
    width: "100%",
  },
  stepName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A', // colors.textPrimary
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
    color: '#4A4A4A', // colors.textSecondary
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1A1A1A', // colors.textPrimary
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0', // colors.borderLight
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  checklistSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  addChecklistContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
    gap: 12,
  },
  addChecklistInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  addChecklistButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addChecklistButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  addChecklistButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  noChecklistContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  noChecklistIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noChecklistText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  noChecklistSubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
  checklistList: {
    marginTop: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  checklistCheckbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checklistCheckboxText: {
    fontSize: 20,
  },
  checklistItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checklistItemText: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    marginRight: 12,
  },
  checklistItemTextChecked: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  checklistItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  checklistEditButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  checklistEditButtonText: {
    fontSize: 16,
  },
  checklistDeleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
  },
  checklistDeleteButtonText: {
    fontSize: 16,
  },
  checklistEditContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checklistEditInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: 'white',
  },
  checklistSaveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistSaveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  checklistCancelButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistCancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
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
    backgroundColor: '#F8F1DD', // colors.eggshell
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
    color: '#4A4A4A', // colors.textSecondary
  },
  redefineArrivalBtn: {
    backgroundColor: '#2FB6A1', // colors.keppel
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  redefineArrivalText: {
    color: 'white',
    fontWeight: '700',
    textAlign: 'center',
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
  
  // Bouton d'arrivée
  arrivalBtn: {
    backgroundColor: '#2FB6A1', // colors.keppel
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2FB6A1', // colors.keppel
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  arrivalBtnArrived: {
    backgroundColor: '#2FB6A1', // colors.success
    shadowColor: '#2FB6A1',
  },
  arrivalBtnUnmark: {
    backgroundColor: '#F59E0B', // colors.warning
    shadowColor: '#F59E0B',
  },
  arrivalBtnText: {
    color: '#FFFFFF', // colors.white
    fontWeight: '800',
    fontSize: 18,
  },
  arrivalBtnTextArrived: {
    color: '#FFFFFF',
  },
  arrivalBtnDisabled: {
    backgroundColor: '#9ca3af', // Gris
    shadowColor: '#9ca3af',
  },
  arrivalBtnTextDisabled: {
    color: '#6b7280', // Gris foncé
  },
  
  // Styles pour le bouton Terminer le voyage
  finishTripBtn: {
    backgroundColor: '#dc2626', // Rouge
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#dc2626',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  finishTripBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
  },
  
  // Styles pour le message voyage terminé
  tripCompletedInfo: {
    backgroundColor: '#f0fdf4', // Vert très clair
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#22c55e', // Vert
  },
  tripCompletedText: {
    color: '#15803d', // Vert foncé
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 4,
  },
  tripCompletedSubtext: {
    color: '#16a34a', // Vert moyen
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Styles pour le point de départ
  departureInfo: {
    backgroundColor: '#f3f4f6', // Gris clair
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d1d5db', // Gris
  },
  departureText: {
    color: '#374151', // Gris foncé
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 4,
  },
  departureSubtext: {
    color: '#6b7280', // Gris moyen
    fontWeight: '500',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A', // colors.textPrimary
    marginBottom: 16,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0', // colors.borderLight
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0', // colors.borderLight
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  dateText: {
    fontSize: 16,
    color: '#1A1A1A', // colors.textPrimary
    flex: 1,
  },
  dateIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  noPhotosContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F8F1DD', // colors.eggshell
    borderRadius: 12,
  },
  noPhotosText: {
    fontSize: 16,
    color: '#4A4A4A', // colors.textSecondary
    marginBottom: 8,
  },
  noPhotosSubtext: {
    fontSize: 14,
    color: '#4A4A4A', // colors.textSecondary
  },
  photosHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addImageCta: {
    backgroundColor: '#2FB6A1', // colors.keppel
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addImageCtaText: {
    color: '#FFFFFF', // colors.white
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
    backgroundColor: '#F8F1DD', // colors.eggshell
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
  // Styles pour le modal de redéfinition du point d'arrivée
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalClose: {
    fontSize: 24,
    color: '#6b7280',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  mapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  map: {
    flex: 1,
  },
  locationInfo: {
    marginBottom: 20,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  locationInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonTextSecondary: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  modalButtonTextPrimary: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Styles pour la barre de recherche
  searchContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  searchLoading: {
    position: 'absolute',
    right: 12,
    top: 10,
  },
  searchLoadingText: {
    color: '#6b7280',
    fontSize: 14,
    fontStyle: 'italic',
  },
  searchResultsContainer: {
    maxHeight: 150,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  searchResultsList: {
    maxHeight: 150,
  },
  searchResultItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  searchResultAddress: {
    fontSize: 14,
    color: '#6b7280',
  },
  // Styles pour le journal de bord
  journalSection: {
    padding: 20,
    marginTop: 24,
  },
  journalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addJournalButton: {
    backgroundColor: '#2FB6A1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addJournalButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  noJournalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  noJournalIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noJournalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  noJournalSubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
  journalList: {
    marginTop: 12,
  },
  journalEntry: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  journalEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  journalEntryDate: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  journalEntryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  journalEditButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  journalEditButtonText: {
    fontSize: 14,
  },
  journalDeleteButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
  },
  journalDeleteButtonText: {
    fontSize: 14,
  },
  journalEntryContent: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
  },
  journalTextInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
