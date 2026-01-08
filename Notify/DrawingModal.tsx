import React, { useRef } from 'react';
import { View, StyleSheet, Button, Modal, Text, SafeAreaView } from 'react-native';
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
          <Button title="Cancel" onPress={onClose} color="red" />
        </View>
        
        <View style={styles.canvasContainer}>
          <SignatureScreen
            ref={ref}
            onOK={handleOK}
            webStyle={webStyle}
            backgroundColor="#F5F5F5" 
            penColor="black"
            minWidth={3} 
          />
        </View>

        <View style={styles.footer}>
          <Button title="Clear Canvas" onPress={handleClear} color="#FF9800" />
          <Button title="Analyze & Convert" onPress={handleConfirm} />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 15,
    borderBottomWidth: 1,
    borderColor: '#ddd'
  },
  title: { fontSize: 20, fontWeight: 'bold' },
  canvasContainer: { flex: 1 },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    padding: 20, 
    borderTopWidth: 1, 
    borderColor: '#ddd' 
  },
});

export default DrawingModal;