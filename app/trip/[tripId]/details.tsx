import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Dimensions, Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChecklistItem, listChecklistItems, toggleChecklistItem } from '../../../lib/checklist';
import { JournalEntry, listJournal } from '../../../lib/journal';
import { deleteStep, listSteps, Step } from '../../../lib/steps';
import { getTrip, Trip } from '../../../lib/trips';

export default function TripDetailsHero() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const id = Number(tripId);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [notes, setNotes] = useState<JournalEntry[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editCoverImage, setEditCoverImage] = useState<string | null>(null);

  const getImageSource = (imageName: string) => {
    switch (imageName) {
      case 'partial-react-logo.png':
        return require('../../../assets/images/partial-react-logo.png');
      case 'splash-icon.png':
        return require('../../../assets/images/splash-icon.png');
      default:
        return require('../../../assets/images/react-logo.png');
    }
  };

  // Images par défaut + image de couverture du voyage
  const getImages = () => {
    const defaultImages = [
      require('../../../assets/images/react-logo.png'),
      require('../../../assets/images/partial-react-logo.png'),
      require('../../../assets/images/splash-icon.png'),
    ];
    
    if (trip?.cover_uri) {
      const coverImage = getImageSource(trip.cover_uri);
      return [coverImage, ...defaultImages];
    }
    
    return defaultImages;
  };

  const images = getImages();

  const loadData = useCallback(async () => {
    if (!id) return;
    const t = await getTrip(id);
    if (t) {
      setTrip(t);
      setCurrentImageIndex(0);
      // Initialiser les champs d'édition
      setEditTitle(t.title);
      setEditDestination(t.destination || '');
      setEditDescription(t.description || '');
      setEditStartDate(t.start_date || '');
      setEditEndDate(t.end_date || '');
      setEditCoverImage(t.cover_uri);
    }
      const s = await listSteps(id);
      setSteps(s);
      if (s[0]) {
        const j = await listJournal(s[0].id);
        setNotes(j);
      }
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setEditCoverImage(result.assets[0].uri);
    }
  };

  const onSaveEdit = async () => {
    if (!trip) return;
    
    try {
      // Ici on devrait appeler une fonction updateTrip
      // Pour l'instant on met à jour localement
      const updatedTrip = {
        ...trip,
        title: editTitle,
        destination: editDestination,
        description: editDescription,
        start_date: editStartDate,
        end_date: editEndDate,
        cover_uri: editCoverImage || trip.cover_uri,
      };
      setTrip(updatedTrip);
      setShowEditModal(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const onDeleteStep = (stepId: number, stepName: string) => {
    Alert.alert(
      'Supprimer l\'étape',
      `Êtes-vous sûr de vouloir supprimer l'étape "${stepName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStep(stepId);
              await loadData();
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
            }
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

  const dateRange = useMemo(() => {
    if (!trip) return '';
    const fmt = (ms?: number | null) => (ms ? new Date(ms).toLocaleDateString() : '');
    const s = fmt(trip.start_date as any);
    const e = fmt(trip.end_date as any);
    if (s && e) return `du ${s} au ${e}`;
    return s || e;
  }, [trip]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.heroWrap}>
        <View style={styles.heroContainer}>
          {/* Fixed buttons */}
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Pressable style={styles.editBtn} onPress={() => setShowEditModal(true)}>
            <Text style={styles.editIcon}>⚙️</Text>
          </Pressable>
          <Pressable style={styles.likeFab}>
            <Text style={styles.likeIcon}>♡</Text>
          </Pressable>
          
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
              setCurrentImageIndex(index);
            }}
            style={styles.imageScrollView}
          >
            {images.map((image, index) => (
              <ImageBackground
                key={index}
                source={image}
                style={styles.hero}
                imageStyle={styles.heroImg}
              >
              </ImageBackground>
            ))}
          </ScrollView>
          
          {/* Carousel dots */}
          {images.length > 1 && (
            <View style={styles.carouselDots}>
              {images.map((_, index) => (
                <Pressable 
                  key={index}
                  style={[styles.dot, index === currentImageIndex && styles.dotActive]} 
                  onPress={() => setCurrentImageIndex(index)}
                />
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.locationRow}>
          <Text style={styles.pinIcon}>📍</Text>
          <Text style={styles.place}>{trip?.destination || 'Destination'}</Text>
        </View>
        <Text style={styles.title}>{trip?.title ?? 'Voyage'}</Text>
        <Text style={styles.desc}>
          {trip?.description || 'Aucune description disponible.'}
        </Text>
        {!!dateRange && <Text style={styles.dates}>{dateRange}</Text>}
      </View>

      {/* Steps Section */}
      <View style={styles.stepsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.section}>Étapes du voyage ({steps.length})</Text>
          <Pressable style={styles.addStepButton} onPress={() => router.push(`/trip/${id}/map?addStep=true`)}>
            <Text style={styles.addStepButtonText}>+ Ajouter</Text>
          </Pressable>
        </View>
        
        {steps.length > 0 ? (
          <View style={styles.stepsList}>
            {steps.map((step, index) => (
              <View key={step.id} style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepName}>{step.name}</Text>
                  {step.description && (
                    <Text style={styles.stepDescription}>{step.description}</Text>
                  )}
                  <Text style={styles.stepCoords}>
                    📍 {step.latitude.toFixed(4)}, {step.longitude.toFixed(4)}
                  </Text>
                </View>
                <Pressable 
                  style={styles.deleteStepButton}
                  onPress={() => onDeleteStep(step.id, step.name)}
                >
                  <Text style={styles.deleteStepIcon}>🗑️</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptySteps}>
            <Text style={styles.emptyStepsText}>Aucune étape ajoutée</Text>
            <Text style={styles.emptyStepsSubtext}>Commencez par ajouter votre première étape</Text>
          </View>
        )}
      </View>

      <View style={styles.notesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.section}>Bloc note de voyages</Text>
          <Pressable style={styles.journalButton} onPress={() => router.push(`/trip/${id}/journal`)}>
            <Text style={styles.journalButtonText}>📝 Journal</Text>
          </Pressable>
        </View>
        
        {steps.slice(0, 4).map((s, index) => (
          <Pressable key={s.id} style={styles.noteCard}>
            <Image source={images[index % images.length]} style={styles.noteThumb} />
            <View style={styles.noteContent}>
              <Text style={styles.noteTitle}>Visite du musée du pont</Text>
              <View style={styles.noteMetaRow}>
                <Text style={styles.calendarIcon}>📅</Text>
                <Text style={styles.noteMeta}>Modifié le 10/10/2025</Text>
              </View>
            </View>
            <Pressable style={styles.chev}>
              <Text style={styles.chevTxt}>›</Text>
            </Pressable>
          </Pressable>
        ))}
        </View>

        {/* Checklist Section */}
        <View style={styles.checklistSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.section}>Checklist ({checklistItems.length})</Text>
            <Pressable style={styles.checklistButton} onPress={() => router.push(`/trip/${id}/checklist`)}>
              <Text style={styles.checklistButtonText}>✅ Checklist</Text>
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

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
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
                <TextInput
                  style={styles.input}
                  value={editStartDate}
                  onChangeText={setEditStartDate}
                  placeholder="DD/MM/YYYY"
                />
              </View>
              <View style={styles.dateGroup}>
                <Text style={styles.label}>Date de fin</Text>
                <TextInput
                  style={styles.input}
                  value={editEndDate}
                  onChangeText={setEditEndDate}
                  placeholder="DD/MM/YYYY"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Image de couverture</Text>
              <Pressable style={styles.imagePicker} onPress={pickImage}>
                {editCoverImage ? (
                  <Image source={{ uri: editCoverImage }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>📷</Text>
                    <Text style={styles.imagePlaceholderLabel}>Choisir une photo</Text>
                  </View>
                )}
              </Pressable>
            </View>

            <Pressable style={styles.saveButton} onPress={onSaveEdit}>
              <Text style={styles.saveButtonText}>Sauvegarder</Text>
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
    backgroundColor: '#ffffff' 
  },
  heroWrap: { 
    padding: 12 
  },
  heroContainer: {
    height: 300,
    position: 'relative',
  },
  imageScrollView: {
    height: 300,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  hero: { 
    width: Dimensions.get('window').width - 24, // Largeur de l'écran moins le padding
    height: 300, 
    borderRadius: 24, 
    overflow: 'hidden', 
    justifyContent: 'flex-end' 
  },
  heroImg: { 
    borderRadius: 24 
  },
  backBtn: { 
    position: 'absolute', 
    top: 28, 
    left: 28, 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.95)', 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 10,
  },
  backIcon: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#0f172a' 
  },
  likeFab: { 
    position: 'absolute', 
    right: 28, 
    bottom: 32, 
    width: 52, 
    height: 52, 
    borderRadius: 26, 
    backgroundColor: '#ffffff', 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: '#000', 
    shadowOpacity: 0.25, 
    shadowRadius: 15, 
    shadowOffset: { width: 0, height: 6 }, 
    elevation: 6,
    zIndex: 10,
  },
  likeIcon: { 
    fontSize: 20, 
    color: '#ef4444', 
    fontWeight: '900' 
  },
  editBtn: { 
    position: 'absolute', 
    top: 28, 
    right: 28, 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.95)', 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 10,
  },
  editIcon: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#0f172a' 
  },
  carouselDots: { 
    alignSelf: 'center', 
    flexDirection: 'row', 
    gap: 8, 
    marginBottom: 20, 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20 
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
    marginBottom: 12,
  },
  pinIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  place: { 
    color: '#ef4444', 
    fontWeight: '800', 
    fontSize: 16,
  },
  title: { 
    fontSize: 32, 
    fontWeight: '900', 
    color: '#0f172a', 
    marginBottom: 12,
    lineHeight: 36,
  },
  desc: { 
    color: '#64748b', 
    marginBottom: 16, 
    lineHeight: 22,
    fontSize: 16,
  },
  dates: { 
    color: '#0f172a', 
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
  addStepButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addStepButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
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
  stepCoords: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
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
  section: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#0f172a',
  },
  journalButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  journalButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
  },
  notesActions: {
    marginBottom: 16,
  },
  checklistButton: {
    backgroundColor: '#9333ea',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  checklistButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
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
  calendarIcon: {
    fontSize: 12,
    marginRight: 4,
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
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
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
  saveButton: {
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
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
