import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LocationIcon from '../../../components/ui/location-icon';
import { useTheme } from '../../../contexts/ThemeContext';
import { ChecklistItem, listChecklistItems, toggleChecklistItem } from '../../../lib/checklist';
// import { JournalEntry, listJournal } from '../../../lib/journal';
import { getCurrentUser } from '../../../lib/session';
import { deleteStep, deleteStepImagesByUriForTrip, getTripStepImagesWithSteps, listSteps, Step, updateStep } from '../../../lib/steps';
import { addTripImage, deleteTripImage, getTripImages, setTripCoverImage, TripImage, updateTripImageOrder } from '../../../lib/trip-images';
import { addTripParticipant, deleteTripParticipant, getTripParticipants, TripParticipant } from '../../../lib/trip-participants';
import { deleteTrip, getTrip, toggleTripFavorite, Trip, updateTrip } from '../../../lib/trips';

export default function TripDetailsHero() {
  const { themeColors } = useTheme();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const id = Number(tripId);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  // const [notes, setNotes] = useState<JournalEntry[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [tripImages, setTripImages] = useState<TripImage[]>([]);
  const [carouselImages, setCarouselImages] = useState<any[]>([]);
  const [tripParticipants, setTripParticipants] = useState<TripParticipant[]>([]);
  const [placeCache, setPlaceCache] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [newParticipantPhone, setNewParticipantPhone] = useState('');
  const [draggedImageId, setDraggedImageId] = useState<number | null>(null);
  const [draggedOverImageId, setDraggedOverImageId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editCoverImage, setEditCoverImage] = useState<string | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [startDateValue, setStartDateValue] = useState(new Date());
  const [endDateValue, setEndDateValue] = useState(new Date());
  
  // Variables d'animation pour le carousel
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;

  // Utiliser les images du carrousel (globales d'abord, puis étapes), ou splash-screen.png en fallback
  const getImages = () => {
    if (carouselImages.length > 0) {
      return (carouselImages as any[]).map((img: any) => (img && img.uri ? img : img?.image_uri ? { uri: img.image_uri } : img));
    }
    if (trip?.cover_uri && trip.cover_uri.startsWith('file://')) {
      return [{ uri: trip.cover_uri }];
    }
    return [require('../../../assets/images/splash-screen.png')];
  };

  const images = getImages();

  const goToMap = () => {
    if (steps && steps.length > 0) {
      const dest = steps[steps.length - 1];
      router.push({
        pathname: `/trip/${id}/map` as any,
        params: { focusLat: String(dest.latitude), focusLng: String(dest.longitude) }
      });
    } else {
      router.push(`/trip/${id}/map` as any);
    }
  };

  // Résoudre le libellé du lieu (reverse géocodage) avec cache
  const getPlaceLabel = useCallback(async (lat?: number, lng?: number): Promise<string | null> => {
    if (lat == null || lng == null) return null;
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (placeCache[key]) return placeCache[key];
    try {
      const res = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const item = res?.[0];
      // Réduire à la ville uniquement (fallback sur subregion/region)
      const city = item?.city || item?.subregion || item?.region || '';
      const label = city;
      if (label) setPlaceCache(prev => ({ ...prev, [key]: label }));
      return label || null;
    } catch {
      return null;
    }
  }, [placeCache]);

  const loadData = useCallback(async () => {
    if (!id) return;
    
    // Charger l'utilisateur actuel
    const user = await getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    
    const t = await getTrip(id);
    if (t) {
      setTrip(t);
      setCurrentImageIndex(0);
      // Initialiser les champs d'édition
      setEditTitle(t.title);
      setEditDestination(t.destination || '');
      setEditDescription(t.description || '');
      setEditStartDate(t.start_date ? new Date(t.start_date).toISOString().split('T')[0] : '');
      setEditEndDate(t.end_date ? new Date(t.end_date).toISOString().split('T')[0] : '');
      setEditCoverImage(t.cover_uri || null);
      setIsFavorite(!!t.is_favorite);
    }
    
    // Charger les images du voyage (globales gérées dans ce modal) et préparer le carrousel
    const baseImages = await getTripImages(id); // globales (prioritaires en tête)
    setTripImages(baseImages);
    const stepImages = await getTripStepImagesWithSteps(id); // images d'étapes (append dans le carrousel)

    // Pour chaque image globale, si elle existe aussi comme image d'étape, on conserve UNE seule occurrence avec le label d'étape
    const labeledGlobal = baseImages.map(img => {
      const match = stepImages.find(s => s.image_uri === img.image_uri);
      if (match) {
        return { uri: match.image_uri, __stepName: match.step_name as any, __lat: match.latitude as any, __lng: match.longitude as any };
      }
      return { uri: img.image_uri } as any;
    });

    // Ajouter ensuite uniquement les images d'étapes qui n'existent pas dans les images globales
    const onlyStep = stepImages
      .filter(s => !baseImages.find(b => b.image_uri === s.image_uri))
      .map(s => ({ uri: s.image_uri, __stepName: s.step_name as any, __lat: s.latitude as any, __lng: s.longitude as any }));

    setCarouselImages([...(labeledGlobal as any), ...(onlyStep as any)]);
    
    // Charger les participants du voyage
    const participants = await getTripParticipants(id);
    setTripParticipants(participants);
    
    const s = await listSteps(id);
    setSteps(s);
    // Notes de voyage supprimées de la page: ne plus charger le journal ici
    const c = await listChecklistItems(id);
    setChecklistItems(c);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      alert('Permission requise pour accéder à la galerie photo');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setEditCoverImage(result.assets[0].uri);
    }
  };

  const onSaveEdit = async () => {
    if (!trip) return;
    
    try {
      // Sauvegarder en base de données
      await updateTrip(
        trip.id,
        editTitle,
        editDestination,
        editDescription,
        editStartDate ? new Date(editStartDate).getTime() : null,
        editEndDate ? new Date(editEndDate).getTime() : null,
        editCoverImage
      );
      
      // Recharger les données
      await loadData();
      setShowEditModal(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications');
    }
  };

  const onDeleteStep = (stepId: number, stepName: string) => {
    const isLastStep = steps.length > 0 && steps[steps.length - 1].id === stepId;
    const isFirstStep = steps.length > 0 && steps[0].id === stepId;
    
    // Le point d'arrivée ne peut pas être supprimé, seulement redéfini
    if (isLastStep) {
      Alert.alert(
        'Point d\'arrivée',
        'Le point d\'arrivée ne peut pas être supprimé. Utilisez le bouton "Redéfinir le lieu" pour le modifier.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    let message = `Êtes-vous sûr de vouloir supprimer l'étape "${stepName}" ?`;
    if (isFirstStep) {
      message += '\n\n⚠️ Cette étape est votre point de départ. Vous devrez redémarrer l\'aventure pour définir un nouveau point de départ.';
    }
    
    Alert.alert(
      'Supprimer l\'étape',
      message,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStep(stepId);
              
              // Réorganiser l'ordre des étapes restantes
              const remainingSteps = steps.filter(step => step.id !== stepId);
              for (let i = 0; i < remainingSteps.length; i++) {
                await updateStep(remainingSteps[i].id, { order_index: i });
              }
              
              await loadData();
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
            }
          },
        },
      ]
    );
  };

  const onRedefineArrival = (stepId: number, stepName: string) => {
    Alert.alert(
      'Redéfinir le point d\'arrivée',
      `Voulez-vous redéfinir le lieu de "${stepName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Redéfinir',
          onPress: () => {
            // TODO: Ouvrir un modal pour redéfinir le lieu
            Alert.alert('Redéfinir lieu', 'Fonctionnalité à venir : redéfinir le lieu du point d\'arrivée');
          },
        },
      ]
    );
  };

  const onToggleChecklistItem = async (itemId: number) => {
    try {
      await toggleChecklistItem(itemId);
      await loadData();
    } catch (error) {
      console.error('Erreur lors du toggle:', error);
    }
  };

  const onAddImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission requise pour accéder à la galerie photo');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      try {
        await addTripImage(id, result.assets[0].uri);
        await loadData();
        // Revenir à la première image du carrousel
        setCurrentImageIndex(0);
        try { scrollViewRef.current?.scrollTo?.({ x: 0, y: 0, animated: false }); } catch {}
        Alert.alert('Succès', 'Image ajoutée au voyage');
      } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'image:', error);
        Alert.alert('Erreur', 'Impossible d\'ajouter l\'image');
      }
    }
  };

  const onDeleteImage = async (imageId: number, imageUri?: string) => {
    Alert.alert(
      'Supprimer l\'image',
      'Êtes-vous sûr de vouloir supprimer cette image ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTripImage(imageId);
              if (imageUri) {
                // Supprimer aussi l'image des étapes de ce voyage si elle est utilisée
                await deleteStepImagesByUriForTrip(id, imageUri);
              }
              await loadData();
              // Revenir à la première image du carrousel
              setCurrentImageIndex(0);
              try { scrollViewRef.current?.scrollTo?.({ x: 0, y: 0, animated: false }); } catch {}
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'image');
            }
          },
        },
      ]
    );
  };

  const onSetCoverImage = async (imageUri: string) => {
    try {
      await setTripCoverImage(id, imageUri);
      await loadData();
      Alert.alert('Succès', 'Image de couverture mise à jour');
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'image de couverture:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour l\'image de couverture');
    }
  };

  // Fonctions pour les date pickers
  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDateValue(selectedDate);
      setEditStartDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDateValue(selectedDate);
      setEditEndDate(selectedDate.toISOString().split('T')[0]);
    }
  };


  // Fonction pour ouvrir l'image en plein écran
  const onImagePress = (index: number) => {
    setSelectedImageIndex(index);
    setShowImageModal(true);
  };

  // Fonction pour changer d'image
  const goToImage = (index: number) => {
    if (scrollViewRef.current) {
      scrollViewRef.current?.scrollTo({
        x: index * screenWidth,
        animated: true,
      });
      setCurrentImageIndex(index);
    }
  };

  // Fonction pour supprimer le voyage
  const onDeleteTrip = () => {
    Alert.alert(
      'Supprimer le voyage',
      'Êtes-vous sûr de vouloir supprimer ce voyage ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrip(id);
              Alert.alert('Succès', 'Voyage supprimé avec succès');
              router.replace('/(tabs)/explore');
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le voyage');
            }
          },
        },
      ]
    );
  };

  const onToggleFavorite = async () => {
    try {
      const newFavoriteState = await toggleTripFavorite(id);
      setIsFavorite(newFavoriteState);
      
      // Mettre à jour l'état local du voyage
      if (trip) {
        setTrip({ ...trip, is_favorite: newFavoriteState ? 1 : 0 });
      }
      
      console.log('Favori togglé dans details:', { id, newFavoriteState });
    } catch (error) {
      console.error('Erreur lors du toggle favori:', error);
      Alert.alert('Erreur', 'Impossible de modifier les favoris');
    }
  };

  // Fonctions pour gérer les participants
  const onAddParticipant = async () => {
    if (!newParticipantName.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }

    try {
      await addTripParticipant(
        id, 
        newParticipantName.trim(), 
        newParticipantEmail.trim() || null, 
        newParticipantPhone.trim() || null
      );
      
      // Recharger les participants
      const participants = await getTripParticipants(id);
      setTripParticipants(participants);
      
      // Réinitialiser le formulaire
      setNewParticipantName('');
      setNewParticipantEmail('');
      setNewParticipantPhone('');
      setShowAddParticipantModal(false);
      
      Alert.alert('Succès', 'Participant ajouté avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le participant');
    }
  };

  const onDeleteParticipant = (participantId: number, participantName: string) => {
    Alert.alert(
      'Supprimer le participant',
      `Êtes-vous sûr de vouloir supprimer ${participantName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTripParticipant(participantId);
              const participants = await getTripParticipants(id);
              setTripParticipants(participants);
              Alert.alert('Succès', 'Participant supprimé avec succès');
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le participant');
            }
          },
        },
      ]
    );
  };

  // Fonction pour cliquer sur une image et changer son ordre
  const onImageClick = async (imageId: number) => {
    if (!draggedImageId) {
      // Première image cliquée - la sélectionner
      setDraggedImageId(imageId);
    } else if (draggedImageId === imageId) {
      // Même image cliquée - désélectionner
      setDraggedImageId(null);
      setDraggedOverImageId(null);
    } else {
      // Deuxième image cliquée - échanger avec la première
      const fromIndex = tripImages.findIndex(img => img.id === draggedImageId);
      const toIndex = tripImages.findIndex(img => img.id === imageId);
      
      if (fromIndex !== -1 && toIndex !== -1) {
        try {
          const newImages = [...tripImages];
          [newImages[fromIndex], newImages[toIndex]] = [newImages[toIndex], newImages[fromIndex]];
          
          // Mettre à jour l'ordre dans la base de données
          for (let i = 0; i < newImages.length; i++) {
            await updateTripImageOrder(newImages[i].id, i);
          }
          
          await loadData();
        } catch (error) {
          console.error('Erreur lors du réordonnement:', error);
          Alert.alert('Erreur', 'Impossible de réorganiser les images');
        }
      }
      
      setDraggedImageId(null);
      setDraggedOverImageId(null);
    }
  };

  const dateRange = useMemo(() => {
    if (!trip) return '';
    const fmt = (ms?: number | null) => (ms ? new Date(ms).toLocaleDateString() : '');
    const s = fmt(trip.start_date as any);
    const e = fmt(trip.end_date as any);
    if (s && e) return `du ${s} au ${e}`;
    return s || e;
  }, [trip]);

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.backgroundSecondary,
    },
    backBtn: {
      position: 'absolute',
      top: 60,
      left: 20,
      zIndex: 10,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    backIcon: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: 'bold',
    },
    editBtn: {
      position: 'absolute',
      top: 60,
      right: 20,
      zIndex: 10,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    editIcon: {
      color: '#FFFFFF',
      fontSize: 16,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Composant interne pour afficher le nom du lieu par lat/lng */}
      {/* Déclaré ici pour accéder à resolver via props */}
      {null}
      {/* Fixed buttons - outside ScrollView */}
      <Pressable style={dynamicStyles.backBtn} onPress={() => router.back()}>
        <Text style={dynamicStyles.backIcon}>←</Text>
      </Pressable>
      <Pressable style={dynamicStyles.editBtn} onPress={() => setShowEditModal(true)}>
        <Text style={dynamicStyles.editIcon}>✏️</Text>
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.heroWrap}>
        <View style={styles.heroContainer}>
          
          <Animated.ScrollView 
            ref={scrollViewRef}
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { 
                useNativeDriver: false,
                listener: (event) => {
                  // Optionnel : ajouter des logs pour debug si nécessaire
                }
              }
            )}
            onScrollEndDrag={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
              setCurrentImageIndex(index);
            }}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
              setCurrentImageIndex(index);
            }}
            style={styles.imageScrollView}
            decelerationRate="normal"
            snapToInterval={screenWidth - 24}
            snapToAlignment="start"
            disableIntervalMomentum={true}
          >
            {images.map((image, index) => {
              const inputRange = [
                (index - 1) * (screenWidth - 24),
                index * (screenWidth - 24),
                (index + 1) * (screenWidth - 24),
              ];
              
              const scale = scrollX.interpolate({
                inputRange,
                outputRange: [0.85, 1, 0.85],
                extrapolate: 'clamp',
                easing: (t) => t * t * (3 - 2 * t), // Smooth step function
              });
              
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.7, 1, 0.7],
                extrapolate: 'clamp',
                easing: (t) => t * t * (3 - 2 * t), // Smooth step function
              });

              return (
                <Pressable
                  key={(image as any)?.uri ? String((image as any).uri) : `img-${index}`}
                  onPress={() => onImagePress(index)}
                  style={{ flex: 1 }}
                >
                  <Animated.View
                    style={[
                      styles.hero,
                      {
                        transform: [{ scale }],
                        opacity,
                      }
                    ]}
                  >
                    <ImageBackground
                      source={image}
                      style={styles.hero}
                      imageStyle={styles.heroImg}
                    >
                      {typeof image === 'object' && image !== null && ((image as any).__stepName || (image as any).__lat) ? (
                        <View style={styles.heroLabel}>
                          {(image as any).__stepName ? (
                            <Text style={styles.heroLabelText}>{String((image as any).__stepName)}</Text>
                          ) : (
                            ((image as any).__lat && (image as any).__lng) ? (
                              <PlaceName lat={(image as any).__lat} lng={(image as any).__lng} resolver={getPlaceLabel} />
                            ) : null
                          )}
                        </View>
                      ) : null}
                    </ImageBackground>
                  </Animated.View>
                </Pressable>
              );
            })}
          </Animated.ScrollView>
          
          {/* Carousel dots - positioned over the image at bottom */}
          {images.length > 1 && (
            <View style={styles.carouselDots}>
              {images.map((img, index) => (
                <Pressable 
                  key={(img as any)?.uri ? `dot-${String((img as any).uri)}` : `dot-${index}`}
                  style={[styles.dot, index === currentImageIndex && styles.dotActive]} 
                  onPress={() => goToImage(index)}
                />
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.locationRow}>
          <View style={styles.locationIconContainer}>
            <LocationIcon size={16} color={themeColors.primary} />
          </View>
          <Text style={styles.place}>{trip?.destination || 'Destination'}</Text>
          <View style={styles.participantsBadge}>
            <Text style={styles.participantsIcon}>👥</Text>
            <Text style={styles.participantsCount}>{tripParticipants.length + 1}</Text>
          </View>
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{trip?.title ?? 'Voyage'}</Text>
          <Pressable 
            style={styles.favoriteButton} 
            onPress={onToggleFavorite}
          >
            <Text style={styles.favoriteIcon}>
              {isFavorite ? '❤️' : '🤍'}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.desc}>
          {trip?.description || 'Aucune description disponible.'}
        </Text>
        
        {!!dateRange && <Text style={styles.dates}>{dateRange}</Text>}
        
        {/* Bouton carte agrandi */}
        <Pressable style={styles.mapButtonLarge} onPress={goToMap}>
          <View style={styles.mapButtonContent}>
            <Text style={styles.mapButtonIcon}>🗺️</Text>
            <View style={styles.mapButtonTextContainer}>
              <Text style={styles.mapButtonTitle}>Gérer les étapes du voyage</Text>
              <Text style={styles.mapButtonSubtitle}>Ajouter, modifier et organiser vos étapes sur la carte</Text>
            </View>
            <Text style={styles.mapButtonArrow}>→</Text>
          </View>
        </Pressable>

        {/* Statut du voyage */}
        <View style={styles.tripStatusSection}>
          <Text style={styles.section}>Statut du voyage</Text>
          <View style={styles.tripStatusContainer}>
            <View style={[styles.tripStatusCard, { 
              backgroundColor: trip?.completed === 1 ? '#10B981' : 
                              trip?.adventure_started === 1 ? '#F59E0B' : '#6B7280',
              borderColor: trip?.completed === 1 ? '#059669' : 
                          trip?.adventure_started === 1 ? '#D97706' : '#4B5563'
            }]}>
              <Text style={styles.tripStatusIcon}>
                {trip?.completed === 1 ? '✅' : 
                 trip?.adventure_started === 1 ? '🔄' : '⏳'}
              </Text>
              <View style={styles.tripStatusTextContainer}>
                <Text style={styles.tripStatusTitle}>
                  {trip?.completed === 1 ? 'Voyage terminé' : 
                   trip?.adventure_started === 1 ? 'Voyage en cours' : 'Voyage planifié'}
                </Text>
                <Text style={styles.tripStatusSubtitle}>
                  {trip?.completed === 1 
                    ? 'Toutes les étapes ont été complétées' 
                    : trip?.adventure_started === 1 
                    ? 'Voyage en cours de réalisation'
                    : 'Voyage en préparation, pas encore démarré'
                  }
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Résumé du suivi des étapes */}
        {steps.length > 0 && (
          <View style={styles.stepsSummarySection}>
            <Text style={styles.section}>Suivi des étapes</Text>
            {(() => {
              // Exclure l'étape de départ (première étape) car elle n'est pas comptabilisée
              const stepsWithoutDeparture = steps.slice(1);
              const completedSteps = stepsWithoutDeparture.filter(step => step.arrived_at !== null);
              const pendingSteps = stepsWithoutDeparture.filter(step => step.arrived_at === null);
              const totalSteps = stepsWithoutDeparture.length;
              const completionPercentage = totalSteps > 0 ? Math.round((completedSteps.length / totalSteps) * 100) : 0;
              
              return (
                <>
                  <View style={styles.stepsSummaryContainer}>
                    <View style={styles.stepsSummaryCard}>
                      <Text style={styles.stepsSummaryNumber}>{completedSteps.length}</Text>
                      <Text style={styles.stepsSummaryLabel}>Terminées</Text>
                    </View>
                    <View style={styles.stepsSummaryCard}>
                      <Text style={styles.stepsSummaryNumber}>{pendingSteps.length}</Text>
                      <Text style={styles.stepsSummaryLabel}>En attente</Text>
                    </View>
                    <View style={styles.stepsSummaryCard}>
                      <Text style={styles.stepsSummaryNumber}>{totalSteps}</Text>
                      <Text style={styles.stepsSummaryLabel}>Total</Text>
                    </View>
                  </View>
                  <View style={styles.stepsProgressBarContainer}>
                    <View style={styles.stepsProgressBar}>
                      <View 
                        style={[
                          styles.stepsProgressBarFill, 
                          { 
                            width: `${completionPercentage}%` 
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.stepsProgressText}>
                      {completionPercentage}% complété
                    </Text>
                  </View>
                </>
              );
            })()}
          </View>
        )}
      </View>

      {/* Steps Section removed: gestion des étapes depuis la carte */}

      {/* Participants Section */}
      <View style={styles.participantsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.section}>Participants</Text>
          <Pressable style={styles.manageButton} onPress={() => setShowParticipantsModal(true)}>
            <Text style={styles.manageButtonText}>Gérer</Text>
          </Pressable>
        </View>
        
        <View style={styles.participantsList}>
          {/* Afficher l'utilisateur actuel en premier */}
          <View style={[styles.participantItem, styles.currentUserItem]}>
            <View style={[styles.participantAvatar, styles.currentUserAvatar]}>
              {currentUser?.profile_photo_uri ? (
                <Image 
                  source={{ uri: currentUser.profile_photo_uri }} 
                  style={styles.participantProfileImage}
                />
              ) : (
                <Text style={styles.participantInitial}>M</Text>
              )}
            </View>
            <View style={styles.participantInfo}>
              <Text style={[styles.participantName, styles.currentUserName]}>Moi</Text>
            </View>
          </View>
          
          {/* Afficher les autres participants */}
          {tripParticipants.length > 0 && tripParticipants.slice(0, 2).map((participant) => (
            <View key={participant.id} style={styles.participantItem}>
              <View style={styles.participantAvatar}>
                <Text style={styles.participantInitial}>{participant.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{participant.name}</Text>
                {participant.email && (
                  <Text style={styles.participantEmail}>{participant.email}</Text>
                )}
              </View>
            </View>
          ))}
          
          {/* Afficher le compteur s'il y a plus de participants */}
          {tripParticipants.length > 2 && (
            <View style={styles.moreParticipants}>
              <Text style={styles.moreParticipantsText}>+{tripParticipants.length - 2} autres</Text>
            </View>
          )}
          
          {/* Message si aucun participant ajouté */}
          {tripParticipants.length === 0 && (
            <View style={styles.emptyParticipants}>
              <Text style={styles.emptyParticipantsText}>Aucun participant ajouté</Text>
              <Text style={styles.emptyParticipantsSubtext}>Invitez des amis à rejoindre votre voyage</Text>
            </View>
          )}
        </View>
      </View>

      {/* Bloc note de voyages supprimé sur demande */}

        {/* Checklist Section */}
        <View style={styles.checklistSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.section}>Checklist</Text>
            <Pressable style={styles.manageButton} onPress={() => router.push(`/trip/${id}/checklist`)}>
              <Text style={styles.manageButtonText}>Gérer</Text>
            </Pressable>
          </View>
          {checklistItems.length > 0 && (
            <>
              <Text style={styles.checklistHint}>Appuyez sur un élément pour le valider</Text>
              
              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressText}>
                    {checklistItems.filter(item => item.is_checked).length} / {checklistItems.length} terminés
                  </Text>
                  <Text style={styles.progressPercentage}>
                    {Math.round((checklistItems.filter(item => item.is_checked).length / checklistItems.length) * 100)}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: checklistItems.length > 0 
                          ? `${(checklistItems.filter(item => item.is_checked).length / checklistItems.length) * 100}%` 
                          : '0%' 
                      }
                    ]} 
                  />
                </View>
              </View>
            </>
          )}
          
          {checklistItems.length > 0 ? (
            <View style={styles.checklistPreview}>
              {checklistItems.slice(0, 3).map((item) => (
                <Pressable 
                  key={item.id} 
                  style={styles.checklistItem}
                  onPress={() => onToggleChecklistItem(item.id)}
                >
                  <Text style={styles.checklistIcon}>
                    {item.is_checked ? '✅' : '⬜'}
                  </Text>
                  <Text style={[
                    styles.checklistText,
                    item.is_checked ? styles.checklistTextChecked : null
                  ]}>
                    {item.text}
                  </Text>
                </Pressable>
              ))}
              {checklistItems.length > 3 && (
                <Text style={styles.checklistMore}>
                  +{checklistItems.length - 3} autres éléments...
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.emptyChecklist}>
              <Text style={styles.emptyChecklistText}>Aucun élément dans la checklist</Text>
              <Text style={styles.emptyChecklistSubtext}>Commencez à préparer votre voyage</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Trip Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier le voyage</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalContent} 
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formGroup}>
              <Text style={styles.label}>Titre du voyage *</Text>
              <TextInput
                style={styles.input}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Ex: Voyage à Paris"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Destination *</Text>
              <TextInput
                style={styles.input}
                value={editDestination}
                onChangeText={setEditDestination}
                placeholder="Ex: Paris, France"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Décrivez votre voyage..."
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.dateRow}>
              <View style={styles.dateGroup}>
                <Text style={styles.label}>Date de début</Text>
                <Pressable 
                  style={styles.dateInput}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={[styles.dateText, !editStartDate && styles.placeholderText]}>
                    {editStartDate || 'Sélectionner'}
                  </Text>
                  <Text style={styles.calendarIcon}>📅</Text>
                </Pressable>
                {showStartDatePicker && (
                  <DateTimePicker
                    value={startDateValue}
                    mode="date"
                    display="default"
                    onChange={onStartDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </View>
              <View style={styles.dateGroup}>
                <Text style={styles.label}>Date de fin</Text>
                <Pressable 
                  style={styles.dateInput}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={[styles.dateText, !editEndDate && styles.placeholderText]}>
                    {editEndDate || 'Sélectionner'}
                  </Text>
                  <Text style={styles.calendarIcon}>📅</Text>
                </Pressable>
                {showEndDatePicker && (
                  <DateTimePicker
                    value={endDateValue}
                    mode="date"
                    display="default"
                    onChange={onEndDateChange}
                    minimumDate={editStartDate ? new Date(editStartDate) : new Date()}
                  />
                )}
              </View>
            </View>

            <View style={styles.imageLibraryFormGroup}>
              <View style={styles.imageLibraryHeader}>
                <Text style={styles.label}>Bibliothèque d'images</Text>
                <Pressable style={styles.addImageButton} onPress={onAddImage}>
                  <Text style={styles.addImageButtonText}>📷 Ajouter</Text>
                </Pressable>
              </View>
              
              {tripImages.length > 0 ? (
                <View style={styles.imageLibraryGrid}>
                  {tripImages
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((img, index) => (
                    <View key={img.id} style={styles.imageLibraryItem}>
                      <Pressable
                        style={[
                          styles.imageContainer,
                          draggedImageId === img.id && styles.draggedItem
                        ]}
                        onPress={() => onImageClick(img.id)}
                      >
                        <Image source={{ uri: img.image_uri }} style={styles.imageLibraryThumbnail} />
                        <View style={styles.imageOrderIndicator}>
                          <Text style={styles.imageOrderText}>{img.order_index + 1}</Text>
                        </View>
                      </Pressable>
                      <View style={styles.imageLibraryActions}>
                        <Pressable 
                          style={styles.imageLibraryActionButton}
                          onPress={() => onDeleteImage(img.id, img.image_uri)}
                        >
                          <Text style={styles.imageLibraryActionText}>✕</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyImageLibrary}>
                  <Text style={styles.emptyImageLibraryText}>Aucune image</Text>
                  <Text style={styles.emptyImageLibrarySubtext}>Ajoutez des photos pour commencer</Text>
                </View>
              )}
            </View>

            <Pressable style={styles.saveButton} onPress={onSaveEdit}>
              <Text style={styles.saveButtonText}>Sauvegarder</Text>
            </Pressable>

            <Pressable style={styles.deleteButton} onPress={onDeleteTrip}>
              <Text style={styles.deleteButtonText}>🗑️ Supprimer le voyage</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Participants Management Modal */}
      <Modal visible={showParticipantsModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Gérer les participants</Text>
            <TouchableOpacity onPress={() => setShowParticipantsModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalContent} 
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Add Participant Button */}
            <Pressable 
              style={styles.addParticipantButton} 
              onPress={() => setShowAddParticipantModal(true)}
            >
              <Text style={styles.addParticipantButtonText}>+ Ajouter un participant</Text>
            </Pressable>

            {/* Participants List */}
            <View style={styles.participantsModalList}>
              {/* Afficher l'utilisateur actuel en premier */}
              <View style={[styles.participantModalItem, styles.currentUserModalItem]}>
                <View style={styles.participantModalInfo}>
                  <View style={[styles.participantAvatar, styles.currentUserAvatar]}>
                    {currentUser?.profile_photo_uri ? (
                      <Image 
                        source={{ uri: currentUser.profile_photo_uri }} 
                        style={styles.participantProfileImage}
                      />
                    ) : (
                      <Text style={styles.participantInitial}>M</Text>
                    )}
                  </View>
                  <View style={styles.participantDetails}>
                    <Text style={[styles.participantModalName, styles.currentUserModalName]}>Moi</Text>
                  </View>
                </View>
                {/* Pas de bouton de suppression pour l'utilisateur actuel */}
              </View>
              
              {/* Afficher les autres participants */}
              {tripParticipants.map((participant) => (
                <View key={participant.id} style={styles.participantModalItem}>
                  <View style={styles.participantModalInfo}>
                    <View style={styles.participantAvatar}>
                      <Text style={styles.participantInitial}>{participant.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.participantDetails}>
                      <Text style={styles.participantModalName}>{participant.name}</Text>
                      {participant.email && (
                        <Text style={styles.participantModalEmail}>{participant.email}</Text>
                      )}
                      {participant.phone && (
                        <Text style={styles.participantModalPhone}>{participant.phone}</Text>
                      )}
                    </View>
                  </View>
                  <Pressable 
                    style={styles.deleteParticipantButton}
                    onPress={() => onDeleteParticipant(participant.id, participant.name)}
                  >
                    <Text style={styles.deleteParticipantButtonText}>🗑️</Text>
                  </Pressable>
                </View>
              ))}
              
              {/* Message si aucun participant ajouté */}
              {tripParticipants.length === 0 && (
                <View style={styles.emptyParticipantsModal}>
                  <Text style={styles.emptyParticipantsModalText}>Aucun participant ajouté</Text>
                  <Text style={styles.emptyParticipantsModalSubtext}>Ajoutez des amis à votre voyage</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add Participant Modal */}
      <Modal visible={showAddParticipantModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ajouter un participant</Text>
            <TouchableOpacity onPress={() => setShowAddParticipantModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalContent} 
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nom *</Text>
              <TextInput
                style={styles.input}
                value={newParticipantName}
                onChangeText={setNewParticipantName}
                placeholder="Ex: Jean Dupont"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={newParticipantEmail}
                onChangeText={setNewParticipantEmail}
                placeholder="Ex: jean@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput
                style={styles.input}
                value={newParticipantPhone}
                onChangeText={setNewParticipantPhone}
                placeholder="Ex: +33 6 12 34 56 78"
                keyboardType="phone-pad"
              />
            </View>

            <Pressable style={styles.saveButton} onPress={onAddParticipant}>
              <Text style={styles.saveButtonText}>Ajouter le participant</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Image Fullscreen Modal */}
      <Modal visible={showImageModal} animationType="fade" presentationStyle="fullScreen">
        <View style={styles.imageModalContainer}>
          <Pressable 
            style={styles.imageModalClose}
            onPress={() => setShowImageModal(false)}
          >
            <Text style={styles.imageModalCloseText}>✕</Text>
          </Pressable>
          
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            style={styles.imageModalScrollView}
            contentOffset={{ x: selectedImageIndex * Dimensions.get('window').width, y: 0 }}
            onScrollEndDrag={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
              setSelectedImageIndex(index);
            }}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
              setSelectedImageIndex(index);
            }}
          >
            {images.map((image, index) => (
              <View key={(image as any)?.uri ? `fs-${String((image as any).uri)}` : `fs-${index}`} style={styles.imageModalItem}>
                <Image 
                  source={image} 
                  style={styles.imageModalImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>
          
          {/* Image counter */}
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {selectedImageIndex + 1} / {images.length}
            </Text>
          </View>
          
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Petit composant pour afficher un nom de lieu à partir de lat/lng, avec cache via resolver
function PlaceName({ lat, lng, resolver }: { lat: number; lng: number; resolver: (lat?: number, lng?: number) => Promise<string | null> }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    resolver(lat, lng).then((res) => {
      if (mounted) setLabel(res);
    });
    return () => {
      mounted = false;
    };
  }, [lat, lng, resolver]);
  if (!label) return null;
  return <Text style={styles.heroLabelText}>{label}</Text>;
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff' 
  },
  heroWrap: { 
    paddingHorizontal: 12,
    paddingVertical: 12 
  },
  heroContainer: {
    height: 400,
    position: 'relative',
  },
  imageContainer: {
    position: 'relative',
  },
  imageScrollView: {
    height: 400,
  },
  hero: { 
    width: Dimensions.get('window').width - 24, // Largeur de l'écran moins le padding
    height: 400, 
    borderRadius: 24, // BorderRadius pour les coins arrondis
    overflow: 'hidden', // Pour appliquer le borderRadius sans couper les images
    justifyContent: 'flex-end' 
  },
  heroImg: { 
    width: '100%',
    height: '100%',
    borderRadius: 0 // Pas de borderRadius sur l'image, c'est le container qui gère ça
  },
  heroLabel: {
    position: 'absolute',
    bottom: 40,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  heroLabelText: {
    color: 'white',
    fontWeight: '800',
  },
  backBtn: { 
    position: 'absolute', 
    top: 55, 
    left: 20, 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: 'rgba(255,255,255,0.95)', 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    zIndex: 10,
  },
  backIcon: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: '#2FB6A1' 
  },
  editBtn: { 
    position: 'absolute', 
    top: 55, 
    right: 20, 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: 'rgba(255,255,255,0.95)', 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    zIndex: 10,
  },
  editIcon: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: '#2FB6A1' 
  },
  carouselDots: { 
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    flexDirection: 'row', 
    gap: 8, 
    justifyContent: 'center',
  },
  dot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  dotActive: { 
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
    transform: [{ scale: 1.2 }],
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  locationIconContainer: {
    marginRight: 8,
  },
  pinIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  place: { 
    color: '#259B8A', // colors.keppelDark 
    fontWeight: '800', 
    fontSize: 16,
    flex: 1,
  },
  title: { 
    fontSize: 32, 
    fontWeight: '900', 
    color: '#0f172a', 
    marginBottom: 12,
    lineHeight: 36,
    flex: 1,
    marginRight: 12,
  },
  desc: { 
    color: '#64748b', 
    marginBottom: 16, 
    lineHeight: 22,
    fontSize: 16,
  },
  dates: { 
    color: '#64748b', 
    fontWeight: '700',
    fontSize: 16,
  },
  stepsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepsList: {
    gap: 12,
  },
  stepItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    alignItems: 'center',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
    marginRight: 12,
  },
  deleteStepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteStepIcon: {
    fontSize: 16,
  },
  stepName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  stepCoordsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  stepCoords: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginLeft: 6,
  },
  emptySteps: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  emptyStepsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  emptyStepsSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  notesSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  // Styles des notes supprimés car la section est retirée
  section: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#0f172a',
  },
  notesActions: {
    marginBottom: 16,
  },
  checklistSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  checklistHint: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  progressContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  checklistPreview: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  checklistIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  checklistText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  checklistTextChecked: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  checklistMore: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyChecklist: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  emptyChecklistText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  emptyChecklistSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  noteCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ffffff', 
    borderRadius: 18, 
    padding: 16, 
    marginBottom: 12, 
    shadowColor: '#000', 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    shadowOffset: { width: 0, height: 4 }, 
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  noteThumb: { 
    width: 60, 
    height: 60, 
    borderRadius: 14, 
    marginRight: 16 
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: { 
    fontWeight: '800', 
    marginBottom: 6,
    fontSize: 16,
    color: '#0f172a',
  },
  noteMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteMeta: { 
    color: '#94a3b8', 
    fontSize: 13,
    fontWeight: '600',
  },
  chev: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#f8fafc', 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chevTxt: { 
    fontSize: 22, 
    color: '#64748b',
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: 'white',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalClose: {
    fontSize: 24,
    color: '#64748b',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  formGroup: {
    marginBottom: 20,
  },
  imageLibraryFormGroup: {
    marginBottom: 20,
    marginTop: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateGroup: {
    flex: 1,
  },
  imagePicker: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 32,
    marginBottom: 8,
  },
  imagePlaceholderLabel: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#ef4444',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    width: '100%',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  // Date picker styles
  dateInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 16,
    color: '#374151',
  },
  placeholderText: {
    color: '#94a3b8',
  },
  calendarIcon: {
    fontSize: 16,
  },
  // Image library styles
  imageLibraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addImageButton: {
    backgroundColor: '#2FB6A1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addImageButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  imageLibraryScroll: {
    marginTop: 8,
  },
  imageLibraryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  imageLibraryItem: {
    width: '48%',
    marginBottom: 12,
    position: 'relative',
  },
  draggedItem: {
    opacity: 0.5,
    transform: [{ scale: 1.05 }],
  },
  imageLibraryThumbnail: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  imageLibraryActions: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    gap: 4,
  },
  imageLibraryActionButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageLibraryActionText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
  },
  imageOrderIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#2FB6A1', // colors.keppel
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  imageOrderText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '700',
  },
  emptyImageLibrary: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyImageLibraryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  emptyImageLibrarySubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
  // Image fullscreen modal styles
  imageModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  imageModalCloseText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '900',
  },
  imageModalScrollView: {
    flex: 1,
  },
  imageModalItem: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageModalImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    resizeMode: 'contain',
  },
  imageCounter: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  imageCounterText: {
    fontSize: 16,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontWeight: '600',
  },
  participantsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F1DD', // colors.eggshell
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  participantsIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  participantsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A', // colors.textPrimary
  },
  stepDate: {
    fontSize: 12,
    color: '#4A4A4A', // colors.textSecondary
    marginTop: 4,
    fontStyle: 'italic',
  },
  stepActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepClickHint: {
    fontSize: 16,
    opacity: 0.6,
  },
  redefineButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  redefineButtonText: {
    fontSize: 16,
  },
  // Unified manage button style
  manageButton: {
    backgroundColor: '#FFFFFF', // colors.white
    borderWidth: 1,
    borderColor: '#E2E8F0', // colors.borderLight
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: 'rgba(0, 0, 0, 0.1)', // colors.shadowLight
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  manageButtonText: {
    color: '#1A1A1A', // colors.textPrimary
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  mapButtonLarge: {
    backgroundColor: '#2FB6A1', // colors.keppel
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 16,
    shadowColor: '#2FB6A1', // colors.keppel
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  mapButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  mapButtonIcon: {
    fontSize: 32,
  },
  mapButtonTextContainer: {
    flex: 1,
  },
  mapButtonTitle: {
    color: '#FFFFFF', // colors.white
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  mapButtonSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  mapButtonArrow: {
    color: '#FFFFFF', // colors.white
    fontSize: 24,
    fontWeight: '900',
  },
  // Steps Summary styles
  stepsSummarySection: {
    paddingHorizontal: 0,
    marginTop: 10,
    marginBottom: 10,
  },
  stepsSummaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 16,
  },
  stepsSummaryCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  stepsSummaryNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2FB6A1',
    marginBottom: 4,
  },
  stepsSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    width: '100%',
  },
  stepsProgressBarContainer: {
    marginTop: 8,
  },
  stepsProgressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  stepsProgressBarFill: {
    height: '100%',
    backgroundColor: '#2FB6A1',
    borderRadius: 4,
  },
  stepsProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  // Trip Status styles
  tripStatusSection: {
    paddingHorizontal: 0,
    marginTop: 16,
    marginBottom: 16,
  },
  tripStatusContainer: {
    paddingHorizontal: 0,
    marginTop: 16,
    marginBottom: 16,
  },
  tripStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  tripStatusIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  tripStatusTextContainer: {
    flex: 1,
  },
  tripStatusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tripStatusSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  // Participants styles
  participantsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 24,
  },
  participantsList: {
    marginTop: 12,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // colors.white
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: 'rgba(0, 0, 0, 0.1)', // colors.shadowLight
    shadowOpacity: 1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2FB6A1', // colors.keppel
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  participantInitial: {
    color: '#FFFFFF', // colors.white
    fontSize: 16,
    fontWeight: '700',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A', // colors.textPrimary
    marginBottom: 2,
  },
  participantEmail: {
    fontSize: 12,
    color: '#4A4A4A', // colors.textSecondary
  },
  moreParticipants: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  moreParticipantsText: {
    fontSize: 14,
    color: '#4A4A4A', // colors.textSecondary
    fontWeight: '600',
  },
  emptyParticipants: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyParticipantsText: {
    fontSize: 16,
    color: '#4A4A4A', // colors.textSecondary
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyParticipantsSubtext: {
    fontSize: 14,
    color: '#8A8A8A', // colors.textTertiary
  },
  // Participants modal styles
  addParticipantButton: {
    backgroundColor: '#2FB6A1', // colors.keppel
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  addParticipantButtonText: {
    color: '#FFFFFF', // colors.white
    fontSize: 16,
    fontWeight: '700',
  },
  participantsModalList: {
    marginTop: 12,
  },
  participantModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // colors.white
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: 'rgba(0, 0, 0, 0.1)', // colors.shadowLight
    shadowOpacity: 1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  participantModalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantDetails: {
    flex: 1,
  },
  participantModalName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A', // colors.textPrimary
    marginBottom: 4,
  },
  participantModalEmail: {
    fontSize: 14,
    color: '#4A4A4A', // colors.textSecondary
    marginBottom: 2,
  },
  participantModalPhone: {
    fontSize: 14,
    color: '#4A4A4A', // colors.textSecondary
  },
  deleteParticipantButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteParticipantButtonText: {
    fontSize: 16,
  },
  emptyParticipantsModal: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyParticipantsModalText: {
    fontSize: 18,
    color: '#4A4A4A', // colors.textSecondary
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyParticipantsModalSubtext: {
    fontSize: 14,
    color: '#8A8A8A', // colors.textTertiary
  },
  // Styles pour l'utilisateur actuel
  currentUserItem: {
    backgroundColor: '#F8F1DD', // colors.eggshell
    borderWidth: 2,
    borderColor: '#2FB6A1', // colors.keppel
  },
  currentUserAvatar: {
    backgroundColor: '#2FB6A1', // colors.keppel
  },
  currentUserName: {
    color: '#2FB6A1', // colors.keppel
    fontWeight: '800',
  },
  currentUserModalItem: {
    backgroundColor: '#F8F1DD', // colors.eggshell
    borderWidth: 2,
    borderColor: '#2FB6A1', // colors.keppel
  },
  currentUserModalName: {
    color: '#2FB6A1', // colors.keppel
    fontWeight: '800',
  },
  participantProfileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  // Styles pour les favoris
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  favoriteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  favoriteIcon: {
    fontSize: 20,
  },
});
