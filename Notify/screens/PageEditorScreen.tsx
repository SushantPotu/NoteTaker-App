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
import DocumentPicker from 'react-native-document-picker';
import DrawingModal from '../DrawingModal';
import { scanImage, getPage, updatePage } from '../utils/api';

const PageEditorScreen = ({ route, navigation }: any) => {
  const { pageId, pageNumber, notebookName, notebookColor, allPages } = route.params;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isDrawingVisible, setIsDrawingVisible] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Swipe Gestures
  const touchStart = React.useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: any) => {
    if (isDrawingVisible || loading) return;
    touchStart.current = {
      x: e.nativeEvent.pageX,
      y: e.nativeEvent.pageY,
    };
  };

  const handleTouchEnd = (e: any) => {
    if (isDrawingVisible || loading) return;
    const dx = e.nativeEvent.pageX - touchStart.current.x;
    const dy = e.nativeEvent.pageY - touchStart.current.y;
    
    // Require a clear horizontal swipe (width of movement > 120 and at least 2.5 times larger than vertical movement)
    if (Math.abs(dx) > 120 && Math.abs(dx) > 2.5 * Math.abs(dy)) {
      if (dx > 0 && prevPage) {
        navigateToPage(prevPage);
      } else if (dx < 0 && nextPage) {
        navigateToPage(nextPage);
      }
    }
  };

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

  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [
          DocumentPicker.types.plainText,
          DocumentPicker.types.pdf,
          DocumentPicker.types.images,
        ],
      });
      const file = res[0];
      if (file) {
        setLoading(true);
        setExtractedText('');
        
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          name: file.name || 'document',
          type: file.type || 'application/octet-stream',
        } as any);

        const data = await scanImage(formData, pageId);
        const text = data.extracted_text || 'No text found.';
        setExtractedText(text);

        if (file.type?.startsWith('image/')) {
          setImageUri(file.uri);
          updatePage(pageId, { image_data: file.uri, extracted_text: text }).catch(console.error);
        } else {
          setImageUri(null);
          updatePage(pageId, { image_data: '', extracted_text: text }).catch(console.error);
        }
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User cancelled document picker');
      } else {
        console.error(err);
        setExtractedText('Error picking document: ' + (err as any).message);
      }
    } finally {
      setLoading(false);
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
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={notebookColor} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

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
            <View style={[styles.pageBadge, { backgroundColor: notebookColor + '20' }]}>
              <Text style={[styles.pageBadgeText, { color: notebookColor }]}>Page {pageNumber}</Text>
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
          <TouchableOpacity 
            style={[styles.button, styles.galleryButton]} 
            onPress={pickImage}
          >
            <Text style={styles.buttonEmoji}>📷</Text>
            <Text style={[styles.buttonText, styles.galleryButtonText]}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.filesButton]}
            onPress={pickDocument}
          >
            <Text style={styles.buttonEmoji}>📁</Text>
            <Text style={[styles.buttonText, styles.filesButtonText]}>Files</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button, 
              styles.writeButton, 
              { 
                backgroundColor: notebookColor,
                shadowColor: notebookColor,
              }
            ]}
            onPress={() => setIsDrawingVisible(true)}
          >
            <Text style={styles.buttonEmoji}>✏️</Text>
            <Text style={[styles.buttonText, styles.writeButtonText]}>Write Note</Text>
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

      {/* Quick Page Navigator Sticky at Bottom */}
      <View style={styles.quickNavContainer}>
        <Text style={styles.quickNavLabel}>Jump to Page:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickNavScroll}
        >
          {allPages
            ? [...allPages]
                .sort((a: any, b: any) => a.page_number - b.page_number)
                .map((page: any) => {
                  const isCurrent = page.id === pageId;
                  return (
                    <TouchableOpacity
                      key={page.id}
                      style={[
                        styles.quickNavPill,
                        isCurrent
                          ? { backgroundColor: notebookColor }
                          : styles.quickNavPillInactive,
                      ]}
                      onPress={() => !isCurrent && navigateToPage(page)}
                    >
                      <Text
                        style={[
                          styles.quickNavPillText,
                          isCurrent && styles.quickNavPillTextActive,
                        ]}
                      >
                        Page {page.page_number}
                      </Text>
                    </TouchableOpacity>
                  );
                })
            : null}
        </ScrollView>
      </View>
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
    paddingTop: 12,
    paddingBottom: 14,
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginRight: 40, // offset backButton to center the content
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrowDisabled: {
    opacity: 0.3,
  },
  navArrowText: {
    fontSize: 20,
    color: '#0F172A',
    fontWeight: '600',
    marginTop: -2,
  },
  pageBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
  },
  pageBadgeText: {
    fontSize: 14,
    fontWeight: '800',
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
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  galleryButton: {
    backgroundColor: '#EFF6FF',
  },
  galleryButtonText: {
    color: '#1D4ED8',
  },
  filesButton: {
    backgroundColor: '#ECFDF5',
  },
  filesButtonText: {
    color: '#047857',
  },
  writeButton: {
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  writeButtonText: {
    color: '#FFFFFF',
  },
  buttonEmoji: {
    fontSize: 16,
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 13,
  },
  scanButton: {
    width: '100%',
    backgroundColor: '#0F172A',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
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
    letterSpacing: -0.2,
  },
  resultContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 16,
    minHeight: 120,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultLabel: {
    fontWeight: '800',
    marginBottom: 10,
    color: '#0F172A',
    fontSize: 15,
    letterSpacing: -0.3,
  },
  resultText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
    fontWeight: '500',
  },
  resultPlaceholder: {
    fontSize: 14,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  shareButton: {
    width: '100%',
    backgroundColor: '#0284C7',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    elevation: 3,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  quickNavContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  quickNavLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  quickNavScroll: {
    gap: 8,
  },
  quickNavPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickNavPillInactive: {
    backgroundColor: '#F1F5F9',
  },
  quickNavPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  quickNavPillTextActive: {
    color: '#FFFFFF',
  },
});

export default PageEditorScreen;
