import { webSocketService } from './webSocketService';
import { useGalleryStore, GalleryCategory } from '../stores/galleryStore';
import {
  GalleryListRequestPayload,
  GalleryListResponsePayload,
} from '../types/protocol';

class GalleryService {
  public fetchGallery(category: GalleryCategory = 'all', limit = 100, offset = 0) {
    const store = useGalleryStore.getState();
    store.setLoading(true);
    store.setError(null);
    store.setCategory(category);

    const payload: GalleryListRequestPayload = {
      category,
      limit,
      offset,
    };
    webSocketService.sendMessage('GALLERY_LIST_REQUEST', payload);
  }

  public handleGalleryListResponse(payload: GalleryListResponsePayload) {
    useGalleryStore.getState().setItems(payload.items || []);
  }
}

export const galleryService = new GalleryService();
