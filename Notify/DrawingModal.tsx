import React, { useRef } from 'react';
import { View, StyleSheet, Modal, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';

interface DrawingModalProps {
  visible: boolean;
  onClose: () => void;
  onOK: (signature: string) => void; 
}

const DrawingModal: React.FC<DrawingModalProps> = ({ visible, onClose, onOK }) => {
  const ref = useRef<any>(null);
  const handleOK = (signature: string) => {
    onOK(signature); 
    onClose();
  };

  const handleClear = () => {
    ref.current.clearSignature();
  };

  const handleConfirm = () => {
    ref.current.readSignature(); 
  };

  const webStyle = `.m-signature-pad--footer {display: none; margin: 0px;}`;

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Write Your Note</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.canvasContainer}>
          <SignatureScreen
            ref={ref}
            onOK={handleOK}
            webStyle={webStyle}
            backgroundColor="#FFFFFF" 
            penColor="black"
            minWidth={1.5}
            maxWidth={3}
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.footerButton, styles.clearButton]} onPress={handleClear}>
            <Text style={styles.clearButtonText}>Clear Canvas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.footerButton, styles.confirmButton]} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>Analyze & Convert</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF',
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  cancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFE4E6',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E11D48',
  },
  canvasContainer: { 
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20,
    paddingVertical: 20, 
    borderTopWidth: 1, 
    borderColor: '#E2E8F0',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  footerButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#F1F5F9',
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  confirmButton: {
    backgroundColor: '#0F172A',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default DrawingModal;