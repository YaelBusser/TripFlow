import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createJournalEntry, deleteJournalEntry, JournalEntry, listJournal, updateJournalEntry } from '../../../lib/journal';
import { listSteps, Step } from '../../../lib/steps';

export default function JournalScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const id = Number(tripId);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [newEntryText, setNewEntryText] = useState('');
  const [editEntryText, setEditEntryText] = useState('');
  const [selectedStepId, setSelectedStepId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    const tripSteps = await listSteps(id);
    setSteps(tripSteps);
    
    // Charger les entrées de journal pour toutes les étapes
    const allEntries: JournalEntry[] = [];
    for (const step of tripSteps) {
      const stepEntries = await listJournal(step.id);
      allEntries.push(...stepEntries);
    }
    setEntries(allEntries.sort((a, b) => b.created_at - a.created_at));
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onAddEntry = async () => {
    if (!newEntryText || !newEntryText.trim() || !selectedStepId) return;
    
    try {
      await createJournalEntry(selectedStepId, newEntryText.trim());
      setNewEntryText('');
      setSelectedStepId(null);
      setShowAddModal(false);
      await loadData();
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
    }
  };

  const onEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setEditEntryText(entry.content);
    setShowEditModal(true);
  };

  const onSaveEdit = async () => {
    if (!editingEntry || !editEntryText || !editEntryText.trim()) return;
    
    try {
      await updateJournalEntry(editingEntry.id, editEntryText.trim());
      setShowEditModal(false);
      setEditingEntry(null);
      setEditEntryText('');
      await loadData();
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
    }
  };

  const onDeleteEntry = (entryId: number) => {
    Alert.alert(
      'Supprimer la note',
      'Êtes-vous sûr de vouloir supprimer cette note de journal ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteJournalEntry(entryId);
              await loadData();
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
            }
          },
        },
      ]
    );
  };

  const getStepName = (stepId: number) => {
    const step = steps.find(s => s.id === stepId);
    return step?.name || 'Étape inconnue';
  };

  const renderEntry = ({ item }: { item: JournalEntry }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <Text style={styles.stepName}>{getStepName(item.step_id)}</Text>
        <Text style={styles.entryDate}>
          {new Date(item.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
      
      <Text style={styles.entryContent}>{item.content}</Text>
      
      <View style={styles.entryActions}>
        <Pressable 
          style={styles.actionButton} 
          onPress={() => onEditEntry(item)}
        >
          <Text style={styles.actionButtonText}>✏️ Modifier</Text>
        </Pressable>
        <Pressable 
          style={[styles.actionButton, styles.deleteButton]} 
          onPress={() => onDeleteEntry(item.id)}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>🗑️ Supprimer</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>Journal de voyage</Text>
        <Pressable 
          style={styles.addButton} 
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addIcon}>+</Text>
        </Pressable>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderEntry}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>Aucune note</Text>
            <Text style={styles.emptyText}>Ajoutez votre première note de journal</Text>
          </View>
        }
      />

      {/* Add Entry Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouvelle note</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Étape *</Text>
              <View style={styles.stepSelector}>
                {steps.map((step) => (
                  <Pressable
                    key={step.id}
                    style={[
                      styles.stepOption,
                      selectedStepId === step.id && styles.stepOptionSelected
                    ]}
                    onPress={() => setSelectedStepId(step.id)}
                  >
                    <Text style={[
                      styles.stepOptionText,
                      selectedStepId === step.id && styles.stepOptionTextSelected
                    ]}>
                      {step.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Contenu de la note</Text>
              <TextInput
                style={styles.textArea}
                value={newEntryText}
                onChangeText={setNewEntryText}
                placeholder="Racontez votre expérience..."
                multiline
                numberOfLines={6}
              />
            </View>
            
            <Pressable 
              style={[
                styles.saveButton, 
                (!newEntryText || !newEntryText.trim() || !selectedStepId) && styles.saveButtonDisabled
              ]} 
              onPress={onAddEntry}
              disabled={!newEntryText || !newEntryText.trim() || !selectedStepId}
            >
              <Text style={styles.saveButtonText}>Ajouter la note</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Entry Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier la note</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.label}>Contenu de la note</Text>
            <TextInput
              style={styles.textArea}
              value={editEntryText}
              onChangeText={setEditEntryText}
              placeholder="Racontez votre expérience..."
              multiline
              numberOfLines={6}
            />
            
            <Pressable 
              style={[styles.saveButton, (!editEntryText || !editEntryText.trim()) && styles.saveButtonDisabled]} 
              onPress={onSaveEdit}
              disabled={!editEntryText || !editEntryText.trim()}
            >
              <Text style={styles.saveButtonText}>Sauvegarder</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  listContainer: {
    padding: 20,
    gap: 16,
  },
  entryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  entryDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  entryContent: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    marginBottom: 16,
  },
  entryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  deleteButtonText: {
    color: '#dc2626',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
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
  stepSelector: {
    gap: 8,
  },
  stepOption: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  stepOptionSelected: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  stepOptionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  stepOptionTextSelected: {
    color: 'white',
  },
  textArea: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    color: '#111827',
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});