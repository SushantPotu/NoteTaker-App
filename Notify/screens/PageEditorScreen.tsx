import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Share,
  StatusBar,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import DrawingModal from '../DrawingModal';
import { scanImage, getPage, updatePage } from '../utils/api';

const PageEditorScreen = ({ route, navigation }: any) => {
  const { pageId, pageNumber, notebookName, notebookColor, allPages } = route.params;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isDrawingVisible, setIsDrawingVisible] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Load existing page data
  useEffect(() => {
    const loadPage = async () => {
      try {
        const data = await getPage(pageId);
        if (data && !data.error) {
          if (data.image_data) setImageUri(data.image_data);
          if (data.extracted_text) setExtractedText(data.extracted_text);
        }
      } catch (err) {
        console.error('Load page error:', err);
      } finally {
        setPageLoading(false);
      }
    };
    loadPage();
  }, [pageId]);

  // Navigation to prev/next page
  const currentIndex = allPages?.findIndex((p: any) => p.id === pageId) ?? -1;
  const prevPage = currentIndex > 0 ? allPages[currentIndex - 1] : null;
  const nextPage =
    currentIndex >= 0 && currentIndex < (allPages?.length ?? 0) - 1
      ? allPages[currentIndex + 1]
      : null;

  const navigateToPage = (page: any) => {
    navigation.replace('Editor', {
      pageId: page.id,
      pageNumber: page.page_number,
      notebookName,
      notebookColor,
      allPages,
    });
  };

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    });
    if (result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri || null;
      setImageUri(uri);
      setExtractedText('');
      // Save image data to page
      if (uri) {
        updatePage(pageId, { image_data: uri }).catch(console.error);
      }
    }
  };

  const handleDrawingSaved = (base64Image: string) => {
    setImageUri(base64Image);
    setExtractedText('');
    // Save drawing to page
    updatePage(pageId, { image_data: base64Image }).catch(console.error);
    // Auto-scan
    setTimeout(() => scanNote(base64Image), 500);
  };

  const scanNote = async (directUri?: string) => {
    const uriToUse = directUri || imageUri;
    if (!uriToUse) return;

    setLoading(true);
    setExtractedText('');

    try {
      const formData = new FormData();

      if (uriToUse.startsWith('data:')) {
        formData.append('file', {
          uri: uriToUse,
          name: 'drawing.png',
          type: 'image/png',
        } as any);
      } else {
        formData.append('file', {
          uri: uriToUse,
          name: 'scan.jpg',
          type: 'image/jpeg',
        } as any);
      }

      // Scan with page_id so backend auto-saves text
      const data = await scanImage(formData, pageId);
      const text = data.extracted_text || 'No text found.';
      setExtractedText(text);
    } catch (error: any) {
      console.error(error);
      setExtractedText('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: extractedText,
        title: `${notebookName} — Page ${pageNumber}`,
      });
    } catch (error: any) {
      console.error(error.message);
    }
  };

  if (pageLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={notebookColor} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {notebookName}
          </Text>
          <View style={styles.pageNav}>
            <TouchableOpacity
              disabled={!prevPage}
              onPress={() => prevPage && navigateToPage(prevPage)}
              style={[styles.navArrow, !prevPage && styles.navArrowDisabled]}
            >
              <Text style={styles.navArrowText}>‹</Text>
            </TouchableOpacity>
            <View style={[styles.pageBadge, { backgroundColor: notebookColor }]}>
              <Text style={styles.pageBadgeText}>Page {pageNumber}</Text>
            </View>
            <TouchableOpacity
              disabled={!nextPage}
              onPress={() => nextPage && navigateToPage(nextPage)}
              style={[styles.navArrow, !nextPage && styles.navArrowDisabled]}
            >
              <Text style={styles.navArrowText}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.emptyPreview}>
              <Text style={styles.emptyIcon}>✏️</Text>
              <Text style={styles.placeholderText}>
                Write or upload a note to get started
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={pickImage}>
            <Text style={styles.buttonEmoji}>📷</Text>
            <Text style={styles.buttonText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: notebookColor }]}
            onPress={() => setIsDrawingVisible(true)}
          >
            <Text style={styles.buttonEmoji}>✏️</Text>
            <Text style={styles.buttonText}>Write Note</Text>
          </TouchableOpacity>
        </View>

        {/* Scan Button */}
        <TouchableOpacity
          style={[
            styles.scanButton,
            (!imageUri || loading) && styles.disabledButton,
          ]}
          onPress={() => scanNote()}
          disabled={!imageUri || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.scanButtonText}>🔍 Run AI Analysis</Text>
          )}
        </TouchableOpacity>

        {/* Results */}
        <View style={styles.resultContainer}>
          <Text style={styles.resultLabel}>Converted Text</Text>
          {extractedText ? (
            <Text style={styles.resultText}>{extractedText}</Text>
          ) : (
            <Text style={styles.resultPlaceholder}>
              Text will appear here after analysis...
            </Text>
          )}
        </View>

        {/* Share Button */}
        {extractedText ? (
          <TouchableOpacity style={styles.shareButton} onPress={onShare}>
            <Text style={styles.shareButtonText}>📤 Share Text</Text>
          </TouchableOpacity>
        ) : null}

        {/* Drawing Modal */}
        <DrawingModal
          visible={isDrawingVisible}
          onClose={() => setIsDrawingVisible(false)}
          onOK={handleDrawingSaved}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5FA',
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
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#1A1A2E',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backText: {
    fontSize: 22,
    color: '#FFFFFF',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A0A0C0',
    marginBottom: 4,
  },
  pageNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrowDisabled: {
    opacity: 0.3,
  },
  navArrowText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pageBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
  },
  pageBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  imageContainer: {
    width: '100%',
    height: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEF5',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  emptyPreview: {
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  placeholderText: {
    color: '#AAA',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonEmoji: {
    fontSize: 18,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  scanButton: {
    width: '100%',
    backgroundColor: '#1A1A2E',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  disabledButton: {
    opacity: 0.4,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  resultContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 16,
    minHeight: 100,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#EEEEF5',
  },
  resultLabel: {
    fontWeight: '700',
    marginBottom: 10,
    color: '#1A1A2E',
    fontSize: 15,
  },
  resultText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 24,
  },
  resultPlaceholder: {
    fontSize: 14,
    color: '#CCC',
    fontStyle: 'italic',
  },
  shareButton: {
    width: '100%',
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    elevation: 3,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default PageEditorScreen;
