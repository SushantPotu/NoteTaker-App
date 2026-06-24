import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import NotebookCard from '../components/NotebookCard';
import { getNotebooks, createNotebook, deleteNotebook, renameNotebook } from '../utils/api';

const COLORS = [
  '#6C5CE7', '#0984E3', '#E84393', '#00B894',
  '#F0932B', '#00D2D3', '#6D214F', '#4A5568',
  '#FF6B6B', '#10AC84', '#5758BB', '#E15F41',
];

interface Notebook {
  id: number;
  name: string;
  color: string;
  page_count: number;
  created_at: string;
  updated_at: string;
}

const NotebookListScreen = ({ navigation }: any) => {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchNotebooks = useCallback(async () => {
    try {
      const data = await getNotebooks();
      setNotebooks(data);
    } catch (err) {
      console.error('Failed to fetch notebooks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchNotebooks();
    });
    return unsubscribe;
  }, [navigation, fetchNotebooks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotebooks();
  };

  const openCreateModal = () => {
    setNewName('');
    setSelectedColor(COLORS[0]);
    setEditingId(null);
    setModalVisible(true);
  };

  const openRenameModal = (notebook: Notebook) => {
    setNewName(notebook.name);
    setSelectedColor(notebook.color);
    setEditingId(notebook.id);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    try {
      if (editingId) {
        await renameNotebook(editingId, trimmed);
      } else {
        await createNotebook(trimmed, selectedColor);
      }
      setModalVisible(false);
      fetchNotebooks();
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleDelete = (notebook: Notebook) => {
    Alert.alert(
      'Delete Notebook',
      `Are you sure you want to delete "${notebook.name}" and all its pages?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNotebook(notebook.id);
              fetchNotebooks();
            } catch (err) {
              console.error('Delete error:', err);
            }
          },
        },
      ],
    );
  };

  const handleLongPress = (notebook: Notebook) => {
    Alert.alert(
      notebook.name,
      'Choose an action',
      [
        { text: 'Rename', onPress: () => openRenameModal(notebook) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(notebook),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const renderNotebook = ({ item }: { item: Notebook }) => (
    <NotebookCard
      id={item.id}
      name={item.name}
      color={item.color}
      pageCount={item.page_count}
      updatedAt={item.updated_at}
      onPress={() =>
        navigation.navigate('Pages', {
          notebookId: item.id,
          notebookName: item.name,
          notebookColor: item.color,
        })
      }
      onLongPress={() => handleLongPress(item)}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>My Notebooks</Text>
          <Text style={styles.subtitle}>
            {notebooks.length} {notebooks.length === 1 ? 'notebook' : 'notebooks'}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Notebook Grid */}
      {notebooks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📓</Text>
          <Text style={styles.emptyTitle}>No notebooks yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the + button to create your first notebook
          </Text>
        </View>
      ) : (
        <FlatList
          data={notebooks}
          renderItem={renderNotebook}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create / Rename Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Rename Notebook' : 'New Notebook'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Notebook name..."
              placeholderTextColor="#999"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              maxLength={40}
            />

            {/* Color Picker */}
            <Text style={styles.colorLabel}>Choose a color</Text>
            <View style={styles.colorGrid}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    selectedColor === c && styles.colorDotSelected,
                  ]}
                  onPress={() => setSelectedColor(c)}
                />
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSave,
                  { backgroundColor: selectedColor },
                  !newName.trim() && styles.modalSaveDisabled,
                ]}
                onPress={handleSave}
                disabled={!newName.trim()}
              >
                <Text style={styles.modalSaveText}>
                  {editingId ? 'Save' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  addButtonText: {
    fontSize: 26,
    color: '#FFFFFF',
    fontWeight: '400',
    marginTop: -2,
  },
  gridContainer: {
    padding: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F5F5FA',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0EE',
  },
  colorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#1A1A2E',
    transform: [{ scale: 1.15 }],
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancel: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F0F0F5',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  modalSave: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  modalSaveDisabled: {
    opacity: 0.5,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default NotebookListScreen;
