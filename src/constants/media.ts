import { Platform } from 'react-native';

/**
 * Prepara um FormData para upload de arquivos compatível com Web e Mobile.
 */
export async function prepareFormData(uri: string, fieldName: string = 'media') {
  const formData = new FormData();
  
  if (Platform.OS === 'web') {
    // No Web, precisamos converter a URI (blob:...) em um Blob real
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = uri.split('/').pop() || 'upload.jpg';
    const file = new File([blob], filename, { type: blob.type });
    formData.append(fieldName, file);
  } else {
    // No Mobile (iOS/Android), enviamos o objeto de referência
    const filename = uri.split('/').pop() || `upload_${Date.now()}.jpg`;
    
    // Extrai a extensão corretamente
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    
    // Mapeamento simples de tipos MIME
    let type = 'image/jpeg';
    if (ext === 'png') type = 'image/png';
    if (ext === 'gif') type = 'image/gif';
    if (ext === 'webp') type = 'image/webp';
    if (ext === 'mp4') type = 'video/mp4';
    
    formData.append(fieldName, {
      uri: uri,
      name: filename,
      type,
    } as any);
  }
  
  return formData;
}
