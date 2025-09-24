import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, Image, ImageBackground, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DestinationMapSelector from '../../components/DestinationMapSelector';
import LocationIcon from '../../components/ui/location-icon';
import { useTheme } from '../../contexts/ThemeContext';
import { getCurrentUser } from '../../lib/session';
import { createStep, listSteps } from '../../lib/steps';
import { addTripImage, getTripImages } from '../../lib/trip-images';
import { getTripParticipants } from '../../lib/trip-participants';
import { createTrip, deleteTrip, listTrips, Trip, updateTripCover } from '../../lib/trips';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 colonnes avec marges

export default function ExploreScreen() {
  const { themeColors } = useTheme();
  const [userId, setUserId] = useState<number | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [upcomingTrips, setUpcomingTrips] = useState<Trip[]>([]);
  const [completedTrips, setCompletedTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tripSteps, setTripSteps] = useState<Record<number, any[]>>({});
  const [tripImages, setTripImages] = useState<Record<number, any[]>>({});
  const [tripParticipants, setTripParticipants] = useState<Record<number, any[]>>({});
  
  // Form states
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null); // URI de l'image sélectionnée
  const [selectedImages, setSelectedImages] = useState<string[]>([]); // Images sélectionnées pour la bibliothèque
  const [draggedImageId, setDraggedImageId] = useState<number | null>(null); // Pour le drag & drop
  
  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDateValue, setStartDateValue] = useState(new Date());
  const [endDateValue, setEndDateValue] = useState(new Date());
  const [showDestinationMap, setShowDestinationMap] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<{latitude: number, longitude: number, name: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed'>('active');

  const loadTrips = useCallback(async () => {
    if (!userId) return;
    
    try {
      const data = await listTrips(userId);
      setTrips(data);
      
      // Séparer les voyages par statut
      const now = Date.now();
      const active = data.filter(trip => !trip.completed && trip.adventure_started);
      const upcoming = data.filter(trip => !trip.completed && !trip.adventure_started);
      const completed = data.filter(trip => trip.completed === 1);
      
      console.log('Voyages chargés:', {
        total: data.length,
        actifs: active.length,
        à_venir: upcoming.length,
        terminés: completed.length,
        détails: data.map(t => ({ 
          id: t.id, 
          title: t.title, 
          completed: t.completed, 
          completed_type: typeof t.completed,
          completed_truthy: !!t.completed,
          adventure_started: t.adventure_started 
        }))
      });
      
      setActiveTrips(active);
      setUpcomingTrips(upcoming);
      setCompletedTrips(completed);
      
      // Load steps, images and participants for each trip
      const stepsData: Record<number, any[]> = {};
      const imagesData: Record<number, any[]> = {};
      const participantsData: Record<number, any[]> = {};
      for (const trip of data) {
        const steps = await listSteps(trip.id);
        stepsData[trip.id] = steps;
        
        const images = await getTripImages(trip.id);
        imagesData[trip.id] = images;
        
        const participants = await getTripParticipants(trip.id);
        participantsData[trip.id] = participants;
      }
      setTripSteps(stepsData);
      setTripImages(imagesData);
      setTripParticipants(participantsData);
    } catch (error) {
      console.error('Erreur lors du chargement des voyages:', error);
    }
  }, [userId]);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (user) {
        setUserId(user.id);
      }
    })();
  }, []);

  // Recharger les données à chaque fois que l'utilisateur revient sur cette page
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        loadTrips();
      }
    }, [userId, loadTrips])
  );

  // Recharger les données au montage du composant
  useEffect(() => {
    if (userId) {
      loadTrips();
    }
  }, [userId, loadTrips]);

  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0]; // Format YYYY-MM-DD
  }

  function onStartDateChange(event: any, selectedDate?: Date) {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDateValue(selectedDate);
      setStartDate(formatDate(selectedDate));
    }
  }

  function onEndDateChange(event: any, selectedDate?: Date) {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDateValue(selectedDate);
      setEndDate(formatDate(selectedDate));
    }
  }

  async function pickImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false, // Désactivé car incompatible avec allowsMultipleSelection
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newImages = result.assets.map(asset => asset.uri);
        setSelectedImages(prev => [...prev, ...newImages]);
        
        // Si c'est la première image, la définir comme couverture
        if (!coverImage) {
          setCoverImage(newImages[0]);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la sélection d\'image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  }

  // Fonction pour cliquer sur une image et changer son ordre
  const onImageClick = (index: number) => {
    if (!draggedImageId) {
      // Première image cliquée - la sélectionner
      setDraggedImageId(index);
    } else if (draggedImageId === index) {
      // Même image cliquée - désélectionner
      setDraggedImageId(null);
    } else {
      // Deuxième image cliquée - échanger avec la première
      const newImages = [...selectedImages];
      [newImages[draggedImageId], newImages[index]] = [newImages[index], newImages[draggedImageId]];
      setSelectedImages(newImages);
      
      // Mettre à jour la couverture si nécessaire
      if (coverImage === selectedImages[draggedImageId]) {
        setCoverImage(selectedImages[index]);
      } else if (coverImage === selectedImages[index]) {
        setCoverImage(selectedImages[draggedImageId]);
      }
      
      setDraggedImageId(null);
    }
  };

  async function onCreate() {
    if (!userId || !title.trim() || !destination.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir au moins le titre et la destination');
      return;
    }
    
    if (selectedImages.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins une image pour votre voyage');
      return;
    }
    
    if (!selectedDestination) {
      Alert.alert('Erreur', 'Veuillez sélectionner une destination sur la carte');
      return;
    }
    
    try {
      setLoading(true);
      const startDateMs = startDate ? new Date(startDate).getTime() : null;
      const endDateMs = endDate ? new Date(endDate).getTime() : null;
      
      // Créer le voyage avec la première image comme couverture
      const tripId = await createTrip(userId, title.trim(), destination.trim(), description.trim(), startDateMs, endDateMs, selectedImages[0]);
      
      // Ajouter toutes les images dans la bibliothèque
      for (const imageUri of selectedImages) {
        await addTripImage(tripId, imageUri);
      }
      
      // Créer l'étape de destination
      await createStep({
        trip_id: tripId,
        name: destination.trim(),
        latitude: selectedDestination.latitude,
        longitude: selectedDestination.longitude,
        start_date: null,
        end_date: null,
        description: `Destination finale: ${destination.trim()}`,
        order_index: 0
      });
      
      // Reset form
      setTitle('');
      setDestination('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setCoverImage(null);
      setSelectedImages([]);
      setSelectedDestination(null);
      setShowCreateModal(false);
      
      // Recharger toutes les données
      await loadTrips();
    } catch (e: any) {
      Alert.alert('Erreur', e.message ?? 'Création impossible');
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: number) {
    if (!userId) return;
    await deleteTrip(id);
    await loadTrips(); // Utiliser loadTrips pour mettre à jour toutes les listes
  }

  async function onChangeCover(tripId: number, newCover: string) {
    try {
      await updateTripCover(tripId, newCover);
      
      // Update local state
      const updatedTrips = trips.map(trip => 
        trip.id === tripId ? { ...trip, cover_uri: newCover } : trip
      );
      setTrips(updatedTrips);
      
      Alert.alert('Succès', 'Image de couverture mise à jour');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de changer l\'image');
    }
  }

  const renderTripCard = ({ item, index, isGridMode = false }: { item: Trip; index: number; isGridMode?: boolean }) => {
    const images = tripImages[item.id] || [];
    const participants = tripParticipants[item.id] || [];
    
    // Utiliser les images de la base de données ou l'image de couverture ou splash-screen.png comme fallback
    const getImageSource = () => {
      // Priorité 1: Images de la base de données
      if (images.length > 0) {
        return { uri: images[0].image_uri };
      }
      // Priorité 2: Image de couverture du voyage
      if (item.cover_uri && item.cover_uri.startsWith('file://')) {
        return { uri: item.cover_uri };
      }
      // Fallback: splash-screen.png
      return require('../../assets/images/splash-screen.png');
    };

    return (
      <Pressable 
        style={isGridMode && index > 0 ? dynamicStyles.gridCard : dynamicStyles.card} 
        onPress={() => router.push(`/trip/${item.id}/details`)}
      >
        <ImageBackground 
          source={getImageSource()} 
          style={isGridMode && index > 0 ? styles.gridCover : styles.cover} 
          imageStyle={isGridMode && index > 0 ? styles.gridCoverImage : styles.coverImage}
        >
          <View style={styles.gradientOverlay} />
          
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={isGridMode && index > 0 ? dynamicStyles.gridTripTitle : dynamicStyles.tripTitle}>{item.title}</Text>
              <View style={styles.participantsBadge}>
                <Text style={styles.participantsIcon}>👥</Text>
                <Text style={styles.participantsCount}>x{participants.length + 1}</Text>
              </View>
            </View>
            
            {/* Location */}
            <View style={styles.locationRow}>
              <View style={styles.locationIconContainer}>
                <LocationIcon size={14} color={themeColors.primary} />
              </View>
              <Text style={styles.locationText}>{item.destination || 'Destination'}</Text>
            </View>
            
            {/* Dates */}
            <Text style={styles.tripDates}>
              {item.start_date && item.end_date 
                ? `du ${new Date(item.start_date).toLocaleDateString()} au ${new Date(item.end_date).toLocaleDateString()}`
                : item.start_date 
                  ? `à partir du ${new Date(item.start_date).toLocaleDateString()}`
                  : 'Dates à définir'
              }
            </Text>
          </View>
        </ImageBackground>
      </Pressable>
    );
  };

  const renderTripGrid = (trips: Trip[]) => {
    if (trips.length === 0) return null;
    
    if (trips.length === 1) {
      // Un seul voyage : affichage normal
      return (
        <FlatList
          data={trips}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => renderTripCard({ item, index, isGridMode: false })}
          scrollEnabled={false}
          contentContainerStyle={styles.listContainer}
        />
      );
    }
    
    // Plusieurs voyages : premier en pleine largeur, puis grille 2x2
    const firstTrip = trips[0];
    const remainingTrips = trips.slice(1);
    
    return (
      <View>
        {/* Premier voyage en pleine largeur */}
        <View style={styles.firstTripContainer}>
          {renderTripCard({ item: firstTrip, index: 0, isGridMode: false })}
        </View>
        
        {/* Voyages restants en grille */}
        {remainingTrips.length > 0 && (
          <View style={styles.gridContainer}>
            {remainingTrips.map((trip, index) => (
              <View key={trip.id} style={styles.gridItem}>
                {renderTripCard({ item: trip, index: index + 1, isGridMode: true })}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderTabs = () => {
    const tabs = [
      { key: 'active', label: '🚀 En cours' },
      { key: 'upcoming', label: '📅 À venir' },
      { key: 'completed', label: '🏁 Terminés' },
    ];

    return (
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  };

  const renderActiveContent = () => {
    if (activeTrips.length > 0) {
      return renderTripGrid(activeTrips);
    } else {
      return (
        <View style={styles.emptySection}>
          <Text style={styles.emptyIcon}>🚀</Text>
          <Text style={styles.emptyTitle}>Aucun voyage en cours</Text>
          <Text style={styles.emptyText}>Démarrez une aventure !</Text>
        </View>
      );
    }
  };

  const renderUpcomingContent = () => {
    if (upcomingTrips.length > 0) {
      return renderTripGrid(upcomingTrips);
    } else {
      return (
        <View style={styles.emptySection}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>Aucun voyage à venir</Text>
          <Text style={styles.emptyText}>Planifiez votre prochaine aventure</Text>
        </View>
      );
    }
  };

  const renderCompletedContent = () => {
    if (completedTrips.length > 0) {
      return renderTripGrid(completedTrips);
    } else {
      return (
        <View style={styles.emptySection}>
          <Text style={styles.emptyIcon}>🏁</Text>
          <Text style={styles.emptyTitle}>Aucun voyage terminé</Text>
          <Text style={styles.emptyText}>Terminez vos aventures pour les voir ici</Text>
        </View>
      );
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: { 
      flex: 1, 
      padding: 16, 
      backgroundColor: themeColors.backgroundSecondary
    },
    header: { 
      fontSize: 24, 
      fontWeight: '900', 
      color: themeColors.textPrimary
    },
    fab: { 
      width: 40, 
      height: 40, 
      borderRadius: 20, 
      backgroundColor: themeColors.primary, 
      alignItems: 'center', 
      justifyContent: 'center',
      shadowColor: themeColors.primary,
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    fabText: { 
      color: themeColors.backgroundPrimary, 
      fontWeight: 'bold', 
      fontSize: 24,
      lineHeight: 26,
    },
    card: { 
      backgroundColor: 'transparent', 
      borderRadius: 20, 
      overflow: 'hidden',
      marginBottom: 20,
      shadowColor: themeColors.primary,
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    tripTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#FFFFFF', // Toujours blanc sur fond sombre
      flex: 1,
      marginRight: 12,
    },
    gridCard: {
      backgroundColor: 'transparent', 
      borderRadius: 20, 
      overflow: 'hidden',
      marginBottom: 12,
      width: cardWidth,
      shadowColor: themeColors.primary,
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    gridTripTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
      flex: 1,
      marginRight: 8,
    },
    // ... autres styles dynamiques
  });

  return (
    <SafeAreaView style={[dynamicStyles.container, { width: '100%' }]}>
      <View style={styles.headerRow}>
        <Text style={dynamicStyles.header}>Vos voyages</Text>
        <Pressable style={dynamicStyles.fab} onPress={() => setShowCreateModal(true)}>
          <Text style={dynamicStyles.fabText}>+</Text>
        </Pressable>
      </View>

      {/* Onglets */}
      {renderTabs()}

      {/* Contenu selon l'onglet actif */}
      <ScrollView style={[styles.scrollContainer, { width: '100%' }]} showsVerticalScrollIndicator={false}>
        <View style={styles.tabContent}>
          {activeTab === 'active' && renderActiveContent()}
          {activeTab === 'upcoming' && renderUpcomingContent()}
          {activeTab === 'completed' && renderCompletedContent()}
        </View>
      </ScrollView>

      {/* Create Trip Modal */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouveau voyage</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Titre du voyage *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Voyage en Italie"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Destination *</Text>
              <Pressable 
                style={styles.destinationInput}
                onPress={() => setShowDestinationMap(true)}
              >
                <Text style={[styles.destinationText, !destination && styles.placeholderText]}>
                  {destination || 'Sélectionner une destination sur la carte'}
                </Text>
                <Text style={styles.mapIcon}>🗺️</Text>
              </Pressable>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Décrivez votre voyage..."
                value={description}
                onChangeText={setDescription}
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
                  <Text style={[styles.dateText, !startDate && styles.placeholderText]}>
                    {startDate || 'Sélectionner'}
                  </Text>
                  <Text style={styles.calendarIcon}>📅</Text>
                </Pressable>
                {showStartDatePicker && (
                  <DateTimePicker
                    value={startDateValue}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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
                  <Text style={[styles.dateText, !endDate && styles.placeholderText]}>
                    {endDate || 'Sélectionner'}
                  </Text>
                  <Text style={styles.calendarIcon}>📅</Text>
                </Pressable>
                {showEndDatePicker && (
                  <DateTimePicker
                    value={endDateValue}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onEndDateChange}
                    minimumDate={startDate ? new Date(startDate) : new Date()}
                  />
                )}
              </View>
            </View>

            {/* Bibliothèque d'images - identique à celle de modification */}
            <View style={styles.imageLibraryFormGroup}>
              <View style={styles.imageLibraryHeader}>
                <Text style={styles.label}>Bibliothèque d'images *</Text>
                <Pressable style={styles.addImageButton} onPress={pickImage}>
                  <Text style={styles.addImageButtonText}>📷 Ajouter</Text>
                </Pressable>
              </View>
              
              {selectedImages.length > 0 ? (
                <View style={styles.imageLibraryGrid}>
                  {selectedImages.map((imageUri, index) => (
                    <View key={index} style={styles.imageLibraryItem}>
                      <Pressable
                        style={[
                          styles.imageContainer,
                          draggedImageId === index && styles.draggedItem
                        ]}
                        onPress={() => onImageClick(index)}
                      >
                        <Image source={{ uri: imageUri }} style={styles.imageLibraryThumbnail} />
                        <View style={styles.imageOrderIndicator}>
                          <Text style={styles.imageOrderText}>{index + 1}</Text>
                        </View>
                      </Pressable>
                      <View style={styles.imageLibraryActions}>
                        <Pressable 
                          style={styles.imageLibraryActionButton}
                          onPress={() => {
                            const newImages = selectedImages.filter((_, i) => i !== index);
                            setSelectedImages(newImages);
                            if (coverImage === imageUri && newImages.length > 0) {
                              setCoverImage(newImages[0]);
                            } else if (newImages.length === 0) {
                              setCoverImage(null);
                            }
                          }}
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

            <Pressable 
              style={[styles.createButton, loading && styles.createButtonDisabled]} 
              onPress={onCreate}
              disabled={loading}
            >
              <Text style={styles.createButtonText}>
                {loading ? 'Création...' : 'Créer le voyage'}
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Destination Selection Modal */}
      <Modal visible={showDestinationMap} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner la destination</Text>
            <TouchableOpacity onPress={() => setShowDestinationMap(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <DestinationMapSelector
            onDestinationSelected={(dest) => {
              setSelectedDestination(dest);
              setDestination(dest.name);
              setShowDestinationMap(false);
            }}
            onCancel={() => setShowDestinationMap(false)}
          />
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 20 
  },
  inputRow: {
    marginBottom: 20,
  },
  listContainer: {
    paddingBottom: 10,
    width: '100%',
  },
  scrollContainer: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 40,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    marginBottom: 4,
  },
  lastSection: {
    paddingBottom: 100, // Espace en bas pour éviter le cropping
  },
  cover: { 
    height: 180, 
    justifyContent: 'flex-end',
  },
  gridCover: {
    height: 220,
    justifyContent: 'flex-end',
  },
  coverImage: { 
    borderRadius: 20,
    resizeMode: 'cover' 
  },
  gridCoverImage: {
    borderRadius: 16,
    resizeMode: 'cover'
  },
  firstTripContainer: {
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: cardWidth,
    marginBottom: 0,
  },
  // Styles pour les onglets
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    width: '100%',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  activeTab: {
    backgroundColor: '#2FB6A1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 6,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  tabContent: {
    padding: 20,
    paddingHorizontal: 0,
    width: '100%',
    marginBottom: 50,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  cardContent: {
    padding: 20,
    position: 'relative',
    zIndex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  participantsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
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
    color: '#FFFFFF',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIconContainer: {
    marginRight: 6,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#259B8A', // colors.keppelDark
  },
  countryText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
  },
  changeCover: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  changeCoverText: {
    fontSize: 12,
    fontWeight: '700',
  },
  delete: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  deleteText: { 
    color: 'white', 
    fontWeight: '700',
    fontSize: 12,
  },
  stepsContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  stepsTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepsScroll: {
    maxHeight: 40,
  },
  stepBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
    marginRight: 4,
  },
  stepName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  moreSteps: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 30,
  },
  moreStepsText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'white',
  },
  cardFooter: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  tripDates: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
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
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  modalClose: {
    fontSize: 24,
    color: '#64748b',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
    paddingBottom: 120,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dateGroup: {
    flex: 1,
  },
  dateInput: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 16,
    color: '#1e293b',
  },
  calendarIcon: {
    fontSize: 16,
  },
  imagePickerButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  selectedImageContainer: {
    height: 120,
  },
  selectedImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedImageStyle: {
    borderRadius: 10,
  },
  imageOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changeImageText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  imagePlaceholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#2FB6A1', // colors.keppel
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
    shadowColor: '#2FB6A1', // colors.keppel
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  createButtonDisabled: {
    backgroundColor: '#8A8A8A', // colors.textTertiary
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  // Styles identiques à ceux de la page de modification
  imageLibraryFormGroup: {
    marginBottom: 20,
    marginTop: 30,
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
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageLibraryThumbnail: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  imageOrderIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#2FB6A1',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOrderText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyImageLibrary: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyImageLibraryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A', // colors.textSecondary
    marginBottom: 4,
  },
  emptyImageLibrarySubtext: {
    fontSize: 14,
    color: '#8A8A8A', // colors.textTertiary
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
  imageLibraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  draggedItem: {
    opacity: 0.5,
    transform: [{ scale: 1.05 }],
  },
  destinationInput: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  destinationText: {
    fontSize: 16,
    color: '#1e293b',
    flex: 1,
  },
  mapIcon: {
    fontSize: 20,
    marginLeft: 8,
  },
});