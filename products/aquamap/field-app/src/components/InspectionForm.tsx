import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { Inspection } from '@/database/schema';

export type FieldType = 'text' | 'number' | 'select' | 'checkbox' | 'photo' | 'signature';

export interface TemplateField {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
}

export interface InspectionTemplate {
  fields: TemplateField[];
}

interface InspectionFormProps {
  inspection: Inspection;
  onChange: (results: Record<string, unknown>) => void;
  onPhotoCapture: (fieldId: string, uri: string) => void;
  onSignatureCapture: (fieldId: string, b64: string) => void;
}

export function InspectionForm({
  inspection,
  onChange,
  onPhotoCapture,
  onSignatureCapture,
}: InspectionFormProps) {
  const [results, setResults] = useState<Record<string, unknown>>(() => {
    try {
      return JSON.parse(inspection.results_json) as Record<string, unknown>;
    } catch {
      return {};
    }
  });

  const [template, setTemplate] = useState<InspectionTemplate>(() => {
    try {
      return JSON.parse(inspection.template_json) as InspectionTemplate;
    } catch {
      return { fields: [] };
    }
  });

  const [cameraFieldId, setCameraFieldId] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const updateResult = useCallback(
    (fieldId: string, value: unknown) => {
      const next = { ...results, [fieldId]: value };
      setResults(next);
      onChange(next);
    },
    [results, onChange]
  );

  const handlePhoto = useCallback(
    async (fieldId: string) => {
      if (!permission?.granted) {
        const granted = await requestPermission();
        if (!granted) return;
      }
      setCameraFieldId(fieldId);
    },
    [permission, requestPermission]
  );

  const capturePhoto = useCallback(
    async (cameraRef: CameraView) => {
      if (!cameraFieldId) return;
      const photo = await cameraRef.takePictureAsync({ base64: true });
      if (photo?.uri) {
        onPhotoCapture(cameraFieldId, photo.uri);
        const existing = ((results[cameraFieldId] as string[]) ?? []);
        updateResult(cameraFieldId, [...existing, photo.uri]);
      }
      setCameraFieldId(null);
    },
    [cameraFieldId, onPhotoCapture, results, updateResult]
  );

  const handleSignature = useCallback(
    (fieldId: string) => {
      // For MVP, generate a simple base64 placeholder signature
      // In production, use a signature pad library
      const dummySignature = `data:image/png;base64,SIG_${Date.now()}`;
      onSignatureCapture(fieldId, dummySignature);
      updateResult(fieldId, dummySignature);
    },
    [onSignatureCapture, updateResult]
  );

  const renderField = (field: TemplateField) => {
    const value = results[field.id];

    switch (field.type) {
      case 'text':
        return (
          <TextInput
            style={styles.textInput}
            value={(value as string) ?? ''}
            onChangeText={(text) => updateResult(field.id, text)}
            placeholder={`Enter ${field.label}`}
            multiline
          />
        );

      case 'number':
        return (
          <TextInput
            style={styles.textInput}
            value={value !== undefined ? String(value) : ''}
            onChangeText={(text) => {
              const num = parseFloat(text);
              updateResult(field.id, isNaN(num) ? text : num);
            }}
            placeholder={`Enter ${field.label}`}
            keyboardType="numeric"
          />
        );

      case 'select':
        return (
          <View style={styles.selectContainer}>
            {field.options?.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.selectOption,
                  value === opt && styles.selectOptionActive,
                ]}
                onPress={() => updateResult(field.id, opt)}
              >
                <Text
                  style={[
                    styles.selectOptionText,
                    value === opt && styles.selectOptionTextActive,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'checkbox':
        return (
          <View style={styles.checkboxRow}>
            <Switch
              value={!!value}
              onValueChange={(checked) => updateResult(field.id, checked)}
            />
            <Text style={styles.checkboxLabel}>{value ? 'Yes' : 'No'}</Text>
          </View>
        );

      case 'photo':
        const photos = (value as string[]) ?? [];
        return (
          <View>
            <View style={styles.photoGrid}>
              {photos.map((uri, idx) => (
                <Image key={idx} source={{ uri }} style={styles.thumbnail} />
              ))}
            </View>
            {cameraFieldId === field.id ? (
              <View style={styles.cameraContainer}>
                <CameraView style={styles.camera} ref={(ref) => {
                  if (ref) {
                    // Give user a moment before auto-capturing, or add a capture button
                    setTimeout(() => capturePhoto(ref), 500);
                  }
                }}>
                  <TouchableOpacity
                    style={styles.captureButton}
                    onPress={() => setCameraFieldId(null)}
                  >
                    <Text style={styles.captureButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </CameraView>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handlePhoto(field.id)}
              >
                <Text style={styles.actionButtonText}>Take Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'signature':
        return (
          <View>
            {value ? (
              <Image source={{ uri: value as string }} style={styles.signaturePreview} />
            ) : null}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSignature(field.id)}
            >
              <Text style={styles.actionButtonText}>
                {value ? 'Re-sign' : 'Add Signature'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {template.fields.map((field) => (
        <View key={field.id} style={styles.fieldContainer}>
          <Text style={styles.label}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          {renderField(field)}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  required: {
    color: '#ef4444',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#ffffff',
    minHeight: 44,
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  selectOptionActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  selectOptionText: {
    fontSize: 13,
    color: '#374151',
  },
  selectOptionTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  cameraContainer: {
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  captureButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    alignItems: 'center',
  },
  captureButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  signaturePreview: {
    width: '100%',
    height: 120,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: 'contain',
  },
});
