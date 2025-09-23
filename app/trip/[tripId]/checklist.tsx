import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import { ChecklistItem, createChecklistItem, deleteChecklistItem, listChecklistItems, toggleChecklistItem, updateChecklistItem } from '../../../lib/checklist';

export default function ChecklistScreen() {
  const { themeColors } = useTheme();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const id = Number(tripId);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [editItemText, setEditItemText] = useState('');

  const loadItems = useCallback(async () => {
    if (!id) return;
    const checklistItems = await listChecklistItems(id);
    setItems(checklistItems);
  }, [id]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const onAddItem = async () => {
    if (!newItemText || !newItemText.trim()) return;
    
    try {
      await createChecklistItem(id, newItemText.trim());
      setNewItemText('');
      setShowAddModal(false);
      await loadItems();
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
    }
  };

  const onToggleItem = async (itemId: number) => {
    try {
      await toggleChecklistItem(itemId);
      await loadItems();
    } catch (error) {
      console.error('Erreur lors du toggle:', error);
    }
  };

  const onEditItem = (item: ChecklistItem) => {
    setEditingItem(item);
    setEditItemText(item.text);
    setShowEditModal(true);
  };

  const onSaveEdit = async () => {
    if (!editingItem || !editItemText || !editItemText.trim()) return;
    
    try {
      await updateChecklistItem(editingItem.id, editItemText.trim());
      setShowEditModal(false);
      setEditingItem(null);
      setEditItemText('');
      await loadItems();
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
    }
  };

  const onDeleteItem = (itemId: number) => {
    Alert.alert(
      'Supprimer l\'élément',
      'Êtes-vous sûr de vouloir supprimer cet élément de la checklist ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChecklistItem(itemId);
              await loadItems();
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ChecklistItem }) => (
    <View style={styles.itemCard}>
      <Pressable 
        style={styles.checkbox} 
        onPress={() => onToggleItem(item.id)}
      >
        <Text style={styles.checkboxText}>
          {item.is_checked ? '✅' : '⬜'}
        </Text>
      </Pressable>
      
      <View style={styles.itemContent}>
        <Text style={[
          styles.itemText,
          item.is_checked ? styles.itemTextChecked : null
        ]}>
          {item.text}
        </Text>
        <Text style={styles.itemDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.itemActions}>
        <Pressable 
          style={styles.actionButton} 
          onPress={() => onEditItem(item)}
        >
          <Text style={styles.actionButtonText}>✏️</Text>
        </Pressable>
        <Pressable 
          style={styles.actionButton} 
          onPress={() => onDeleteItem(item.id)}
        >
          <Text style={styles.actionButtonText}>🗑️</Text>
        </Pressable>
      </View>
    </View>
  );

  const completedCount = items.filter(item => item.is_checked).length;
  const totalCount = items.length;

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.backgroundSecondary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: themeColors.backgroundPrimary,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.borderLight,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: themeColors.textPrimary,
    },
    addButton: {
      backgroundColor: themeColors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    addButtonText: {
      color: themeColors.backgroundPrimary,
      fontWeight: '600',
      fontSize: 14,
    },
    listContainer: {
      flex: 1,
      padding: 20,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themeColors.backgroundPrimary,
      padding: 16,
      marginBottom: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: themeColors.borderLight,
      shadowColor: themeColors.shadowLight,
      shadowOpacity: 1,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    itemText: {
      flex: 1,
      fontSize: 16,
      color: themeColors.textPrimary,
      marginLeft: 12,
    },
    completedText: {
      textDecorationLine: 'line-through',
      color: themeColors.textTertiary,
    },
    // ... autres styles dynamiques
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={dynamicStyles.headerTitle}>Préparation valise</Text>
        <Pressable 
          style={dynamicStyles.addButton} 
          onPress={() => setShowAddModal(true)}
        >
          <Text style={dynamicStyles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {completedCount} / {totalCount} terminés
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }
            ]} 
          />
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={dynamicStyles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>Aucun élément</Text>
            <Text style={styles.emptyText}>Ajoutez les éléments à mettre dans votre valise</Text>
          </View>
        }
      />

      {/* Add Item Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ajouter à la valise</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.label}>Élément à mettre dans la valise</Text>
            <TextInput
              style={styles.input}
              value={newItemText}
              onChangeText={setNewItemText}
              placeholder="Ex: Passport, Billets d'avion, Vêtements..."
              multiline
            />
            
            <Pressable 
              style={[styles.saveButton, (!newItemText || !newItemText.trim()) && styles.saveButtonDisabled]} 
              onPress={onAddItem}
              disabled={!newItemText || !newItemText.trim()}
            >
              <Text style={styles.saveButtonText}>Ajouter</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Item Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier l'élément</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.label}>Élément à mettre dans la valise</Text>
            <TextInput
              style={styles.input}
              value={editItemText}
              onChangeText={setEditItemText}
              placeholder="Ex: Passport, Billets d'avion, Vêtements..."
              multiline
            />
            
            <Pressable 
              style={[styles.saveButton, (!editItemText || !editItemText.trim()) && styles.saveButtonDisabled]} 
              onPress={onSaveEdit}
              disabled={!editItemText || !editItemText.trim()}
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
    position: 'absolute',
    top: 16,
    left: 16,
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
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
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
  listContainer: {
    padding: 20,
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxText: {
    fontSize: 20,
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemTextChecked: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  itemDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 16,
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
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#10b981',
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