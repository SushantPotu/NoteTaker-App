import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import PageThumbnail from '../components/PageThumbnail';
import { getNotebookWithPages, createPage, deletePage } from '../utils/api';

interface Page {
  id: number;
  notebook_id: number;
  page_number: number;
  image_data: string | null;
  extracted_text: string;
  created_at: string;
  updated_at: string;
}

const PageListScreen = ({ route, navigation }: any) => {
  const { notebookId, notebookName, notebookColor } = route.params;
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchPages = useCallback(async () => {
    try {
      const data = await getNotebookWithPages(notebookId);
      setPages(data.pages || []);
    } catch (err) {
      console.error('Failed to fetch pages:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [notebookId]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPages();
    });
    return unsubscribe;
  }, [navigation, fetchPages]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPages();
  };

  const handleCreatePage = async () => {
    setCreating(true);
    try {
      const result = await createPage(notebookId);
      // Navigate directly to the new page editor
      navigation.navigate('Editor', {
        pageId: result.id,
        pageNumber: result.page_number,
        notebookName: notebookName,
        notebookColor: notebookColor,
        allPages: [...pages, { id: result.id, page_number: result.page_number }],
      });
    } catch (err) {
      console.error('Create page error:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePage = (page: Page) => {
    Alert.alert(
      'Delete Page',
      `Delete page ${page.page_number}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePage(page.id);
              fetchPages();
            } catch (err) {
              console.error('Delete error:', err);
            }
          },
        },
      ],
    );
  };

  const renderPage = ({ item }: { item: Page }) => (
    <PageThumbnail
      id={item.id}
      pageNumber={item.page_number}
      extractedText={item.extracted_text || ''}
      hasImage={!!item.image_data}
      color={notebookColor}
      onPress={() =>
        navigation.navigate('Editor', {
          pageId: item.id,
          pageNumber: item.page_number,
          notebookName: notebookName,
          notebookColor: notebookColor,
          allPages: pages.map((p) => ({ id: p.id, page_number: p.page_number })),
        })
      }
      onLongPress={() => handleDeletePage(item)}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={notebookColor} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={[styles.headerDot, { backgroundColor: notebookColor }]} />
          <View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {notebookName}
            </Text>
            <Text style={styles.headerSubtitle}>
              {pages.length} {pages.length === 1 ? 'page' : 'pages'}
            </Text>
          </View>
        </View>
      </View>

      {/* Page List */}
      {pages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>No pages yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the button below to add your first page
          </Text>
        </View>
      ) : (
        <FlatList
          data={pages}
          renderItem={renderPage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: notebookColor,
            shadowColor: notebookColor,
          },
        ]}
        onPress={handleCreatePage}
        disabled={creating}
        activeOpacity={0.8}
      >
        {creating ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={styles.fabText}>+ New Page</Text>
        )}
      </TouchableOpacity>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backText: {
    fontSize: 22,
    color: '#0F172A',
    fontWeight: '500',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 96,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    left: 20,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  fabText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default PageListScreen;
