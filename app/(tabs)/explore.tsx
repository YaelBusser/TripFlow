import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser } from '../../lib/session';
import { listSteps } from '../../lib/steps';
import { createTrip, deleteTrip, listTrips, Trip, updateTripCover } from '../../lib/trips';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 colonnes avec marges

export default function ExploreScreen() {
  const [userId, setUserId] = useState<number | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tripSteps, setTripSteps] = useState<Record<number, any[]>>({});
  
  // Form states
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverImage, setCoverImage] = useState('react-logo.png'); // Default image

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (user) {
        setUserId(user.id);
        const data = await listTrips(user.id);
        setTrips(data);
        
        // Load steps for each trip
        const stepsData: Record<number, any[]> = {};
        for (const trip of data) {
          const steps = await listSteps(trip.id);
          stepsData[trip.id] = steps;
        }
        setTripSteps(stepsData);
      }
    })();
  }, []);

  async function onCreate() {
    if (!userId || !title.trim() || !destination.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir au moins le titre et la destination');
      return;
    }
    
    try {
      setLoading(true);
      const startDateMs = startDate ? new Date(startDate).getTime() : null;
      const endDateMs = endDate ? new Date(endDate).getTime() : null;
      
      await createTrip(userId, title.trim(), destination.trim(), description.trim(), startDateMs, endDateMs, coverImage);
      
      // Reset form
      setTitle('');
      setDestination('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setCoverImage('react-logo.png');
      setShowCreateModal(false);
      
      const data = await listTrips(userId);
      setTrips(data);
    } catch (e: any) {
      Alert.alert('Erreur', e.message ?? 'Création impossible');
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: number) {
    if (!userId) return;
    await deleteTrip(id);
    const data = await listTrips(userId);
    setTrips(data);
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
      setShowChangeCoverModal(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de changer l\'image');
    }
  }

  const renderTripCard = ({ item, index }: { item: Trip; index: number }) => {
    const steps = tripSteps[item.id] || [];
    const getImageSource = (imageName: string) => {
      switch (imageName) {
        case 'partial-react-logo.png':
          return require('../../assets/images/partial-react-logo.png');
        case 'splash-icon.png':
          return require('../../assets/images/splash-icon.png');
        default:
          return require('../../assets/images/react-logo.png');
      }
    };

    return (
      <Pressable 
        style={styles.card} 
        onPress={() => router.push(`/trip/${item.id}/details`)}
      >
        <ImageBackground 
          source={getImageSource(item.cover_uri || 'react-logo.png')} 
          style={styles.cover} 
          imageStyle={styles.coverImage}
        >
          <View style={styles.cardHeader}>
            <View style={styles.locationBadge}>
              <Text style={styles.pinIcon}>📍</Text>
              <View>
                <Text style={styles.locationText}>{item.destination || 'Destination'}</Text>
                <Text style={styles.countryText}>Voyage</Text>
              </View>
            </View>
          </View>
          
          {/* Steps list */}
          {steps.length > 0 && (
            <View style={styles.stepsContainer}>
              <Text style={styles.stepsTitle}>Étapes ({steps.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stepsScroll}>
                {steps.slice(0, 3).map((step, stepIndex) => (
                  <View key={step.id} style={styles.stepBadge}>
                    <Text style={styles.stepNumber}>{stepIndex + 1}</Text>
                    <Text style={styles.stepName} numberOfLines={1}>{step.name}</Text>
                  </View>
                ))}
                {steps.length > 3 && (
                  <View style={styles.moreSteps}>
                    <Text style={styles.moreStepsText}>+{steps.length - 3}</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
          
          <View style={styles.cardFooter}>
            <Text style={styles.tripTitle}>{item.title}</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Vos voyages récents</Text>
        <Pressable style={styles.fab} onPress={() => setShowCreateModal(true)}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTripCard}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyTitle}>Aucun voyage</Text>
            <Text style={styles.emptyText}>Créez votre premier voyage</Text>
          </View>
        }
      />

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
              <TextInput
                style={styles.input}
                placeholder="Ex: Rome, Italie"
                value={destination}
                onChangeText={setDestination}
              />
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
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={startDate}
                  onChangeText={setStartDate}
                />
              </View>
              <View style={styles.dateGroup}>
                <Text style={styles.label}>Date de fin</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={endDate}
                  onChangeText={setEndDate}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Image de couverture</Text>
              <View style={styles.imageOptions}>
                <Pressable 
                  style={[styles.imageOption, coverImage === 'react-logo.png' && styles.imageOptionSelected]}
                  onPress={() => {
                    console.log('Selected react-logo.png');
                    setCoverImage('react-logo.png');
                  }}
                >
                  <Text style={styles.imageOptionEmoji}>🏔️</Text>
                  <Text style={styles.imageOptionText}>Montagne</Text>
                </Pressable>
                <Pressable 
                  style={[styles.imageOption, coverImage === 'partial-react-logo.png' && styles.imageOptionSelected]}
                  onPress={() => {
                    console.log('Selected partial-react-logo.png');
                    setCoverImage('partial-react-logo.png');
                  }}
                >
                  <Text style={styles.imageOptionEmoji}>🏖️</Text>
                  <Text style={styles.imageOptionText}>Plage</Text>
                </Pressable>
                <Pressable 
                  style={[styles.imageOption, coverImage === 'splash-icon.png' && styles.imageOptionSelected]}
                  onPress={() => {
                    console.log('Selected splash-icon.png');
                    setCoverImage('splash-icon.png');
                  }}
                >
                  <Text style={styles.imageOptionEmoji}>🏙️</Text>
                  <Text style={styles.imageOptionText}>Ville</Text>
                </Pressable>
              </View>
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

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: '#f8fafc' 
  },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 20 
  },
  header: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: '#1e293b' 
  },
  fab: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#10b981', 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 24,
    lineHeight: 26,
  },
  inputRow: {
    marginBottom: 20,
  },
  listContainer: {
    paddingBottom: 100,
  },
  card: { 
    backgroundColor: 'white', 
    borderRadius: 16, 
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cover: { 
    height: 200, 
    justifyContent: 'space-between',
    padding: 16,
  },
  coverImage: { 
    borderRadius: 16,
    resizeMode: 'cover' 
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pinIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
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
  tripTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: 'white',
    marginBottom: 4,
  },
  tripDates: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
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
  imageOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  imageOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  imageOptionSelected: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  imageOptionEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  imageOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  createButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
  },
  changeCoverOption: {
    minHeight: 100,
  },
});