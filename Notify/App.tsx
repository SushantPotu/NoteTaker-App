import React, { useState } from 'react';
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
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import DrawingModal from './DrawingModal';

const App = () => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isDrawingVisible, setIsDrawingVisible] = useState(false);

  const pickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
    if (result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri || null);
      setExtractedText(''); 
    }
  };

  const handleDrawingSaved = (base64Image: string) => {
    setImageUri(base64Image); 
    setExtractedText('');
    
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

      const API_URL = 'http://192.168.29.183:8000/scan'; 

      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setExtractedText(data.extracted_text || "No text found.");
      
    } catch (error: any) {
      console.error(error);
      setExtractedText("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: extractedText,
        title: "Converted Note"
      });
    } catch (error: any) {
      console.error(error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Notify</Text>

        {/* Image Preview Area */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
          ) : (
            <Text style={styles.placeholderText}>No Note Selected</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={pickImage}>
            <Text style={styles.buttonText}>📷 Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.drawButton]} onPress={() => setIsDrawingVisible(true)}>
            <Text style={styles.buttonText}>✏️ Write Note</Text>
          </TouchableOpacity>
        </View>

        {/* Manual Scan Button */}
        <TouchableOpacity 
          style={[styles.scanButton, (!imageUri || loading) && styles.disabledButton]} 
          onPress={() => scanNote()}
          disabled={!imageUri || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Run AI Analysis</Text>}
        </TouchableOpacity>

        {/* Results Area */}
        <View style={styles.resultContainer}>
          <Text style={styles.resultLabel}>Converted Text:</Text>
          <Text style={styles.resultText}>{extractedText}</Text>
        </View>

        {/* Share Button (Only appears when text exists) */}
        {extractedText ? (
          <TouchableOpacity style={styles.shareButton} onPress={onShare}>
            <Text style={styles.buttonText}>📤 Share Text</Text>
          </TouchableOpacity>
        ) : null}

        {/* The Drawing Modal */}
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
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { padding: 20, alignItems: 'center' },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  imageContainer: {
    width: '100%', height: 250, backgroundColor: '#E0E0E0', borderRadius: 15,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: '#ccc'
  },
  previewImage: { width: '100%', height: '100%' },
  placeholderText: { color: '#888' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 15 },
  button: {
    flex: 1, backgroundColor: '#2196F3', padding: 15, borderRadius: 10,
    alignItems: 'center', marginHorizontal: 5
  },
  drawButton: { backgroundColor: '#673AB7' },
  scanButton: {
    width: '100%', backgroundColor: '#4CAF50', padding: 15, borderRadius: 10,
    alignItems: 'center', marginBottom: 20
  },
  shareButton: {
    width: '100%', backgroundColor: '#FF9800', padding: 15, borderRadius: 10,
    alignItems: 'center', marginTop: 10
  },
  disabledButton: { backgroundColor: '#A5D6A7' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  resultContainer: {
    width: '100%', backgroundColor: 'white', padding: 15, borderRadius: 10,
    minHeight: 100, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5
  },
  resultLabel: { fontWeight: 'bold', marginBottom: 5, color: '#555' },
  resultText: { fontSize: 16, color: '#333', lineHeight: 24 },
});

export default App;